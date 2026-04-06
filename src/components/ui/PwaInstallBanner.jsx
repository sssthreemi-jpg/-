/**
 * PWA 설치 유도 배너
 * - Chrome/Edge: beforeinstallprompt 이벤트로 네이티브 설치 프롬프트
 * - iOS Safari: 수동 안내 (공유 → 홈 화면에 추가)
 * - 한 번 닫으면 7일간 미표시
 */
import { useState, useEffect } from 'react'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 7

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // 이미 설치된 PWA에서는 표시 안 함
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone) return

    // 닫기 후 7일 미경과 시 표시 안 함
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DAYS * 24 * 60 * 60 * 1000) return

    // iOS 감지
    const ua = navigator.userAgent
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIos(iosDevice)

    if (iosDevice) {
      setShowBanner(true)
      return
    }

    // Chrome/Edge: beforeinstallprompt 이벤트
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null)
        setShowBanner(false)
      })
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Profit Review 설치</p>
            {isIos ? (
              <p className="text-xs text-gray-500 mt-0.5">
                공유 버튼 → <strong>"홈 화면에 추가"</strong>를 눌러 앱처럼 사용하세요
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                홈 화면에 추가하면 앱처럼 바로 접속할 수 있습니다
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1" aria-label="닫기">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!isIos && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            설치하기
          </button>
        )}
      </div>
    </div>
  )
}
