import { createContext, useContext, useSyncExternalStore, useCallback } from 'react'

const LG_QUERY = '(min-width: 1024px)'

function subscribe(callback) {
  const mql = window.matchMedia(LG_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(LG_QUERY).matches
}

function getServerSnapshot() {
  return true // SSR default: desktop
}

const BreakpointContext = createContext({ isMobile: false, isDesktop: true })

export function BreakpointProvider({ children }) {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return (
    <BreakpointContext.Provider value={{ isMobile: !isDesktop, isDesktop }}>
      {children}
    </BreakpointContext.Provider>
  )
}

export function useBreakpoint() {
  return useContext(BreakpointContext)
}
