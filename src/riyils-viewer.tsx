import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { X, Volume2, VolumeX, ChevronDown } from 'lucide-react';

import 'swiper/css';

export interface Video {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface RiyilsTranslations {
  swipe: string;
  close: string;
  mute: string;
  unmute: string;
  speedIndicator: string;
  videoViewer: string;
  videoInteractionArea: string;
}

const defaultTranslations: RiyilsTranslations = {
  swipe: 'Swipe',
  close: 'Close',
  mute: 'Mute',
  unmute: 'Unmute',
  speedIndicator: '2x',
  videoViewer: 'Video viewer',
  videoInteractionArea: 'Video interaction area',
};

export interface RiyilsViewerProps {
  readonly videos: Video[];
  readonly initialIndex?: number;
  readonly onClose?: () => void;
  readonly onVideoChange?: (index: number) => void;
  readonly translations?: RiyilsTranslations;
  readonly progressBarColor?: string;
}

export function RiyilsViewer({
  videos,
  initialIndex = 0,
  onClose,
  onVideoChange,
  translations = defaultTranslations,
  progressBarColor = '#FF0000',
}: Readonly<RiyilsViewerProps>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [showSwipeTip, setShowSwipeTip] = useState(true);
  const swiperRef = useRef<SwiperType | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef(0);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentVideoElement = videoRefs.current[currentIndex];
    if (!currentVideoElement) return;

    const updateProgress = () => {
      const progress = (currentVideoElement.currentTime / currentVideoElement.duration) * 100;
      setVideoProgress(progress || 0);
    };

    currentVideoElement.addEventListener('timeupdate', updateProgress, { passive: true });
    return () => {
      currentVideoElement.removeEventListener('timeupdate', updateProgress);
    };
  }, [currentIndex]);

  useEffect(() => {
    onVideoChange?.(currentIndex);
  }, [currentIndex, onVideoChange]);

  useEffect(() => {
    setShowSwipeTip(true);
    const timer = setTimeout(() => {
      setShowSwipeTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex && !isPaused) {
          video.playbackRate = isSpeedUp ? 2 : 1;
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, isPaused, isSpeedUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentIndex(swiper.activeIndex);
    setVideoProgress(0);
  };

  const handleVideoClick = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      setIsPaused((prev) => !prev);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>, index: number) => {
    const touch = e.touches[0];
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;

    if (x > width * 0.6 && index === currentIndex) {
      holdTimeoutRef.current = setTimeout(() => {
        setIsSpeedUp(true);
      }, 100);
    }
  };

  const clearSpeedUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    setIsSpeedUp(false);
  };

  const handleTouchEnd = clearSpeedUp;

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>, index: number) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x > width * 0.6 && index === currentIndex) {
      holdTimeoutRef.current = setTimeout(() => {
        setIsSpeedUp(true);
      }, 100);
    }
  };

  const handleMouseUp = clearSpeedUp;

  const goToNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      swiperRef.current?.slideNext();
    } else {
      onClose?.();
    }
  };

  return (
    <dialog
      open
      className="react-riyils-viewer"
      onContextMenu={(e) => e.preventDefault()}
      aria-label={translations.videoViewer}
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <Swiper
        modules={[Keyboard, Mousewheel]}
        direction="vertical"
        slidesPerView={1}
        speed={500}
        threshold={5}
        touchRatio={1}
        touchAngle={45}
        followFinger={true}
        shortSwipes={true}
        longSwipes={true}
        longSwipesRatio={0.5}
        longSwipesMs={300}
        preventInteractionOnTransition={false}
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true, sensitivity: 1 }}
        initialSlide={initialIndex}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={handleSlideChange}
        onReachEnd={() => {
          setTimeout(() => {
            onClose?.();
          }, 300);
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {videos.map((video, index) => {
          const isActive = index === currentIndex;

          return (
            <SwiperSlide key={video.id}>
              <section
                className="react-riyils-viewer__section"
                aria-label={`Video ${index + 1} of ${videos.length}`}
              >
                <button
                  type="button"
                  className="react-riyils-viewer__interaction-area"
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={(e) => handleMouseDown(e, index)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={translations.videoInteractionArea}
                />
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={video.videoUrl}
                  aria-label={`Video ${index + 1}`}
                  onClick={handleVideoClick}
                  onContextMenu={(e) => e.preventDefault()}
                  className="react-riyils-viewer__video"
                  playsInline
                  muted={isMuted}
                  preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'}
                  onLoadStart={() => {
                    setIsLoading(prev => ({ ...prev, [index]: true }));
                  }}
                  onLoadedData={() => {
                    setIsLoading(prev => ({ ...prev, [index]: false }));
                  }}
                  onWaiting={() => {
                    setIsLoading(prev => ({ ...prev, [index]: true }));
                  }}
                  onCanPlay={() => {
                    setIsLoading(prev => ({ ...prev, [index]: false }));
                  }}
                  onEnded={(e) => {
                    if (isActive) {
                      const target = e.target as HTMLVideoElement;
                      if (target.currentTime >= target.duration - 0.1) {
                        goToNextVideo();
                      }
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (isActive) {
                      const target = e.target as HTMLVideoElement;
                      setVideoProgress((target.currentTime / target.duration) * 100);
                    }
                  }}
                >
                  <track kind="captions" />
                </video>

                {isLoading[index] && isActive && (
                  <div className="react-riyils-viewer__loading">
                    <div className="react-riyils-viewer__loading-spinner" />
                  </div>
                )}

                {isPaused && isActive && (
                  <div className="react-riyils-viewer__pause-indicator">
                    <div className="react-riyils-viewer__pause-icon">
                      <div className="react-riyils-viewer__pause-bars"
                        style={{ borderLeftColor: 'rgba(255, 255, 255, 0.9)', borderRightColor: 'rgba(255, 255, 255, 0.9)' }} />
                    </div>
                  </div>
                )}

                {isSpeedUp && isActive && (
                  <div className="react-riyils-viewer__speed-indicator">
                    <div className="react-riyils-viewer__speed-badge">
                      <span className="react-riyils-viewer__speed-text">{translations.speedIndicator}</span>
                    </div>
                  </div>
                )}
              </section>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <div className="react-riyils-viewer__overlay">
        <div className="react-riyils-viewer__header">
          <div className="react-riyils-viewer__header-content">
            <div className="react-riyils-viewer__progress-wrapper">
              <div className="react-riyils-viewer__progress-track" style={{ backgroundColor: `${progressBarColor}30` }}>
                <div
                  className="react-riyils-viewer__progress-bar"
                  style={{ width: `${videoProgress}%`, backgroundColor: progressBarColor }}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="react-riyils-viewer__close-button"
              aria-label={translations.close}
            >
              <X className="react-riyils-viewer__close-icon" />
            </button>
          </div>
        </div>

        {currentIndex === 0 && showSwipeTip && (
          <div className="react-riyils-viewer__swipe-tip">
            <div className="react-riyils-viewer__swipe-tip-content">
              <p className="react-riyils-viewer__swipe-tip-text">
                {translations.swipe}
              </p>

              <div className="react-riyils-viewer__swipe-tip-icon-wrapper">
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--1"
                />
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--2"
                />
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--3"
                />
              </div>
            </div>
          </div>
        )}

        {showSwipeTip && currentIndex > 0 && (
          <div className="react-riyils-viewer__swipe-tip">
            <div className="react-riyils-viewer__swipe-tip-content">
              <p className="react-riyils-viewer__swipe-tip-text">
                {translations.swipe}
              </p>

              <div className="react-riyils-viewer__swipe-tip-icon-wrapper">
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--1"
                />
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--2"
                />
                <ChevronDown
                  className="react-riyils-viewer__swipe-tip-icon react-riyils-viewer__swipe-tip-icon--3"
                />
              </div>
            </div>
          </div>
        )}

        <div className="react-riyils-viewer__mute-button-wrapper">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="react-riyils-viewer__mute-button"
            aria-label={isMuted ? translations.unmute : translations.mute}
          >
            {isMuted ? (
              <VolumeX className="react-riyils-viewer__mute-icon" />
            ) : (
              <Volume2 className="react-riyils-viewer__mute-icon" />
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}