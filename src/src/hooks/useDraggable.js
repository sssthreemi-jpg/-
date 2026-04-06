import { useRef, useCallback, useEffect } from 'react'

/**
 * 요소를 드래그로 이동할 수 있게 하는 훅 (ref 기반 — 리렌더 없음)
 * @param {Object} initialPos - { x, y } 초기 위치
 * @param {Object} opts - { handleSelector, minRight } 옵션
 */
export function useDraggable(initialPos, opts = {}) {
  const elRef = useRef(null)
  const pos = useRef(initialPos)
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const moved = useRef(false)

  const applyPos = useCallback(() => {
    if (elRef.current) {
      elRef.current.style.left = `${pos.current.x}px`
      elRef.current.style.top = `${pos.current.y}px`
    }
  }, [])

  const onPointerDown = useCallback((e) => {
    if (opts.handleSelector) {
      const handle = e.target.closest(opts.handleSelector)
      if (!handle) return
    }
    if (e.target.closest('button, input, select, textarea, a')) return

    dragging.current = true
    moved.current = false
    offset.current = {
      x: e.clientX - pos.current.x,
      y: e.clientY - pos.current.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [opts.handleSelector])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return
    moved.current = true
    const minRight = opts.minRight || 140
    pos.current = {
      x: Math.max(0, Math.min(window.innerWidth - minRight, e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - offset.current.y)),
    }
    applyPos()
  }, [applyPos, opts.minRight])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const wasDragged = useCallback(() => {
    const result = moved.current
    moved.current = false
    return result
  }, [])

  // 초기 위치 적용
  useEffect(() => {
    applyPos()
  }, [applyPos])

  const handlers = {
    ref: elRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    style: {
      left: initialPos.x,
      top: initialPos.y,
      touchAction: 'none',
    },
  }

  return { pos, handlers, wasDragged }
}
