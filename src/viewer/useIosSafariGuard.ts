import { useEffect, useRef, useCallback } from 'react'

import { isIosSafari } from '../utils'

interface IosSafariGuardOptions {
    getActiveId: () => string | undefined
    onReset: () => void
    onRetry: () => void
}

export function useIosSafariGuard({
    getActiveId,
    onReset,
    onRetry,
}: IosSafariGuardOptions) {
    const lastRetryTs = useRef(0)
    const rafRef = useRef<number | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    const safeRetry = useCallback(() => {
        const now = Date.now()
        if (now - lastRetryTs.current < 300) return
        lastRetryTs.current = now

        if (mountedRef.current) {
            onRetry()
        }
    }, [onRetry])

    useEffect(() => {
        if (!isIosSafari()) return

        const handleReset = () => {
            if (!mountedRef.current) return
            if (getActiveId()) onReset()
        }

        const handleRetry = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)

            rafRef.current = requestAnimationFrame(() => {
                if (!mountedRef.current) return
                if (getActiveId()) safeRetry()
            })
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleReset()
            } else {
                handleRetry()
            }
        }

        const onPageHide = () => handleReset()
        const onPageShow = () => handleRetry()

        const onOrientationChange = () => {
            handleReset()
            setTimeout(handleRetry, 200)
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        globalThis.window.addEventListener('pagehide', onPageHide)
        globalThis.window.addEventListener('pageshow', onPageShow)
        globalThis.window.addEventListener('orientationchange', onOrientationChange)

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            globalThis.window.removeEventListener('pagehide', onPageHide)
            globalThis.window.removeEventListener('pageshow', onPageShow)
            globalThis.window.removeEventListener('orientationchange', onOrientationChange)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [getActiveId, onReset, safeRetry])
}