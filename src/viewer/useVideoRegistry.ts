import { useCallback, useRef, useEffect } from 'react'

export function useVideoRegistry() {
    const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())

    useEffect(() => {
        return () => {
            videoRefs.current.clear()
        }
    }, [])

    const register = useCallback(
        (index: number) => (el: HTMLVideoElement | null) => {
            if (!el) {
                videoRefs.current.delete(index)
                return
            }
            videoRefs.current.set(index, el)
        },
        []
    )

    const get = useCallback((index: number): HTMLVideoElement | null => {
        return videoRefs.current.get(index) ?? null
    }, [])

    const stopAllExcept = useCallback((active: number) => {
        for (const [idx, video] of videoRefs.current) {
            if (idx !== active) {
                video.pause()
            }
        }
    }, [])

    return {
        register,
        get,
        stopAllExcept,
    }
}