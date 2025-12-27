import { useCallback, useEffect, useRef } from 'react'
import { preloadVideoSource } from '../use-video-source'
import type { Video } from '../riyils-viewer'

export function useRiyilsPreload(
    videos: Video[],
    currentIndex: number,
    initialIndex: number
) {
    const preloadedRef = useRef<Set<string>>(new Set())

    const safePreload = useCallback(
        (video?: Video) => {
            if (!video) return
            if (preloadedRef.current.has(video.id)) return
            preloadedRef.current.add(video.id)
            preloadVideoSource('viewer', video.id, video.videoUrl)
        },
        []
    )

    const preloadAround = useCallback(
        (index: number) => {
            if (!videos || index < 0 || index >= videos.length) return

            const cur = videos[index]
            if (cur) safePreload(cur)

            const prev = videos[index - 1]
            if (prev) safePreload(prev)

            const next = videos[index + 1]
            if (next) safePreload(next)

            const prev2 = videos[index - 2]
            if (prev2) safePreload(prev2)

            const next2 = videos[index + 2]
            if (next2) safePreload(next2)
        },
        [videos, safePreload]
    )

    useEffect(() => {
        preloadAround(initialIndex)
    }, [initialIndex, preloadAround])

    useEffect(() => {
        preloadAround(currentIndex)
    }, [currentIndex, preloadAround])

    return {
        preloadAround,
    }
}
