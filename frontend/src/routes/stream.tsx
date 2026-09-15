import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { CommandConsole } from '#/components/command-console'
import { useAuth } from '#/context/auth-context'
import { useWebRTCStream } from '#/lib/webrtc-client'

export const Route = createFileRoute('/stream')({
  component: StreamPage,
})

const stateLabels = {
  connecting: 'Connecting to stream...',
  live: '',
  stopped: 'Stream stopped',
  error: 'Stream error - try reloading the page',
  closed: 'Stream closed',
}

function StreamPage() {
  const { user, status } = useAuth()
  const navigate = useNavigate()
  const { stream, state, error } = useWebRTCStream()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate({ to: '/auth/login', replace: true })
    }
  }, [status, navigate])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Checking session...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 lg:flex-row">
      <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-md border bg-muted lg:flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        {state !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            {state === 'error'
              ? (error ?? stateLabels.error)
              : stateLabels[state]}
          </div>
        )}
      </div>
      <div className="w-full lg:max-w-sm">
        <CommandConsole />
      </div>
    </div>
  )
}
