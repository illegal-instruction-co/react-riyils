import { useCallback, useEffect } from 'react'
import { preloadVideoSource } from '../use-video-source'
import type { Video } from '../riyils-viewer'

export function useRiyilsPreload(
    videos: Video[],
    currentIndex: number,
    initialIndex: number
) {
    const preloadAround = useCallback(
        (index: number) => {
            if (!videos || index < 0 || index >= videos.length) return

            const cur = videos[index]
            if (cur) preloadVideoSource('viewer', cur.id, cur.videoUrl)

            const prev = videos[index - 1]
            if (prev) preloadVideoSource('viewer', prev.id, prev.videoUrl)

            const next = videos[index + 1]
            if (next) preloadVideoSource('viewer', next.id, next.videoUrl)
        },
        [videos]
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