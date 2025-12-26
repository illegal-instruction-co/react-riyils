import { useCallback } from 'react'
import { preloadVideoSource } from '../use-video-source'
import type { Video } from '../riyils-viewer'

export function useCarouselPreload(videos: Video[]) {
    return useCallback(
        (index: number) => {
            if (!videos || index < 0 || index >= videos.length) return

            const cur = videos[index]
            const prev = videos[index - 1]
            const next = videos[index + 1]

            if (cur) preloadVideoSource('carousel', cur.id, cur.videoUrl)
            if (prev) preloadVideoSource('carousel', prev.id, prev.videoUrl)
            if (next) preloadVideoSource('carousel', next.id, next.videoUrl)
        },
        [videos]
    )
}