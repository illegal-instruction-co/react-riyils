import React, { useRef, useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard, EffectCoverflow, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Play } from 'lucide-react';
import type { Video } from './riyils-viewer';

import './video-swiper.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

export { RiyilsViewer, type Video, type RiyilsTranslations, type RiyilsViewerProps } from './riyils-viewer';

export interface ReactRiyilsTranslations {
  watchFullVideo: string;
  videoProgress: string;
}

export const defaultReactRiyilsTranslations: ReactRiyilsTranslations = {
  watchFullVideo: 'Watch Full Video',
  videoProgress: 'Video progress',
};

export const VIDEO_DURATION_LIMIT = 10;
export const PRELOAD_DISTANCE = 1;
export const CONTAINER_HEIGHT_MOBILE = 380;
export const CONTAINER_HEIGHT_DESKTOP = 500;
export const PREVIEW_DURATION = 2;

export const getPreloadStrategy = (index: number, activeIndex: number, preloadDist: number): string => {
  if (index <= 3) return 'auto';
  const distance = Math.abs(index - activeIndex);
  if (distance <= preloadDist) return 'auto';
  if (distance <= 2) return 'metadata';
  return 'none';
};

export const handleVideoPlayWithFallback = (
  video: HTMLVideoElement,
  hasInteracted: boolean,
  setHasInteracted: (value: boolean) => void
) => {
  video.play().catch((error) => {
    console.warn('Video play failed:', error);
    if (!hasInteracted) {
      const playOnInteraction = () => {
        video.play().catch(() => { });
        setHasInteracted(true);
        document.removeEventListener('touchstart', playOnInteraction);
        document.removeEventListener('click', playOnInteraction);
      };
      document.addEventListener('touchstart', playOnInteraction, { once: true });
      document.addEventListener('click', playOnInteraction, { once: true });
    }
  });
};

export const safePlayVideo = (video: HTMLVideoElement) => {
  video.play().catch((error) => console.warn('Video preload failed:', error));
};

export interface ReactRiyilsProps {
  readonly videos: Video[];
  readonly currentIndex: number;
  readonly onVideoClick: (index: number) => void;
  readonly onVideoChange: (index: number) => void;
  readonly translations?: ReactRiyilsTranslations;
  readonly containerHeightMobile?: number;
  readonly containerHeightDesktop?: number;
  readonly progressBarColor?: string;
  readonly videoDurationLimit?: number;
  readonly preloadDistance?: number;
  readonly previewDuration?: number;
  readonly autoPlay?: boolean;
}

export function ReactRiyils({
  videos,
  currentIndex,
  onVideoClick,
  onVideoChange,
  translations = defaultReactRiyilsTranslations,
  containerHeightMobile = CONTAINER_HEIGHT_MOBILE,
  containerHeightDesktop = CONTAINER_HEIGHT_DESKTOP,
  progressBarColor = '#3B82F6',
  videoDurationLimit = VIDEO_DURATION_LIMIT,
  preloadDistance = PRELOAD_DISTANCE,
  previewDuration = PREVIEW_DURATION,
  autoPlay = true,
}: Readonly<ReactRiyilsProps>) {
  const swiperRef = useRef<SwiperType | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWheelScrollingRef = useRef(false);

  const dynamicStretch = Math.round(containerHeightDesktop / 9);

  const setVideoLoading = (index: number, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [index]: loading }));
  };

  const handleVideoLoadedData = (e: React.SyntheticEvent<HTMLVideoElement>, index: number) => {
    setVideoLoading(index, false);
    const videoEl = e.target as HTMLVideoElement;
    const distance = Math.abs(index - activeIndex);
    if (videoEl.readyState >= 2) {
      if (index === activeIndex) {
        videoEl.style.opacity = '1';
        videoEl.loop = true;
        videoEl.currentTime = 0;
        if (autoPlay) {
          handleVideoPlayWithFallback(videoEl, hasInteracted, setHasInteracted);
        }
      } else if (distance <= preloadDistance) {
        videoEl.style.opacity = '0.95';
        videoEl.loop = false;
        videoEl.currentTime = 0;
        if (autoPlay) {
          safePlayVideo(videoEl);
        }
      }
    }
  };

  useEffect(() => {
    if (swiperRef.current && currentIndex !== activeIndex) {
      swiperRef.current.slideTo(currentIndex, 400);
    }
  }, [currentIndex, activeIndex]);

  useEffect(() => {
    const handleResize = () => {
      if (swiperRef.current) {
        swiperRef.current.update();
        swiperRef.current.slideTo(activeIndex, 0);
      }
    };

    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      if (swiperRef.current) {
        swiperRef.current.update();
        swiperRef.current.slideTo(currentIndex, 0);
      }
    }, 100);

    if (containerRef.current) {
      const style = containerRef.current.style as CSSStyleDeclaration & {
        touchAction: string;
        webkitTapHighlightColor: string;
        webkitUserSelect: string;
      };
      style.touchAction = 'pan-y pan-x';
      style.webkitTapHighlightColor = 'transparent';
      style.userSelect = 'none';
      style.webkitUserSelect = 'none';

      const handleWheel = (e: WheelEvent) => {
        if (isWheelScrollingRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (Math.abs(e.deltaX) < 30) return;

        e.preventDefault();
        e.stopPropagation();

        isWheelScrollingRef.current = true;

        if (e.deltaX > 0) {
          swiperRef.current?.slideNext();
        } else if (e.deltaX < 0) {
          swiperRef.current?.slidePrev();
        }

        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }

        wheelTimeoutRef.current = setTimeout(() => {
          isWheelScrollingRef.current = false;
        }, 1000);
      };

      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
        containerRef.current?.removeEventListener('wheel', handleWheel);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const videos = videoRefs.current;
    return () => {
      videos.forEach(video => {
        if (video) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      });
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      videoRefs.current.forEach((video, index) => {
        if (!video) return;
        const distance = Math.abs(index - activeIndex);

        if (index === activeIndex) {
          video.style.opacity = '1';
          video.loop = true;
          if (video.readyState >= 2) {
            video.currentTime = 0;
            if (autoPlay) {
              handleVideoPlayWithFallback(video, hasInteracted, setHasInteracted);
            }
          }
        } else if (distance <= preloadDistance) {
          video.style.opacity = '0.95';
          video.loop = false;
          if (video.readyState >= 2) {
            video.currentTime = 0;
            if (autoPlay) {
              safePlayVideo(video);
            }
          }
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [activeIndex, hasInteracted]);

  const handleSlideChange = (swiper: SwiperType) => {
    const activeIdx = swiper.activeIndex;
    setActiveIndex(activeIdx);
    onVideoChange(activeIdx);

    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      const distance = Math.abs(index - activeIdx);

      if (index === activeIdx) {
        video.style.opacity = '1';
        video.loop = true;
        if (video.readyState >= 2) {
          video.currentTime = 0;
          video.play().catch((error) => console.warn('Video play failed:', error));
        }
      } else if (distance <= PRELOAD_DISTANCE) {
        video.style.opacity = '0.95';
        video.loop = false;
        if (video.readyState >= 2) {
          video.currentTime = 0;
          video.play().catch((error) => console.warn('Video preload failed:', error));
        }
      } else {
        video.pause();
        video.currentTime = 0;
        video.loop = false;
      }
    });
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>, index: number) => {
    const target = e.currentTarget;
    const isActive = swiperRef.current?.activeIndex === index;
    const distance = Math.abs(index - activeIndex);

    if (isActive) {
      if (target.currentTime >= videoDurationLimit) {
        target.currentTime = 0;
        target.pause();
        swiperRef.current?.slideNext();
      }
    } else if (distance <= preloadDistance && target.currentTime >= previewDuration) {
      target.currentTime = 0;
      target.play().catch((error) => console.warn('Preview video replay failed:', error));
    }
  };

  return (
    <section
      ref={containerRef}
      className="react-riyils__container"
      data-height-mobile
      data-height-desktop
      aria-label="Video carousel"
      style={{
        '--container-height-mobile': `${containerHeightMobile}px`,
        '--container-height-desktop': `${containerHeightDesktop}px`,
      } as React.CSSProperties}
    >
      <Swiper
        modules={[Navigation, Keyboard, EffectCoverflow, Mousewheel]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={handleSlideChange}
        className="react-riyils"
        slidesPerView="auto"
        slidesPerGroup={1}
        centeredSlides={true}
        centerInsufficientSlides={true}
        spaceBetween={0}
        loop={false}
        initialSlide={currentIndex}
        speed={800}
        threshold={10}
        touchRatio={1}
        touchAngle={45}
        followFinger={true}
        shortSwipes={true}
        longSwipes={true}
        longSwipesRatio={0.3}
        longSwipesMs={300}
        preventInteractionOnTransition={true}
        touchStartPreventDefault={false}
        cssMode={false}
        keyboard={{ enabled: true }}
        navigation={false}
        mousewheel={false}
        effect="coverflow"
        resistance={true}
        resistanceRatio={0}
        coverflowEffect={{
          rotate: 0,
          stretch: dynamicStretch,
          depth: 100,
          modifier: 1,
          slideShadows: false,
        }}
        breakpoints={{
          640: {
            spaceBetween: 0,
          },
          768: {
            spaceBetween: 0,
          },
        }}
        style={{
          height: '100%',
          padding: '0',
        }}
      >
        {videos.map((video, index) => {
          return (
            <SwiperSlide
              key={video.id}
            >
              {({ isActive: slideActive }) => {
                return (
                  <button
                    type="button"
                    className={`react-riyils__slide-button ${slideActive ? '' : 'react-riyils__slide-button--inactive'
                      }`}
                    onClick={() => {
                      if (slideActive) {
                        onVideoClick(index);
                      } else {
                        swiperRef.current?.slideTo(index);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (slideActive) {
                          onVideoClick(index);
                        } else {
                          swiperRef.current?.slideTo(index);
                        }
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label={`Video ${index + 1}`}
                  >
                    <div className={`react-riyils__video-container ${slideActive
                      ? 'react-riyils__video-container--active'
                      : 'react-riyils__video-container--inactive'
                      }`}>
                      <video
                        ref={(el) => {
                          videoRefs.current[index] = el;
                        }}
                        src={video.videoUrl}
                        className="react-riyils__video"
                        muted
                        playsInline
                        onContextMenu={(e) => e.preventDefault()}
                        preload={getPreloadStrategy(index, activeIndex, preloadDistance)}
                        aria-label={`Video ${index + 1}`}
                        onLoadStart={() => setVideoLoading(index, true)}
                        onLoadedData={(e) => handleVideoLoadedData(e, index)}
                        onWaiting={() => setVideoLoading(index, true)}
                        onCanPlay={() => setVideoLoading(index, false)}
                        onTimeUpdate={(e) => handleTimeUpdate(e, index)}
                      />

                      {isLoading[index] && slideActive && (
                        <div className="react-riyils__loading">
                          <div className="react-riyils__spinner" />
                        </div>
                      )}

                      {!slideActive && (
                        <>
                          <div className="react-riyils__overlay-gradient" />
                          <div className="react-riyils__overlay-blur" />
                        </>
                      )}

                      {slideActive && (
                        <div className="react-riyils__cta-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVideoClick(index);
                            }}
                            aria-label={translations.watchFullVideo}
                            className="react-riyils__cta-button"
                          >
                            <div className="react-riyils__cta-badge">
                              <Play className="react-riyils__cta-icon" fill="currentColor" strokeWidth={0} />
                              <span className="react-riyils__cta-text">{translations.watchFullVideo}</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                );
              }}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}

// Custom Hooks
export function useVideoPreload(
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>,
  activeIndex: number,
  preloadDistance: number = PRELOAD_DISTANCE
) {
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      const distance = Math.abs(index - activeIndex);

      if (distance <= preloadDistance) {
        video.preload = 'auto';
      } else if (distance <= 2) {
        video.preload = 'metadata';
      } else {
        video.preload = 'none';
      }
    });
  }, [activeIndex, preloadDistance, videoRefs]);
}

export function useVideoControls(
  videoElement: HTMLVideoElement | null,
  isActive: boolean,
  autoPlay: boolean = true
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!videoElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      const prog = (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(prog || 0);
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    if (isActive && autoPlay && videoElement.paused) {
      videoElement.play().catch(() => { });
    } else if (!isActive && !videoElement.paused) {
      videoElement.pause();
    }

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoElement, isActive, autoPlay]);

  const play = () => videoElement?.play().catch(() => { });
  const pause = () => videoElement?.pause();
  const togglePlay = () => (isPlaying ? pause() : play());
  const seek = (time: number) => {
    if (videoElement) videoElement.currentTime = time;
  };

  return { isPlaying, progress, play, pause, togglePlay, seek };
}

export function useSwiperControl(initialIndex: number = 0) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToSlide = (index: number, speed?: number) => {
    swiperRef.current?.slideTo(index, speed);
  };

  const nextSlide = () => {
    swiperRef.current?.slideNext();
  };

  const prevSlide = () => {
    swiperRef.current?.slidePrev();
  };

  const updateSlider = () => {
    swiperRef.current?.update();
  };

  return {
    swiperRef,
    currentIndex,
    setCurrentIndex,
    goToSlide,
    nextSlide,
    prevSlide,
    updateSlider,
  };
}
