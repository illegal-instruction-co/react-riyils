import { useCallback, useRef } from 'react'

const DOUBLE_TAP_DELAY_MS = 200
const LONG_PRESS_DELAY_MS = 500
const SEEK_SECONDS = 10

export type GestureZone = 'left' | 'center' | 'right'

export type GestureIntent =
    | { type: 'toggle-play' }
    | { type: 'seek'; delta: number; direction: 'forward' | 'rewind' }
    | { type: 'speed-start' }
    | { type: 'speed-stop' }

export function useRiyilsGestures(
    onIntent: (intent: GestureIntent) => void,
    disabled: boolean
) {
    const lastTapTime = useRef(0)
    const longPressTimer = useRef<number | null>(null)
    const doubleTapTimer = useRef<number | null>(null)
    const longPressTriggered = useRef(false)

    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
        if (ref.current !== null) {
            globalThis.window.clearTimeout(ref.current)
            ref.current = null
        }
    }

    const onStartSpeed = useCallback(() => {
        if (disabled) return
        longPressTriggered.current = false
        clearTimer(longPressTimer)
        longPressTimer.current = globalThis.window.setTimeout(() => {
            longPressTriggered.current = true
            onIntent({ type: 'speed-start' })
            longPressTimer.current = null
        }, LONG_PRESS_DELAY_MS)
    }, [disabled, onIntent])

    const onStopSpeed = useCallback(() => {
        clearTimer(longPressTimer)
        onIntent({ type: 'speed-stop' })
    }, [onIntent])

    const onZoneClick = useCallback(
        (zone: GestureZone, e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (disabled) return

            if (longPressTriggered.current) {
                longPressTriggered.current = false
                return
            }

            const now = Date.now()
            const diff = now - lastTapTime.current
            const isDoubleTap = diff > 0 && diff < DOUBLE_TAP_DELAY_MS
            lastTapTime.current = now

            if (isDoubleTap) {
                clearTimer(doubleTapTimer)

                if (zone === 'right') {
                    onIntent({
                        type: 'seek',
                        delta: SEEK_SECONDS,
                        direction: 'forward',
                    })
                } else if (zone === 'left') {
                    onIntent({
                        type: 'seek',
                        delta: -SEEK_SECONDS,
                        direction: 'rewind',
                    })
                } else {
                    onIntent({ type: 'toggle-play' })
                }

                lastTapTime.current = 0
                return
            }

            clearTimer(doubleTapTimer)
            doubleTapTimer.current = globalThis.window.setTimeout(() => {
                onIntent({ type: 'toggle-play' })
                lastTapTime.current = 0
                doubleTapTimer.current = null
            }, DOUBLE_TAP_DELAY_MS)
        },
        [disabled, onIntent]
    )

    return {
        onZoneClick,
        onStartSpeed,
        onStopSpeed,
    }
}