import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Mousewheel, EffectCoverflow, Virtual } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import { useVideoSource } from './use-video-source'
import type { Video } from './riyils-viewer'

import { CarouselSlide } from './carousel/CarouselSlide'
import { useCarouselPlayback } from './carousel/useCarouselPlayback'
import { useCarouselPreload } from './carousel/useCarouselPreload'
import { useCarouselRegistry } from './carousel/useCarouselRegistry'
import { PlaybackControllerProvider } from './playback/PlaybackControllerContext'

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
  readonly containerHeightMobile?: number
  readonly containerHeightDesktop?: number
  readonly enableAutoAdvance?: boolean
}

function shouldPreload(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) < 4
}

function CarouselSlideContainer({
  video,
  index,
  activeIndex,
  t,
  registry,
  onSlideClick,
}: Readonly<{
  video: Video
  index: number
  activeIndex: number
  t: ReactRiyilsTranslations
  registry: ReturnType<typeof useCarouselRegistry>
  onSlideClick: (index: number, isActive: boolean) => void
}>) {
  const isActive = index === activeIndex
  const distance = Math.abs(index - activeIndex)
  const isPreview = !isActive && distance <= 2
  const shouldLoad = isActive || isPreview || shouldPreload(index, activeIndex)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const register = useMemo(() => registry.register(video.id), [registry, video.id])

  const registerRef = useCallback(
    (el: HTMLVideoElement | null) => {
      register(el)
      videoRef.current = el
    },
    [register]
  )

  useVideoSource(videoRef, 'carousel', video.id, video.videoUrl, shouldLoad)

  const playback = useCarouselPlayback(videoRef, isActive, isPreview, shouldLoad)

  return (
    <CarouselSlide
      registerRef={registerRef}
      active={isActive}
      shouldLoad={shouldLoad}
      hasError={playback.hasError}
      t={t}
      onClick={() => onSlideClick(index, isActive)}
      onRetry={playback.retry}
      onError={playback.onError}
    />
  )
}

function ReactRiyilsInner({
  videos,
  currentIndex = 0,
  onVideoClick,
  onVideoChange,
  translations = {},
  containerHeightMobile,
  containerHeightDesktop,
  enableAutoAdvance = true,
}: Readonly<ReactRiyilsProps>) {
  const swiperRef = useRef<SwiperType | null>(null)
  const [activeIndex, setActiveIndex] = useState(currentIndex)

  const registry = useCarouselRegistry()
  const preloadAround = useCarouselPreload(videos)

  const t = useMemo(() => ({ ...defaultReactRiyilsTranslations, ...translations }), [translations])

  const containerStyle = useMemo(
    () =>
      ({
        '--container-height-mobile': containerHeightMobile ? `${containerHeightMobile}px` : undefined,
        '--container-height-desktop': containerHeightDesktop ? `${containerHeightDesktop}px` : undefined,
      }) as React.CSSProperties,
    [containerHeightMobile, containerHeightDesktop]
  )

  useEffect(() => {
    setActiveIndex(currentIndex)
    swiperRef.current?.slideTo(currentIndex, 0)
  }, [currentIndex])

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
    <section className="react-riyils__container" style={containerStyle} aria-label={t.carouselAriaLabel}>
      <Swiper
        modules={[Keyboard, Mousewheel, EffectCoverflow, Virtual]}
        observer
        observeParents
        watchSlidesProgress
        initialSlide={currentIndex}
        virtual={{ addSlidesBefore: 4, addSlidesAfter: 5, enabled: true, cache: false }}
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
        {videos.map((video, index) => (
          <SwiperSlide key={video.id} virtualIndex={index}>
            <CarouselSlideContainer
              video={video}
              index={index}
              activeIndex={activeIndex}
              t={t}
              registry={registry}
              onSlideClick={handleSlideClick}
            />
          </SwiperSlide>
        ))}
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
    <PlaybackControllerProvider>
      <ReactRiyilsInner {...props} />
    </PlaybackControllerProvider>
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

    return () => {
      el.removeEventListener('ended', handler)
    }
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
