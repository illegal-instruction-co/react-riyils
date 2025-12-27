import { useEffect, useRef } from 'react'
import { VideoElementPool } from './video-pool'

export function useSharedVideo(
    containerRef: React.RefObject<HTMLDivElement | null>,
    videoId: string,
    className: string,
    shouldLoad: boolean
) {
    const videoElementRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container || !shouldLoad) return

        const video = VideoElementPool.move(videoId, container, className)
        videoElementRef.current = video

    }, [videoId, containerRef, className, shouldLoad])

    return videoElementRef
}
