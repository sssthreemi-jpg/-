/**
 * Auth stub — Supabase 인증 제거, mock user 반환
 */
import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  return ctx
}

export function AuthProvider({ children }) {
  const value = {
    user: { id: 'local', email: 'user@daewoong.co.kr' },
    session: null,
    profile: { display_name: '사용자', role: 'admin' },
    loading: false,
    signOut: () => {},
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
