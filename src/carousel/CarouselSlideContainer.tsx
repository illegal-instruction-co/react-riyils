import React, { useRef, useEffect, useCallback } from 'react'
import { useSharedVideo } from '../use-shared-video'
import { useVideoSource } from '../use-video-source'
import { CarouselSlide } from './CarouselSlide'
import { useCarouselPlayback } from './useCarouselPlayback'
import { useCarouselRegistry } from './useCarouselRegistry'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'

import type { Video } from '../viewer/RiyilsViewer'
import type { ReactRiyilsTranslations } from './types'

export const CarouselSlideContainer = React.memo(function CarouselSlideContainer({
    video,
    index,
    isActive,
    isPreview,
    shouldLoad,
    t,
    registry,
    observer,
    onSlideClick,
}: Readonly<{
    video: Video
    index: number
    isActive: boolean
    isPreview: boolean
    shouldLoad: boolean
    t: ReactRiyilsTranslations
    registry: ReturnType<typeof useCarouselRegistry>
    observer: ReturnType<typeof useRiyilsObserver>
    onSlideClick: (index: number, isActive: boolean) => void
}>) {
    const containerRef = useRef<HTMLDivElement>(null)

    const videoRef = useSharedVideo(containerRef, video.id, 'react-riyils__video', shouldLoad)

    useEffect(() => {
        const el = videoRef.current
        registry.register(video.id)(el)
    }, [registry, video.id])

    useVideoSource(videoRef, 'carousel', video.id, video.videoUrl, shouldLoad)

    const playback = useCarouselPlayback(
        videoRef,
        video.id,
        isActive,
        isPreview,
        shouldLoad,
        observer
    )

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        const errorHandler = () => playback.onError()
        v.addEventListener('error', errorHandler)
        return () => v.removeEventListener('error', errorHandler)
    }, [playback])

    const handleClick = useCallback(() => onSlideClick(index, isActive), [index, isActive, onSlideClick])

    return (
        <CarouselSlide
            active={isActive}
            hasError={playback.hasError}
            t={t}
            videoId={video.id}
            observer={observer}
            onClick={handleClick}
            onRetry={playback.retry}
        >
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </CarouselSlide>
    )
})
