import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaybackController } from '../playback/PlaybackControllerContext'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'
import { throttle } from '../utils'

const PLAY_VERIFY_MS = 3000

type Observer = ReturnType<typeof useRiyilsObserver>

export type PlaybackState = {
    isMuted: boolean
    isSpeedUp: boolean
    isPlaying: boolean
    hasError: boolean
    hasStarted: boolean
    enableAutoAdvance: boolean
    retryCount: number
}

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
    const stallTimeoutRef = useRef<number | null>(null)
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

        if (!video) {
            return
        }

        const id = getActiveId()
        if (!video || !id || hasError) return
        if (id !== activeIdRef.current) return

        const now = Date.now()
        if (now - lastSeekTsRef.current < 300) {
            return
        }

        const token = ++playTokenRef.current

        if (!isPlaying && !isSpeedUp) {
            playbackController.reset('viewer', id)
            video.pause()
            observer.pause(id, 'user')
            return
        }

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

    useEffect(() => {
        playTokenRef.current++
    }, [currentIndex])

    useEffect(() => {
        activeTokenRef.current++
        setHasStarted(false)
    }, [currentIndex])

    useEffect(() => {
        activeIdRef.current = getActiveId()
    }, [currentIndex, getActiveId])

    useEffect(() => {
        void applyPlayback()
    }, [applyPlayback])

    useEffect(() => {
        const v = getVideoEl(currentIndex)
        if (!v) return

        const id = getActiveId()
        const token = activeTokenRef.current

        const markLoading = () => {
            if (id) observer.waiting(id)

            waitingTimeoutRef.current ??= globalThis.window.setTimeout(() => {
                if (mountedRef.current && token === activeTokenRef.current) {
                    setHasStarted(false)
                }
                waitingTimeoutRef.current = null
            }, 80);

            stallTimeoutRef.current ??= globalThis.window.setTimeout(() => {
                if (mountedRef.current && token === activeTokenRef.current) {
                    onRetry()
                }
                stallTimeoutRef.current = null
            }, 5000);
        }

        const markStarted = () => {
            if (id) observer.playing(id)
            if (mountedRef.current && token === activeTokenRef.current) {
                setHasStarted(true)
            }
            if (stallTimeoutRef.current) {
                clearTimeout(stallTimeoutRef.current)
                stallTimeoutRef.current = null
            }
        }

        const onCanPlay = () => {
            if (mountedRef.current && token === activeTokenRef.current) {
                void applyPlayback()
            }
        }

        v.addEventListener('loadeddata', markStarted)
        v.addEventListener('playing', markStarted)
        v.addEventListener('waiting', markLoading)
        v.addEventListener('stalled', markLoading)
        v.addEventListener('canplay', onCanPlay)

        return () => {
            v.removeEventListener('loadeddata', markStarted)
            v.removeEventListener('playing', markStarted)
            v.removeEventListener('waiting', markLoading)
            v.removeEventListener('stalled', markLoading)
            v.removeEventListener('canplay', onCanPlay)
            if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current)
                waitingTimeoutRef.current = null
            }
            if (stallTimeoutRef.current) {
                clearTimeout(stallTimeoutRef.current)
                stallTimeoutRef.current = null
            }
        }
    }, [currentIndex, getVideoEl, getActiveId, observer, onRetry, applyPlayback])

    useEffect(() => {
        const id = getActiveId()
        const v = getVideoEl(currentIndex)
        if (!id || !v || !isPlaying || hasError) return

        const interval = setInterval(() => {
            if (v.paused) return
            observer.heartbeat(id, v.currentTime, v.duration)
        }, 5000)

        return () => clearInterval(interval)
    }, [currentIndex, getActiveId, getVideoEl, isPlaying, hasError, observer])

    const togglePlay = useMemo(() => throttle(() => {
        if (hasError) return
        const id = getActiveId()
        setIsPlaying((p) => {
            if (id) observer[p ? 'pause' : 'play'](id, 'user')
            return !p
        })
    }, 200), [getActiveId, hasError, observer])

    const toggleMute = useMemo(() => throttle(() => {
        const id = getActiveId()
        const next = !playbackController.isMuted()
        playbackController.setMuted(next)
        setIsMuted(next)
        if (id) observer.mute(id, next, 'user')
    }, 200), [getActiveId, observer, playbackController])

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

        if (retryCount === 0) {
            onRetry()
            return
        }

        const id = getActiveId()
        if (!id) return
        setHasError(true)
        setIsPlaying(false)
        observer.error(id, 'decode')
        requestAnimationFrame(() => {
            playbackController.reset('viewer', id)
        })
    }, [getActiveId, observer, playbackController, onRetry, retryCount])

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
