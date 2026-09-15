const SERVER_B_URL =
  import.meta.env.VITE_SERVER_B_URL ?? 'http://localhost:3001'

// Mirrors server-b/src/types/command.ts — keep in sync if that enum changes.
export const COMMANDS = [
  'START_VIDEO',
  'STOP_VIDEO',
  'GET_STATUS',
  'LOGOUT',
] as const

export type Command = (typeof COMMANDS)[number]

// Mirrors server-b/src/types/user.ts (UserPayload).
export type UserRole = 'viewer' | 'operator'
export type AuthUser = { login: string; role: UserRole }

async function signIn(login: string, password: string): Promise<void> {
  const res = await fetch(`${SERVER_B_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ login, password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? 'Login failed')
  }
}

async function signOut(): Promise<void> {
  await fetch(`${SERVER_B_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

async function checkAuth(): Promise<AuthUser | null> {
  const res = await fetch(`${SERVER_B_URL}/protected/`, {
    credentials: 'include',
  })
  if (!res.ok) return null
  const body = (await res.json()) as { user: AuthUser }
  return body.user
}

function openCommandSocket(): WebSocket {
  const wsUrl = `${SERVER_B_URL.replace(/^http/, 'ws')}/ws/`
  return new WebSocket(wsUrl)
}

export const apiClient = { signIn, signOut, checkAuth, openCommandSocket }
