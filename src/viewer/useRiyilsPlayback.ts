import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaybackController } from '../playback/PlaybackControllerContext'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'

const PLAY_VERIFY_MS = 260
const READY_TIMEOUT_MS = 1200

function waitForReady(video: HTMLVideoElement): Promise<boolean> {
    if (!video.src) return Promise.resolve(false)
    if (video.readyState >= 3) return Promise.resolve(true)

    return new Promise((resolve) => {
        let done = false

        const cleanup = () => {
            video.removeEventListener('canplay', onReady)
            video.removeEventListener('loadeddata', onReady)
            video.removeEventListener('error', onError)
        }

        const finish = (ok: boolean) => {
            if (done) return
            done = true
            cleanup()
            resolve(ok)
        }

        const onReady = () => finish(video.readyState >= 3)
        const onError = () => finish(false)

        video.addEventListener('canplay', onReady, { once: true })
        video.addEventListener('loadeddata', onReady, { once: true })
        video.addEventListener('error', onError, { once: true })

        setTimeout(() => finish(video.readyState >= 3), READY_TIMEOUT_MS)
    })
}

type Observer = ReturnType<typeof useRiyilsObserver>

export function useRiyilsPlayback(
    getVideoEl: (index: number) => HTMLVideoElement | null,
    getActiveId: () => string | undefined,
    currentIndex: number,
    enableAutoAdvance: boolean,
    observer: Observer
) {
    const playbackController = usePlaybackController()

    const [isSpeedUp, setIsSpeedUp] = useState(false)
    const [isPlaying, setIsPlaying] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [isMuted, setIsMuted] = useState(() => playbackController.isMuted())

    const playTokenRef = useRef(0)
    const retryingRef = useRef(false)
    const activeTokenRef = useRef(0)
    const waitingTimeoutRef = useRef<number | null>(null)
    const activeIdRef = useRef<string | undefined>()
    const mountedRef = useRef(true)
    const lastSeekTsRef = useRef(0)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    useEffect(() => {
        setIsMuted(playbackController.isMuted())
    }, [currentIndex, playbackController])

    const applyPlayback = useCallback(async () => {
        const video = getVideoEl(currentIndex)
        const id = getActiveId()
        if (!video || !id || hasError) return
        if (id !== activeIdRef.current) return

        const now = Date.now()
        if (now - lastSeekTsRef.current < 300) {
            return
        }

        if (video.readyState < 2) {
            if (now - lastSeekTsRef.current > 800) {
                setHasStarted(false)
                video.load()
            }
            return
        }

        if (video.readyState < 3) {
            return
        }

        const token = ++playTokenRef.current

        if (!isPlaying && !isSpeedUp) {
            playbackController.reset('viewer', id)
            video.pause()
            observer.pause(id, 'user')
            return
        }

        const ready = await waitForReady(video)
        if (!mountedRef.current || !ready || playTokenRef.current !== token) return

        const result = await playbackController.play({
            scope: 'viewer',
            id,
            video,
            options: {
                muted: playbackController.isMuted(),
                playbackRate: isSpeedUp ? 2 : 1,
                allowAutoMute: true,
                verifyMs: PLAY_VERIFY_MS,
            },
        })

        if (!mountedRef.current || playTokenRef.current !== token) return

        if (result === 'playing') {
            observer.play(id, 'auto')
            return
        }

        if (result === 'blocked') {
            observer.mute(id, true, 'autoplay')
        }
    }, [
        currentIndex,
        getActiveId,
        getVideoEl,
        hasError,
        isPlaying,
        isSpeedUp,
        playbackController,
        observer,
    ])

    useEffect(() => {
        playTokenRef.current++
    }, [currentIndex])

    useEffect(() => {
        void applyPlayback()
    }, [applyPlayback])

    useEffect(() => {
        activeTokenRef.current++
        setHasStarted(false)
    }, [currentIndex])

    useEffect(() => {
        activeIdRef.current = getActiveId()
    }, [currentIndex, getActiveId])

    useEffect(() => {
        const v = getVideoEl(currentIndex)
        if (!v) return

        const token = activeTokenRef.current

        const markLoading = () => {
            if (waitingTimeoutRef.current != null) return
            waitingTimeoutRef.current = globalThis.window.setTimeout(() => {
                if (mountedRef.current && token === activeTokenRef.current) {
                    setHasStarted(false)
                }
                waitingTimeoutRef.current = null
            }, 80)
        }

        const markStarted = () => {
            if (mountedRef.current && token === activeTokenRef.current) {
                setHasStarted(true)
            }
        }

        v.addEventListener('loadeddata', markStarted)
        v.addEventListener('playing', markStarted)
        v.addEventListener('waiting', markLoading)
        v.addEventListener('stalled', markLoading)

        return () => {
            v.removeEventListener('loadeddata', markStarted)
            v.removeEventListener('playing', markStarted)
            v.removeEventListener('waiting', markLoading)
            v.removeEventListener('stalled', markLoading)
            if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current)
                waitingTimeoutRef.current = null
            }
        }
    }, [currentIndex, getVideoEl])

    const togglePlay = useCallback(() => {
        if (hasError) return
        const id = getActiveId()
        setIsPlaying((p) => {
            if (id) observer[p ? 'pause' : 'play'](id, 'user')
            return !p
        })
    }, [getActiveId, hasError, observer])

    const toggleMute = useCallback(() => {
        const id = getActiveId()
        const next = !playbackController.isMuted()
        playbackController.setMuted(next)
        setIsMuted(next)
        if (id) observer.mute(id, next, 'user')
        void applyPlayback()
    }, [applyPlayback, getActiveId, observer, playbackController])

    const seek = useCallback(
        (deltaSeconds: number, method: 'gesture' | 'keyboard') => {
            const v = getVideoEl(currentIndex)
            const id = getActiveId()
            if (!v || hasError || !id) return

            lastSeekTsRef.current = Date.now()

            const max = v.duration > 0 ? v.duration : Number.MAX_SAFE_INTEGER
            v.currentTime = Math.min(Math.max(v.currentTime + deltaSeconds, 0), max)

            observer.seek(id, deltaSeconds, method)
        },
        [currentIndex, getActiveId, getVideoEl, hasError, observer]
    )

    const onEnded = useCallback(() => {
        const id = getActiveId()
        const v = getVideoEl(currentIndex)

        if (!id || !v) return

        if (v.duration > 0 && v.currentTime < v.duration - 0.2) {
            return
        }

        observer.ended(id, enableAutoAdvance)

        if (!enableAutoAdvance) return
        if (v.readyState < 3) return

        v.currentTime = 0
        void applyPlayback()
    }, [applyPlayback, currentIndex, enableAutoAdvance, getActiveId, getVideoEl, observer])

    const onError = useCallback(() => {
        if (!mountedRef.current) return
        const id = getActiveId()
        if (!id) return
        setHasError(true)
        setIsPlaying(false)
        observer.error(id, 'decode')
        requestAnimationFrame(() => {
            playbackController.reset('viewer', id)
        })
    }, [getActiveId, observer, playbackController])

    const onRetry = useCallback(() => {
        if (retryingRef.current || !mountedRef.current) return
        retryingRef.current = true

        const id = getActiveId()
        if (!id) {
            retryingRef.current = false
            return
        }

        setHasError(false)
        setIsPlaying(true)
        setRetryCount((c) => c + 1)
        observer.retry(id)

        requestAnimationFrame(() => {
            const v = getVideoEl(currentIndex)
            if (!v) {
                retryingRef.current = false
                return
            }

            v.pause()
            v.currentTime = 0
            v.load()

            retryingRef.current = false
            void applyPlayback()
        })
    }, [applyPlayback, currentIndex, getActiveId, getVideoEl, observer])

    const playbackState = useMemo(
        () => ({
            isMuted,
            isSpeedUp,
            isPlaying,
            hasError,
            hasStarted,
            enableAutoAdvance,
            retryCount,
        }),
        [isMuted, isSpeedUp, isPlaying, hasError, hasStarted, enableAutoAdvance, retryCount]
    )

    const playbackHandlers = useMemo(
        () => ({
            togglePlay,
            toggleMute,
            setSpeedUp: (v: boolean) => {
                setIsSpeedUp(v)
                if (!v) {
                    const video = getVideoEl(currentIndex)
                    if (video && !video.paused) {
                        setIsPlaying(true)
                    }
                }
            },
            seek,
            onEnded,
            onError,
            onRetry,
        }),
        [onEnded, onError, onRetry, seek, toggleMute, togglePlay]
    )

    return {
        playbackState,
        playbackHandlers,
    }
}
