import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaybackController } from '../playback/PlaybackControllerContext'
import { resetVideoSource } from '../use-video-source'

const PLAY_VERIFY_MS = 260

export function useRiyilsPlayback(
    getVideoEl: (index: number) => HTMLVideoElement | null,
    getActiveId: () => string | undefined,
    currentIndex: number,
    enableAutoAdvance: boolean
) {
    const playbackController = usePlaybackController()

    const [isMuted, setIsMuted] = useState(true)
    const [isSpeedUp, setIsSpeedUp] = useState(false)
    const [isPlaying, setIsPlaying] = useState(true)
    const [hasError, setHasError] = useState(false)

    const playTokenRef = useRef(0)

    const applyPlayback = useCallback(async () => {
        const video = getVideoEl(currentIndex)
        const id = getActiveId()
        if (!video || !id || hasError) return

        const token = playTokenRef.current + 1
        playTokenRef.current = token

        if (!isPlaying) {
            playbackController.reset('viewer', id)
            video.pause()
            return
        }

        const result = await playbackController.play({
            scope: 'viewer',
            id,
            video,
            options: {
                muted: isMuted,
                playbackRate: isSpeedUp ? 2 : 1,
                allowAutoMute: true,
                verifyMs: PLAY_VERIFY_MS,
            },
        })

        if (playTokenRef.current !== token) return

        if (result === 'playing') {
            if (video.muted !== isMuted) setIsMuted(video.muted)
            if (!isPlaying) setIsPlaying(true)
            return
        }

        if (result === 'blocked') {
            setIsMuted(true)
        }

        setIsPlaying(false)
    }, [
        currentIndex,
        getActiveId,
        getVideoEl,
        hasError,
        isMuted,
        isPlaying,
        isSpeedUp,
        playbackController,
    ])

    useEffect(() => {
        void applyPlayback()
    }, [applyPlayback])

    const togglePlay = useCallback(() => {
        if (hasError) return
        setIsPlaying((p) => !p)
    }, [hasError])

    const toggleMute = useCallback(() => {
        setIsMuted((m) => !m)
    }, [])

    const seek = useCallback(
        (deltaSeconds: number) => {
            const v = getVideoEl(currentIndex)
            if (!v || hasError) return
            const next = Math.min(
                Math.max(v.currentTime + deltaSeconds, 0),
                v.duration || Number.MAX_SAFE_INTEGER
            )
            v.currentTime = next
        },
        [currentIndex, getVideoEl, hasError]
    )

    const onTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
        const v = e.currentTarget
        if (!v || v.duration <= 0) return
    }, [])

    const onEnded = useCallback(() => {
        if (!enableAutoAdvance) return
        const v = getVideoEl(currentIndex)
        if (!v) return
        v.currentTime = 0
        void applyPlayback()
    }, [applyPlayback, currentIndex, enableAutoAdvance, getVideoEl])

    const onError = useCallback(() => {
        setHasError(true)
        setIsPlaying(false)
        const id = getActiveId()
        if (id) playbackController.reset('viewer', id)
    }, [getActiveId, playbackController])

    const onRetry = useCallback(() => {
        const id = getActiveId()
        if (!id) return
        setHasError(false)
        setIsPlaying(true)
        playbackController.reset('viewer', id)
        resetVideoSource('viewer', id)
        const v = getVideoEl(currentIndex)
        if (v) {
            v.load()
            void applyPlayback()
        }
    }, [applyPlayback, currentIndex, getActiveId, getVideoEl, playbackController])

    const playbackState = useMemo(
        () => ({
            isMuted,
            isSpeedUp,
            isPlaying,
            hasError,
            enableAutoAdvance,
        }),
        [enableAutoAdvance, hasError, isMuted, isPlaying, isSpeedUp]
    )

    const playbackHandlers = useMemo(
        () => ({
            togglePlay,
            toggleMute,
            setSpeedUp: setIsSpeedUp,
            seek,
            onTimeUpdate,
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
