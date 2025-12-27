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
                emit({ type: 'play', videoId, reason, level: 'info' } as any),

            pause: (
                videoId: string,
                reason: 'user' | 'auto' | 'error' | 'visibility'
            ) =>
                emit({ type: 'pause', videoId, reason, level: 'info' } as any),

            mute: (
                videoId: string,
                muted: boolean,
                reason: 'user' | 'autoplay'
            ) =>
                emit({ type: 'mute', videoId, muted, reason, level: 'info' } as any),

            seek: (
                videoId: string,
                delta: number,
                method: 'gesture' | 'keyboard'
            ) =>
                emit({ type: 'seek', videoId, delta, method, level: 'info' } as any),

            ended: (videoId: string, autoAdvance: boolean) =>
                emit({ type: 'ended', videoId, autoAdvance, level: 'info' } as any),

            error: (
                videoId: string,
                error: 'network' | 'decode' | 'autoplay-blocked' | 'unknown'
            ) =>
                emit({ type: 'error', videoId, error, level: 'error' } as any),

            retry: (videoId: string) =>
                emit({ type: 'retry', videoId, level: 'warn' } as any),

            heartbeat: (videoId: string, position: number, duration: number) =>
                emit({ type: 'heartbeat', videoId, position, duration, level: 'debug' } as any),

            waiting: (videoId: string) =>
                emit({ type: 'waiting', videoId, level: 'debug' } as any),

            playing: (videoId: string) =>
                emit({ type: 'playing', videoId, level: 'debug' } as any),
        }),
        [emit]
    )
}