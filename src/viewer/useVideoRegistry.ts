import { useCallback, useRef } from 'react'

export function useVideoRegistry() {
    const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())

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
        videoRefs.current.forEach((video, idx) => {
            if (idx !== active) video.pause()
        })
    }, [])

    return {
        register,
        get,
        stopAllExcept,
    }
}
