import { useEffect, useState } from 'react'

const SERVER_A_URL =
  import.meta.env.VITE_SERVER_A_URL ?? 'http://localhost:3000'

type ConnectionState = 'connecting' | 'live' | 'stopped' | 'error' | 'closed'

interface UseWebRTCStreamResult {
  stream: MediaStream | null
  state: ConnectionState
  error: string | null
}

type ServerMessage =
  | { type: 'answer'; sdp: string }
  | { type: 'error'; message: string }
  | { type: 'stopped' }
  | { type: 'started' }

function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()

  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
  })
}

export function useWebRTCStream(): UseWebRTCStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let failed = false
    let pc: RTCPeerConnection | null = null
    const ws = new WebSocket(`${SERVER_A_URL.replace(/^http/, 'ws')}/stream`)

    const fail = (message: string) => {
      if (cancelled) return
      failed = true
      setState('error')
      setError(message)
    }

    const attachPeerConnectionHandlers = (connection: RTCPeerConnection) => {
      connection.addTransceiver('video', { direction: 'recvonly' })

      connection.ontrack = (event) => {
        if (cancelled) return
        setStream(event.streams[0] ?? new MediaStream([event.track]))
      }

      connection.onconnectionstatechange = () => {
        if (cancelled) return
        if (connection.connectionState === 'connected') setState('live')
        if (connection.connectionState === 'failed')
          fail('Peer connection failed')
      }
    }

    // (Re)creates the peer connection and sends a fresh offer over the
    // existing signaling socket. Used for the initial connection and again
    // whenever the server pushes a 'started' message after a prior stop.
    const negotiate = async () => {
      pc?.close()
      const connection = new RTCPeerConnection()
      pc = connection
      attachPeerConnectionHandlers(connection)

      try {
        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        await waitForIceGatheringComplete(connection)
        if (cancelled) return
        ws.send(
          JSON.stringify({
            type: 'offer',
            sdp: connection.localDescription?.sdp,
          }),
        )
      } catch (err) {
        fail(err instanceof Error ? err.message : 'Failed to create offer')
      }
    }

    ws.onopen = () => {
      void negotiate()
    }

    ws.onmessage = (event) => {
      void (async () => {
        const message = JSON.parse(String(event.data)) as ServerMessage

        if (message.type === 'answer') {
          if (!pc) return
          try {
            await pc.setRemoteDescription({
              type: 'answer',
              sdp: message.sdp,
            })
          } catch {
            fail('Failed to apply remote description')
          }
          return
        }

        if (message.type === 'stopped') {
          if (cancelled) return
          pc?.close()
          pc = null
          setStream(null)
          setState('stopped')
          return
        }

        if (message.type === 'started') {
          if (cancelled) return
          setState('connecting')
          void negotiate()
          return
        }

        fail(message.message)
      })()
    }

    ws.onerror = () => {
      fail('Signaling connection failed')
    }

    ws.onclose = () => {
      if (!cancelled && !failed) setState('closed')
    }

    return () => {
      cancelled = true
      ws.close()
      pc?.close()
    }
  }, [])

  return { stream, state, error }
}
