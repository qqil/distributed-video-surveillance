import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { Command } from '#/lib/api-client'
import { apiClient, COMMANDS } from '#/lib/api-client'
import { useAuth } from '#/context/auth-context'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'reconnecting' | 'error'

type LogEntry = {
  id: string
  kind: 'sent' | 'received' | 'system' | 'error'
  text: string
  timestamp: number
}

const logEntryClasses: Record<LogEntry['kind'], string> = {
  sent: '',
  received: 'text-destructive',
  error: 'text-destructive',
  system: 'text-muted-foreground',
}

const statusLabels: Record<ConnectionStatus, string> = {
  connecting: 'Connecting...',
  open: 'Connected',
  closed: 'Disconnected',
  reconnecting: 'Reconnecting...',
  error: 'Connection error',
}

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 15000

export function CommandConsole() {
  const auth = useAuth()
  const navigate = useNavigate()
  const socketRef = useRef<WebSocket | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [log, setLog] = useState<LogEntry[]>([])
  const [selectedCommand, setSelectedCommand] = useState<Command>(COMMANDS[0])

  function appendLog(kind: LogEntry['kind'], text: string) {
    setLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind, text, timestamp: Date.now() },
    ])
  }

  useEffect(() => {
    // Local to this effect invocation (not a ref) so that React StrictMode's
    // dev-only mount/cleanup/remount cycle can't let a stale invocation's
    // close handler see the new invocation's state and open an extra socket.
    let stopped = false
    let reconnectAttempt = 0
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let socket: WebSocket | null = null

    function connect() {
      const attempt = reconnectAttempt
      socket = apiClient.openCommandSocket()
      socketRef.current = socket

      setStatus(attempt > 0 ? 'reconnecting' : 'connecting')
      appendLog('system', attempt > 0 ? 'Reconnecting...' : 'Connecting...')

      socket.onopen = () => {
        reconnectAttempt = 0
        setStatus('open')
        appendLog('system', 'Connected')
      }

      socket.onmessage = (event) => {
        const text = String(event.data)
        appendLog('received', text)

        if (text === 'LOGGED_OUT') {
          // The token cookie is httpOnly, so only a real HTTP response (not a
          // WS message) can clear it — finish the logout with a REST call.
          stopped = true
          apiClient
            .signOut()
            .catch(() => undefined)
            .finally(() => {
              auth.logout()
              navigate({ to: '/auth/login', replace: true })
            })
        }
      }

      socket.onclose = () => {
        setStatus('closed')
        appendLog('system', 'Disconnected')

        if (stopped) {
          return
        }

        reconnectAttempt += 1
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** (reconnectAttempt - 1),
          RECONNECT_MAX_DELAY_MS,
        )
        appendLog(
          'system',
          `Reconnecting in ${Math.round(delay / 1000)}s...`,
        )
        reconnectTimeout = setTimeout(connect, delay)
      }

      socket.onerror = () => {
        setStatus('error')
        appendLog('error', 'WebSocket error')
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      socket?.close()
    }
  }, [])

  useEffect(() => {
    const el = logRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [log])

  function handleSend() {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(selectedCommand)
    appendLog('sent', selectedCommand)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commands</CardTitle>
        <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          ref={logRef}
          className="h-64 overflow-y-auto rounded-md border p-2 font-mono text-sm"
        >
          {log.map((entry) => (
            <p key={entry.id} className={logEntryClasses[entry.kind]}>
              {entry.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedCommand}
            onValueChange={(value) => setSelectedCommand(value as Command)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMANDS.map((command) => (
                <SelectItem key={command} value={command}>
                  {command}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSend} disabled={status !== 'open'}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
