import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LoginForm } from '#/components/login-form'
import { useAuth } from '#/context/auth-context'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      navigate({ to: '/stream', replace: true })
    }
  }, [status, navigate])

  if (status === 'authenticated') {
    return null
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <LoginForm />
    </div>
  )
}
