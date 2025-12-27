import { useEffect, useRef } from 'react'
import { VideoElementPool } from './video-pool'

export function useSharedVideo(
    containerRef: React.RefObject<HTMLDivElement | null>,
    videoId: string,
    className: string,
    shouldLoad: boolean,
    posterUrl?: string
) {
    const videoElementRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container || !shouldLoad) return

        const video = VideoElementPool.move(videoId, container, className, posterUrl)
        videoElementRef.current = video

        return () => {
            if (container.contains(video)) {
                video.remove()
            }
        }
    }, [videoId, containerRef, className, shouldLoad, posterUrl])

    return videoElementRef
}
