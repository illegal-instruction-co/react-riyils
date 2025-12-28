import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Mousewheel, EffectCoverflow, Virtual } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import type { Video } from '../viewer/RiyilsViewer'
import {
    defaultReactRiyilsTranslations,
    type RiyilsCarouselProps,
} from './types'
import { CarouselSlideContainer } from './CarouselSlideContainer'
import { useCarouselPreload } from './useCarouselPreload'
import { useCarouselRegistry } from './useCarouselRegistry'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'
import { throttle } from '../utils'

import './video-swiper.css'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/virtual'



function shouldPreload(index: number, activeIndex: number): boolean {
    return Math.abs(index - activeIndex) < 4
}

function RiyilsCarouselInner({
    videos,
    currentIndex = 0,
    onVideoClick,
    onVideoChange,
    translations = {},
    enableAutoAdvance = true,
}: Readonly<RiyilsCarouselProps>) {

    const observer = useRiyilsObserver('carousel')

    const swiperRef = useRef<SwiperType | null>(null)
    const [activeIndex, setActiveIndex] = useState(currentIndex)

    const registry = useCarouselRegistry()
    const preloadAround = useCarouselPreload(videos)

    const t = useMemo(() => ({ ...defaultReactRiyilsTranslations, ...translations }), [translations])

    useEffect(() => {
        if (activeIndex !== currentIndex) {
            setActiveIndex(currentIndex)
            if (swiperRef.current && !swiperRef.current.destroyed) {
                swiperRef.current.slideTo(currentIndex, 0)
            }
        }
    }, [currentIndex, activeIndex])

    useEffect(() => {
        preloadAround(activeIndex)
    }, [activeIndex, preloadAround])

    const [showHint, setShowHint] = useState(true)

    const handleSlideChange = useMemo(() => throttle((swiper: SwiperType) => {
        const next = swiper.activeIndex
        if (next === activeIndex) return

        if (showHint) setShowHint(false)

        setActiveIndex(next)
        onVideoChange(next)

        const nextVideo = videos[next]
        if (nextVideo) registry.pauseAllExcept(nextVideo.id)
    }, 100), [onVideoChange, registry, videos, showHint, activeIndex])

    const handleSlideClick = useCallback(
        (index: number, isActive: boolean) => {
            if (showHint) setShowHint(false)
            if (isActive) {
                onVideoClick(index)
                return
            }
            swiperRef.current?.slideTo(index)
        },
        [onVideoClick, showHint]
    )

    const handleActiveVideoEnded = useCallback(() => {
        if (!enableAutoAdvance) return
        const s = swiperRef.current
        if (!s || s.destroyed) return
        s.slideNext()
    }, [enableAutoAdvance])

    return (
        <section className="react-riyils__container" aria-label={t.carouselAriaLabel}>
            {showHint && (
                <div className="react-riyils__swipe-hint visible">
                    <div className="react-riyils__swipe-hand">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                        </svg>
                    </div>
                </div>
            )}
            <Swiper
                modules={[Keyboard, Mousewheel, EffectCoverflow, Virtual]}
                observer
                observeParents
                watchSlidesProgress
                initialSlide={currentIndex}
                virtual={{ addSlidesBefore: 2, addSlidesAfter: 2, enabled: true, cache: false }}
                effect="coverflow"
                coverflowEffect={{
                    rotate: 0,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                }}
                onSwiper={(s) => {
                    swiperRef.current = s
                }}
                onSlideChange={handleSlideChange}
                slidesPerView="auto"
                centeredSlides
                grabCursor
                keyboard={{ enabled: true }}
                mousewheel={{ forceToAxis: true }}
                className="react-riyils"
            >
                {videos.map((video, index) => {
                    const isActive = index === activeIndex
                    const distance = Math.abs(index - activeIndex)
                    const isPreview = !isActive && distance <= 2
                    const shouldLoad = isActive || isPreview || shouldPreload(index, activeIndex)

                    return (
                        <SwiperSlide key={video.id} virtualIndex={index}>
                            <CarouselSlideContainer
                                video={video}
                                index={index}
                                isActive={isActive}
                                isPreview={isPreview}
                                shouldLoad={shouldLoad}
                                t={t}
                                registry={registry}
                                observer={observer}
                                onSlideClick={handleSlideClick}
                            />
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            <ActiveAutoAdvanceBridge
                enabled={enableAutoAdvance}
                registry={registry}
                videos={videos}
                activeIndex={activeIndex}
                onAdvance={handleActiveVideoEnded}
            />
        </section>
    )
}

export function RiyilsCarousel(props: Readonly<RiyilsCarouselProps>) {
    return (
        <RiyilsCarouselInner {...props} />
    )
}

function ActiveAutoAdvanceBridge({
    enabled,
    registry,
    videos,
    activeIndex,
    onAdvance,
}: Readonly<{
    enabled: boolean
    registry: ReturnType<typeof useCarouselRegistry>
    videos: Video[]
    activeIndex: number
    onAdvance: () => void
}>) {
    useEffect(() => {
        if (!enabled) return
        const v = videos[activeIndex]
        if (!v) return
        const el = registry.get(v.id)
        if (!el) return

        const handler = () => onAdvance()
        el.addEventListener('ended', handler)
        return () => el.removeEventListener('ended', handler)
    }, [enabled, registry, videos, activeIndex, onAdvance])

    return null
}
