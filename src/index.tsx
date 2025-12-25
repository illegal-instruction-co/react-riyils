import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel, EffectCoverflow, Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Play, AlertCircle, RotateCcw } from 'lucide-react';
import { useVideoSource } from './use-video-source';

import { type Video } from './riyils-viewer';

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
  readonly enableAutoAdvance?: boolean;
}

type SlideItemProps = {
  video: Video;
  index: number;
  isVisualActive: boolean;
  shouldLoad: boolean;
  t: ReactRiyilsTranslations;
  onVideoClick: (idx: number) => void;
  onEnded?: () => void;
};

const SlideItem = React.memo(
  ({ video, isVisualActive, index, onVideoClick, t, shouldLoad, onEnded }: SlideItemProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);

    useVideoSource(videoRef, video.videoUrl, shouldLoad);

    useEffect(() => {
      const el = videoRef.current;
      if (!el || hasError) return;

      const tryPlay = (video: HTMLVideoElement, onFail?: () => void): void => {
        video.play().catch(() => {
          if (onFail) {
            onFail();
          }
        });
      };

      const safePlay = (): void => {
        tryPlay(el, () => {
          el.muted = true;
          tryPlay(el);
        });
      };

      const handleTimeUpdate = () => {
        if (!isVisualActive && el.currentTime >= 2) {
          el.currentTime = 0;
          safePlay();
        }
      };

      el.addEventListener('timeupdate', handleTimeUpdate);

      if (isVisualActive) {
        el.currentTime = 0;
        safePlay();
      } else if (shouldLoad) {
        el.muted = true;
        el.currentTime = 0;
      }

      return () => {
        el.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }, [isVisualActive, shouldLoad, hasError]);

    const handleError = useCallback(() => {
      setHasError(true);
    }, []);

    const handleRetry = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setHasError(false);
      videoRef.current?.load();
    }, []);

    return (
      <button
        type="button"
        className="react-riyils__slide-button"
        onClick={() => !hasError && onVideoClick(index)}
        aria-label={isVisualActive ? t.slideActiveAriaLabel : t.slideInactiveAriaLabel}
        disabled={hasError}
      >
        <div className={`react-riyils__card ${isVisualActive ? 'active' : ''}`}>
          {hasError ? (
            <div className="react-riyils__error-container">
              <AlertCircle size={32} className="react-riyils__error-icon" />
              <button
                type="button"
                className="react-riyils__retry-button"
                onClick={handleRetry}
                aria-label="Retry video"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              loop={isVisualActive && !onEnded}
              className="react-riyils__video"
              preload={shouldLoad ? 'auto' : 'metadata'}
              onError={handleError}
              onEnded={onEnded}
            />
          )}

          {isVisualActive && !hasError && (
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
  }
);

SlideItem.displayName = 'SlideItem';

function shouldPreload(index: number, activeIndex: number): boolean {
  return Math.abs(index - activeIndex) < 4;
}

export function ReactRiyils({
  videos,
  currentIndex = 0,
  onVideoClick,
  onVideoChange,
  translations = {},
  containerHeightMobile,
  containerHeightDesktop,
  enableAutoAdvance = true,
}: Readonly<ReactRiyilsProps>) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const t = useMemo(
    () => ({ ...defaultReactRiyilsTranslations, ...translations }),
    [translations]
  );

  const containerStyle = useMemo(
    () =>
      ({
        '--container-height-mobile': containerHeightMobile
          ? `${containerHeightMobile}px`
          : undefined,
        '--container-height-desktop': containerHeightDesktop
          ? `${containerHeightDesktop}px`
          : undefined,
      }) as React.CSSProperties,
    [containerHeightMobile, containerHeightDesktop]
  );

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) return;

    if (swiper.activeIndex !== currentIndex) {
      swiper.slideTo(currentIndex, 0);
    }

    swiper.update();

    const timer = setTimeout(() => {
      if (!swiper.destroyed) {
        swiper.updateSize();
        swiper.updateSlides();
        swiper.updateProgress();
        swiper.virtual?.update(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    swiperRef.current?.virtual?.update(true);
    swiperRef.current?.update();
  }, [videos.length]);

  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      requestAnimationFrame(() => {
        if (swiper.activeIndex !== currentIndex) {
          setActiveIndex(swiper.activeIndex);
          onVideoChange(swiper.activeIndex);
        }
      });
    },
    [onVideoChange, currentIndex]
  );

  const handleVideoEnded = useCallback(() => {
    if (enableAutoAdvance && swiperRef.current && !swiperRef.current.destroyed) {
      swiperRef.current.slideNext();
    }
  }, [enableAutoAdvance]);

  const handleSlideClick = useCallback(
    (index: number, isActive: boolean) => {
      if (isActive) {
        onVideoClick(index);
        return;
      }

      if (swiperRef.current && !swiperRef.current.destroyed) {
        swiperRef.current.slideTo(index);
      }
    },
    [onVideoClick]
  );

  return (
    <section
      className="react-riyils__container"
      style={containerStyle}
      aria-label={t.carouselAriaLabel}
    >
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
          swiperRef.current = s;
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
          const isActive = index === activeIndex;
          const load = shouldPreload(index, activeIndex);

          return (
            <SwiperSlide key={video.id} virtualIndex={index}>
              <SlideItem
                video={video}
                index={index}
                isVisualActive={isActive}
                shouldLoad={isActive || load}
                t={t}
                onVideoClick={(i) => handleSlideClick(i, isActive)}
                onEnded={isActive && enableAutoAdvance ? handleVideoEnded : undefined}
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
  type RiyilsViewerProps,
} from './riyils-viewer';
