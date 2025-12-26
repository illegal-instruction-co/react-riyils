import { useEffect, useRef, useState, type RefObject } from 'react'

const PREVIEW_DURATION_MS = 2000
const RETRY_MS = 120

export function useCarouselPlayback(
    videoRef: RefObject<HTMLVideoElement | null>,
    isActive: boolean,
    isPreview: boolean,
    shouldLoad: boolean
) {
    const [hasError, setHasError] = useState(false)
    const timerRef = useRef<number | null>(null)
    const retryRef = useRef<number | null>(null)

    const clearTimers = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (retryRef.current) {
            clearTimeout(retryRef.current)
            retryRef.current = null
        }
    }

    useEffect(() => {
        const video = videoRef.current
        clearTimers()

        if (!video || !shouldLoad || hasError) return

        video.muted = true
        video.playbackRate = 1

        const tryPlay = async () => {
            try {
                await video.play()
            } catch {
                retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                return
            }

            if (isPreview && !isActive) {
                timerRef.current = globalThis.window.setTimeout(() => {
                    video.pause()
                    video.currentTime = 0
                    retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                }, PREVIEW_DURATION_MS)
            }
        }

        if (isActive || isPreview) {
            tryPlay()
        } else {
            video.pause()
            video.currentTime = 0
        }

        return clearTimers
    }, [videoRef, isActive, isPreview, shouldLoad, hasError])

    return {
        hasError,
        onError: () => setHasError(true),
        retry: () => {
            setHasError(false)
            videoRef.current?.load()
        },
    }
}
