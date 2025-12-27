import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Mousewheel, EffectCoverflow, Virtual } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import { useVideoSource } from './use-video-source'
import { useSharedVideo } from './use-shared-video'
import type { Video } from './riyils-viewer'

import { CarouselSlide } from './carousel/CarouselSlide'
import { useCarouselPlayback } from './carousel/useCarouselPlayback'
import { useCarouselPreload } from './carousel/useCarouselPreload'
import { useCarouselRegistry } from './carousel/useCarouselRegistry'
import { useRiyilsObserver } from './observe/useRiyilsObserver'

import './video-swiper.css'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/virtual'

export interface ReactRiyilsTranslations {
  ctaButton: string
  carouselAriaLabel: string
  slideActiveAriaLabel: string
  slideInactiveAriaLabel: string
}

export const defaultReactRiyilsTranslations: ReactRiyilsTranslations = {
  ctaButton: 'Watch Full Video',
  carouselAriaLabel: 'Video stories',
  slideActiveAriaLabel: 'Watch full video',
  slideInactiveAriaLabel: 'Go to slide',
}

export interface ReactRiyilsProps {
  readonly videos: Video[]
  readonly currentIndex?: number
  readonly onVideoClick: (index: number) => void
  readonly onVideoChange: (index: number) => void
  readonly translations?: Partial<ReactRiyilsTranslations>
  readonly enableAutoAdvance?: boolean
}

function shouldPreload(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) < 4
}

const CarouselSlideContainer = React.memo(function CarouselSlideContainer({
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
    registry.register(video.id)(videoRef.current)
  }, [registry, video.id, videoRef.current])

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
  }, [videoRef.current, playback.onError])

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

function ReactRiyilsInner({
  videos,
  currentIndex = 0,
  onVideoClick,
  onVideoChange,
  translations = {},
  enableAutoAdvance = true,
}: Readonly<ReactRiyilsProps>) {

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

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      const next = swiper.activeIndex
      if (next === activeIndex) return

      setActiveIndex(next)
      onVideoChange(next)

      const nextVideo = videos[next]
      if (nextVideo) registry.pauseAllExcept(nextVideo.id)
    },
    [activeIndex, onVideoChange, registry, videos]
  )

  const handleSlideClick = useCallback(
    (index: number, isActive: boolean) => {
      if (isActive) {
        onVideoClick(index)
        return
      }
      swiperRef.current?.slideTo(index)
    },
    [onVideoClick]
  )

  const handleActiveVideoEnded = useCallback(() => {
    if (!enableAutoAdvance) return
    const s = swiperRef.current
    if (!s || s.destroyed) return
    s.slideNext()
  }, [enableAutoAdvance])

  return (
    <section className="react-riyils__container" aria-label={t.carouselAriaLabel}>
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
          stretch: -15,
          depth: 100,
          modifier: 2.5,
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

export function ReactRiyils(props: Readonly<ReactRiyilsProps>) {
  return (
    <ReactRiyilsInner {...props} />
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

export {
  RiyilsViewer,
  defaultRiyilsTranslations,
  type Video,
  type RiyilsTranslations,
  type RiyilsViewerProps,
} from './riyils-viewer'

export { PlaybackControllerProvider } from './playback/PlaybackControllerContext';
