import { useCallback, useMemo, useRef, useEffect } from 'react'
import type { RiyilsEvent, RiyilsEventInput, RiyilsScope } from './riyils-events'
import { useGlobalRiyilsObserver } from './RiyilsObserverContext'

export function useRiyilsObserver(
    scope: RiyilsScope,
    onEvent?: (e: RiyilsEvent) => void
) {
    const onEventRef = useRef(onEvent)
    const globalObserver = useGlobalRiyilsObserver()

    useEffect(() => {
        onEventRef.current = onEvent
    })

    const emit = useCallback(
        (event: RiyilsEventInput) => {
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            const metadata = {
                ts: Date.now(),
                connection: conn ? {
                    effectiveType: conn.effectiveType,
                    type: conn.type
                } : undefined
            }
            const fullEvent = { ...event, ...metadata, scope } as RiyilsEvent;
            onEventRef.current?.(fullEvent);
            globalObserver.onEvent?.(fullEvent);
        },
        [scope, globalObserver]
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

            heartbeat: (videoId: string, position: number, duration: number) =>
                emit({ type: 'heartbeat', videoId, position, duration }),

            waiting: (videoId: string) =>
                emit({ type: 'waiting', videoId }),

            playing: (videoId: string) =>
                emit({ type: 'playing', videoId }),
        }),
        [emit]
    )
}