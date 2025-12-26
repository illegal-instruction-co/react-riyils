import { useEffect, useRef, useCallback } from 'react'

interface IosSafariGuardOptions {
    getActiveId: () => string | undefined
    onReset: () => void
    onRetry: () => void
}

function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
    return isIOS && isSafari
}

export function useIosSafariGuard({
    getActiveId,
    onReset,
    onRetry,
}: IosSafariGuardOptions) {
    const lastRetryTs = useRef(0)

    const safeRetry = useCallback(() => {
        const now = Date.now()
        if (now - lastRetryTs.current < 300) return
        lastRetryTs.current = now
        onRetry()
    }, [onRetry])

    useEffect(() => {
        if (!isIosSafari()) return

        const handleReset = () => {
            if (getActiveId()) onReset()
        }

        const handleRetry = () => {
            requestAnimationFrame(() => {
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

        const onPageHide = () => {
            handleReset()
        }

        const onOrientationChange = () => {
            handleReset()
            setTimeout(handleRetry, 200)
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        globalThis.window.addEventListener('pagehide', onPageHide)
        globalThis.window.addEventListener('pageshow', handleRetry)
        globalThis.window.addEventListener('orientationchange', onOrientationChange)

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            globalThis.window.removeEventListener('pagehide', onPageHide)
            globalThis.window.removeEventListener('pageshow', handleRetry)
            globalThis.window.removeEventListener('orientationchange', onOrientationChange)
        }
    }, [getActiveId, onReset, safeRetry])
}