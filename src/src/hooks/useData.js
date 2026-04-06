import { useState, useEffect } from 'react'

// ── 모듈 레벨 fetch 중복 제거 캐시 ──
// 동일 경로의 동시 요청을 하나로 합치고, 완료된 데이터를 캐싱
const _fetchCache = new Map()

function fetchJsonCached(path) {
  if (_fetchCache.has(path)) return _fetchCache.get(path)
  const promise = fetch(path)
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data) => {
      _fetchCache.set(path, Promise.resolve(data))
      return data
    })
    .catch((err) => {
      _fetchCache.delete(path)
      throw err
    })
  _fetchCache.set(path, promise)
  return promise
}

export function useData(jsonPath) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!jsonPath)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!jsonPath) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchJsonCached(jsonPath)
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [jsonPath])

  return { data, loading, error }
}

/**
 * 여러 JSON 파일을 Promise.all로 병렬 fetch (캐시 활용)
 * @param {string[]} paths - JSON 파일 경로 배열
 * @returns {{ data: any[], loading: boolean, error: Error|null }}
 */
export function useMultipleData(paths) {
  const [data, setData] = useState(() => paths.map(() => null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pathsKey = paths.join('|')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all(
      paths.map((p) => p ? fetchJsonCached(p) : Promise.resolve(null)),
    )
      .then((results) => {
        if (!cancelled) {
          setData(results)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [pathsKey])

  return { data, loading, error }
}
