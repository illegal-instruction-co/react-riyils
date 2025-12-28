import { useEffect, useRef, useState, useMemo, type RefObject } from 'react'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'

const PREVIEW_DURATION_MS = 2000
const RETRY_MS = 250

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
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

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

        let isCancelled = false

        const tryPlay = async () => {
            if (isCancelled || !mountedRef.current) return

            if (!video.src) {
                retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                return
            }

            if (!video.hasAttribute('playsinline')) video.setAttribute('playsinline', '')
            if (!video.hasAttribute('webkit-playsinline')) video.setAttribute('webkit-playsinline', '')
            if (!video.hasAttribute('muted')) video.setAttribute('muted', '')
            video.muted = true

            try {
                if (!video.paused) return

                await video.play()

                if (isCancelled || !mountedRef.current) {
                    video.pause()
                    return
                }

                if (!isActive && !isPreview) {
                    video.pause()
                    return
                }

                observer.play(videoId, isActive ? 'auto' : 'resume')

                if (isPreview && !isActive) {
                    timerRef.current = globalThis.window.setTimeout(() => {
                        if (!mountedRef.current || isCancelled) return

                        video.pause()
                        video.currentTime = 0
                        observer.pause(videoId, 'auto')

                        retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
                    }, PREVIEW_DURATION_MS)
                }

            } catch {
                if (isCancelled || !mountedRef.current) return



                retryRef.current = globalThis.window.setTimeout(tryPlay, RETRY_MS)
            }
        }

        if (isActive || isPreview) {
            void tryPlay()
        } else {
            video.pause()
            video.currentTime = 0
            observer.pause(videoId, 'auto')
        }

        return () => {
            isCancelled = true
            clearTimers()
            if (video && !video.paused) {
                video.pause()
            }
        }
    }, [videoRef, videoId, isActive, isPreview, shouldLoad, hasError, observer])

    useEffect(() => {
        if (!hasError && shouldLoad && isActive) {
            const v = videoRef.current
            if (!v) return
            v.play().catch(() => { })
        }
    }, [hasError, shouldLoad, isActive, videoRef])

    return useMemo(() => ({
        hasError,
        onError: () => {
            if (!mountedRef.current) return
            setHasError(true)
            observer.error(videoId, 'decode')
        },
        retry: () => {
            if (!mountedRef.current) return
            setHasError(false)
            observer.retry(videoId)

            const video = videoRef.current
            if (!video) return

            video.load()
        },
    }), [hasError, videoId, observer, videoRef])
}