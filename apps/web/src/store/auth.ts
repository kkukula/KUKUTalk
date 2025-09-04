import { create } from 'zustand'

type User = { id: string; username: string; displayName: string; role: 'CHILD'|'PARENT'|'TEACHER'|'ADMIN' }

type State = {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  setAuth: (auth: Partial<State>) => void
  logout: () => void
}

export const useAuth = create<State>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: (auth) => set(auth),
  logout: () => set({ accessToken: null, refreshToken: null, user: null }),
}))
