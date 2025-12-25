import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel, EffectCoverflow, Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Play } from 'lucide-react';
import { useVideoSource } from './use-video-source';

import {
  type Video,
} from './riyils-viewer';

import './video-swiper.css';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/virtual';

export interface ReactRiyilsTranslations {
  ctaButton: string;
  carouselAriaLabel: string;
  slideActiveAriaLabel: string;
  slideInactiveAriaLabel: string;
}

export const defaultReactRiyilsTranslations: ReactRiyilsTranslations = {
  ctaButton: 'Watch Full Video',
  carouselAriaLabel: 'Video stories',
  slideActiveAriaLabel: 'Watch full video',
  slideInactiveAriaLabel: 'Go to slide',
};

export interface ReactRiyilsProps {
  readonly videos: Video[];
  readonly currentIndex?: number;
  readonly onVideoClick: (index: number) => void;
  readonly onVideoChange: (index: number) => void;
  readonly translations?: Partial<ReactRiyilsTranslations>;
  readonly containerHeightMobile?: number;
  readonly containerHeightDesktop?: number;
  readonly autoPlay?: boolean;
}

const SlideItem = React.memo(({
  video,
  isVisualActive,
  index,
  onVideoClick,
  t,
  shouldLoad
}: {
  video: Video;
  isVisualActive: boolean;
  index: number;
  onVideoClick: (idx: number) => void;
  t: ReactRiyilsTranslations;
  shouldLoad: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useVideoSource(videoRef, video.videoUrl, shouldLoad);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (!isVisualActive) {
        if (el.currentTime >= 2) {
          el.currentTime = 0;
          el.play().catch(() => { });
        }
      }
    };

    el.addEventListener('timeupdate', handleTimeUpdate);

    if (isVisualActive) {
      el.currentTime = 0;
      el.play().catch(() => { });
    } else if (shouldLoad) {
      el.muted = true;
      el.currentTime = 0;
    }

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isVisualActive, shouldLoad]);

  return (
    <button
      type="button"
      className="react-riyils__slide-button"
      onClick={() => onVideoClick(index)}
      aria-label={isVisualActive ? t.slideActiveAriaLabel : t.slideInactiveAriaLabel}
    >
      <div className={`react-riyils__card ${isVisualActive ? 'active' : ''}`}>
        <video
          ref={videoRef}
          muted
          playsInline
          loop={isVisualActive}
          className="react-riyils__video"
          preload={shouldLoad ? "auto" : "metadata"}
        />
        {isVisualActive && (
          <div className="react-riyils__cta-container">
            <span className="react-riyils__cta-button">
              <Play size={14} fill="currentColor" />
              {t.ctaButton}
            </span>
          </div>
        )}
      </div>
    </button>
  );
});

SlideItem.displayName = 'SlideItem';

export function ReactRiyils({
  videos,
  currentIndex = 0,
  onVideoClick,
  onVideoChange,
  translations = {},
  containerHeightMobile,
  containerHeightDesktop,
  autoPlay = true,
}: Readonly<ReactRiyilsProps>) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const t = useMemo(() => ({
    ...defaultReactRiyilsTranslations,
    ...translations
  }), [translations]);

  const containerStyle = useMemo(() => ({
    '--container-height-mobile': containerHeightMobile ? `${containerHeightMobile}px` : undefined,
    '--container-height-desktop': containerHeightDesktop ? `${containerHeightDesktop}px` : undefined,
  } as React.CSSProperties), [containerHeightMobile, containerHeightDesktop]);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed) {
      if (swiper.activeIndex !== currentIndex) {
        swiper.slideTo(currentIndex, 0);
      }

      swiper.update();

      const timer = setTimeout(() => {
        if (!swiper.destroyed) {
          swiper.updateSize();
          swiper.updateSlides();
          swiper.updateProgress();

          if (swiper.virtual) {
            swiper.virtual.update(true);
          }

          if (swiper.activeIndex !== currentIndex) {
            swiper.slideTo(currentIndex, 0);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!swiperRef.current || swiperRef.current.destroyed) return;

    swiperRef.current.update();
    if (swiperRef.current.virtual) {
      swiperRef.current.virtual.update(true);
    }
  }, [videos.length]);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    requestAnimationFrame(() => {
      if (swiper.activeIndex !== currentIndex) {
        setActiveIndex(swiper.activeIndex);
        onVideoChange(swiper.activeIndex);
      }
    });
  }, [onVideoChange, currentIndex]);

  return (
    <section
      className="react-riyils__container"
      style={containerStyle}
      aria-label={t.carouselAriaLabel}
    >
      <Swiper
        modules={[Keyboard, Mousewheel, EffectCoverflow, Virtual]}
        observer={true}
        observeParents={true}
        watchSlidesProgress={true}
        initialSlide={currentIndex}
        virtual={{
          addSlidesBefore: 4,
          addSlidesAfter: 5,
          enabled: true,
          cache: false
        }}
        effect="coverflow"
        coverflowEffect={{
          rotate: 0,
          stretch: -15,
          depth: 100,
          modifier: 2.5,
          slideShadows: true,
        }}
        onSwiper={(s) => {
          swiperRef.current = s;
        }}
        onSlideChange={handleSlideChange}
        slidesPerView="auto"
        centeredSlides={true}
        grabCursor={true}
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true }}
        className="react-riyils"
      >
        {videos.map((video, index) => {
          const isSelected = index === activeIndex;
          const distance = Math.abs(index - activeIndex);
          const shouldLoad = distance < 4;

          return (
            <SwiperSlide key={video.id} virtualIndex={index}>
              <SlideItem
                video={video}
                index={index}
                isVisualActive={isSelected}
                onVideoClick={isSelected ? onVideoClick : () => {
                  if (swiperRef.current && !swiperRef.current.destroyed) {
                    swiperRef.current.slideTo(index);
                  }
                }}
                t={t}
                shouldLoad={isSelected || shouldLoad}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}

export {
  RiyilsViewer,
  defaultRiyilsTranslations,
  type Video,
  type RiyilsTranslations,
  type RiyilsViewerProps
} from './riyils-viewer';