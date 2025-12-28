import { useEffect } from 'react'
import { preloadVideoSource } from '../use-video-source'
import type { Video } from './RiyilsViewer'

export function useRiyilsPreload(
    videos: Video[],
    currentIndex: number,
    initialIndex: number
) {
    useEffect(() => {
        const indexes = [currentIndex, currentIndex + 1, currentIndex + 2]

        indexes.forEach(idx => {
            const v = videos[idx]
            if (v?.videoUrl) {
                preloadVideoSource('viewer', v.id, v.videoUrl)
            }
        })
    }, [currentIndex, videos])

    return {
        preloadAround: (_i: number) => { }
    }
}
