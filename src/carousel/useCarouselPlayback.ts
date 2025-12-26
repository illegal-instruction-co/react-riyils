import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'

const PREVIEW_DURATION_MS = 2000
const RETRY_MS = 120

type Observer = ReturnType<typeof useRiyilsObserver>

export function useCarouselPlayback(
    videoRef: RefObject<HTMLVideoElement | null>,
    videoId: string,
    isActive: boolean,
    isPreview: boolean,
    shouldLoad: boolean,
    observer: Observer
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
                observer.play(videoId, isActive ? 'auto' : 'resume')
            } catch {
                retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                return
            }

            if (isPreview && !isActive) {
                timerRef.current = globalThis.window.setTimeout(() => {
                    video.pause()
                    video.currentTime = 0
                    observer.pause(videoId, 'auto')
                    retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                }, PREVIEW_DURATION_MS)
            }
        }

        if (isActive || isPreview) {
            tryPlay()
        } else {
            video.pause()
            video.currentTime = 0
            observer.pause(videoId, 'auto')
        }

        return clearTimers
    }, [videoRef, videoId, isActive, isPreview, shouldLoad, hasError, observer])

    return {
        hasError,
        onError: () => {
            setHasError(true)
            observer.error(videoId, 'decode')
        },
        retry: () => {
            setHasError(false)
            videoRef.current?.load()
            observer.retry(videoId)
        },
    }
}
