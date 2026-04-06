/**
 * 인증 상태 전역 관리 — Supabase Auth 기반
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { display_name, role }
  const [loading, setLoading] = useState(true)

  // 프로필 로드
  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, role')
        .eq('id', userId)
        .single()
      if (!error && data) setProfile(data)
    } catch (err) {
      console.error('프로필 로드 실패:', err)
    }
  }

  // 세션 변화 감지
  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) loadProfile(s.user.id)
      setLoading(false)
    })

    // 실시간 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s)
        setUser(s?.user ?? null)

        if (event === 'SIGNED_IN' && s?.user) {
          loadProfile(s.user.id)
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
        if (event === 'TOKEN_REFRESHED') {
          // 세션 갱신 성공
        }
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  // ─── 인증 함수들 ───

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // 마지막 로그인 시각 업데이트
    if (data.user) {
      supabase.from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
        .then(() => {})
    }
    return data
  }

  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // allowed_emails 확인
  async function checkAllowedEmail(email) {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email, registered')
      .eq('email', email)
      .single()
    if (error || !data) return false
    return true
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    checkAllowedEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
