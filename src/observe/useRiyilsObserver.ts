import { useCallback, useMemo, useRef, useEffect } from 'react'
import type { RiyilsEvent, RiyilsEventInput, RiyilsScope } from './riyils-events'

export function useRiyilsObserver(
    scope: RiyilsScope,
    onEvent?: (e: RiyilsEvent) => void
) {
    const onEventRef = useRef(onEvent)

    useEffect(() => {
        onEventRef.current = onEvent
    })

    const emit = useCallback(
        (event: RiyilsEventInput) => {
            onEventRef.current?.({ ...event, scope })
        },
        [scope]
    )

    return useMemo(
        () => ({
            play: (videoId: string, reason: 'user' | 'auto' | 'resume') =>
                emit({ type: 'play', videoId, reason }),

            pause: (
                videoId: string,
                reason: 'user' | 'auto' | 'error' | 'visibility'
            ) =>
                emit({ type: 'pause', videoId, reason }),

            mute: (
                videoId: string,
                muted: boolean,
                reason: 'user' | 'autoplay'
            ) =>
                emit({ type: 'mute', videoId, muted, reason }),

            seek: (
                videoId: string,
                delta: number,
                method: 'gesture' | 'keyboard'
            ) =>
                emit({ type: 'seek', videoId, delta, method }),

            ended: (videoId: string, autoAdvance: boolean) =>
                emit({ type: 'ended', videoId, autoAdvance }),

            error: (
                videoId: string,
                error: 'network' | 'decode' | 'autoplay-blocked' | 'unknown'
            ) =>
                emit({ type: 'error', videoId, error }),

            retry: (videoId: string) =>
                emit({ type: 'retry', videoId }),
        }),
        [emit]
    )
}