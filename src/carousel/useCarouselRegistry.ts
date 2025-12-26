import { useCallback, useRef } from 'react'

export function useCarouselRegistry() {
    const refs = useRef<Map<string, HTMLVideoElement>>(new Map())

    const register = useCallback(
        (id: string) => (el: HTMLVideoElement | null) => {
            if (!el) {
                refs.current.delete(id)
                return
            }
            refs.current.set(id, el)
        },
        []
    )

    const get = useCallback((id: string): HTMLVideoElement | null => {
        return refs.current.get(id) ?? null
    }, [])

    const pauseAllExcept = useCallback((id: string) => {
        refs.current.forEach((video, key) => {
            if (key !== id) video.pause()
        })
    }, [])

    return {
        register,
        get,
        pauseAllExcept,
    }
}
