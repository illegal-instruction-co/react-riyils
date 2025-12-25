import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel, Virtual } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronsRight,
  ChevronsLeft,
  ChevronsUp,
  Zap,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useVideoSource, type VideoQualityVariants } from './use-video-source';

import 'swiper/css';
import 'swiper/css/virtual';

export interface Video {
  id: string;
  videoUrl: string | VideoQualityVariants;
  thumbnailUrl?: string;
  duration?: number;
  captionUrl?: string;
}

export interface RiyilsTranslations {
  close: string;
  speedIndicator: string;
  forward: string;
  rewind: string;
}

export const defaultRiyilsTranslations: RiyilsTranslations = {
  close: 'Close',
  speedIndicator: '2x Speed',
  forward: '10s Forward',
  rewind: '10s Rewind',
};

export interface RiyilsViewerProps {
  readonly videos: Video[];
  readonly initialIndex?: number;
  readonly onClose: () => void;
  readonly onVideoChange?: (index: number) => void;
  readonly translations?: Partial<RiyilsTranslations>;
  readonly progressBarColor?: string;
  readonly enableAutoAdvance?: boolean;
}

const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_DELAY = 500;
const SEEK_TIME = 10;
const ANIMATION_DURATION = 600;
const SCROLL_HINT_DURATION = 1000;

function useLockBodyScroll() {
  useEffect(() => {
    const body = globalThis.document.body;
    const originalStyle = globalThis.getComputedStyle(body).overflow;
    const originalOverscroll = body.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = originalStyle;
      body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);
}

export function RiyilsViewer({
  videos,
  initialIndex = 0,
  onClose,
  onVideoChange,
  translations = {},
  progressBarColor = '#fff',
  enableAutoAdvance = false,
}: Readonly<RiyilsViewerProps>) {
  useLockBodyScroll();

  const t = useMemo(() => ({
    ...defaultRiyilsTranslations,
    ...translations
  }), [translations]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState<'forward' | 'rewind' | null>(null);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasError, setHasError] = useState(false);

  const swiperRef = useRef<SwiperType | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef<number>(0);
  const longPressTriggered = useRef<boolean>(false);

  const activeVideoData = videos[currentIndex];
  useVideoSource(activeVideoRef, activeVideoData?.videoUrl, true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video || hasError) return;

    if (isPlaying) {
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name === 'NotAllowedError') {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [currentIndex, isPlaying, hasError]);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (video) {
      video.muted = isMuted;
      video.playbackRate = isSpeedUp ? 2 : 1;
    }
  }, [isMuted, isSpeedUp, currentIndex]);

  useEffect(() => {
    setShowScrollHint(true);
    const timer = setTimeout(() => {
      setShowScrollHint(false);
    }, SCROLL_HINT_DURATION);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.virtual.update(true);
      swiperRef.current.update();
      if (swiperRef.current.keyboard) {
        swiperRef.current.keyboard.enable();
      }
    }
  }, [videos.length]);

  const handleVideoError = useCallback(() => {
    setHasError(true);
    setIsPlaying(false);
  }, []);

  const handleRetry = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsPlaying(true);
    if (activeVideoRef.current) {
      activeVideoRef.current.load();
    }
  }, []);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (vid.duration) {
      setProgress((vid.currentTime / vid.duration) * 100);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (enableAutoAdvance && swiperRef.current) {
      if (swiperRef.current.isEnd) {
        if (activeVideoRef.current) {
          activeVideoRef.current.currentTime = 0;
          activeVideoRef.current.play().catch(() => { });
        }
      } else {
        swiperRef.current.slideNext();
      }
    }
  }, [enableAutoAdvance]);

  const handleTouchStart = useCallback(() => {
    if (hasError) return;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      setIsSpeedUp(true);
      longPressTriggered.current = true;
    }, LONG_PRESS_DELAY);
  }, [hasError]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsSpeedUp(false);
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    const video = activeVideoRef.current;
    if (!video || hasError) return;

    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);

    setSeekFeedback(seconds > 0 ? 'forward' : 'rewind');
    setTimeout(() => setSeekFeedback(null), ANIMATION_DURATION);
  }, [hasError]);

  const togglePlay = useCallback(() => {
    if (hasError) return;
    setIsPlaying(prev => {
      const newState = !prev;
      setShowPlayPauseIcon(true);
      setTimeout(() => setShowPlayPauseIcon(false), ANIMATION_DURATION);
      return newState;
    });
  }, [hasError]);

  const handleZoneClick = useCallback((zone: 'left' | 'center' | 'right', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasError) return;

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTapTime.current;

    if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0) {
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
      }

      if (zone === 'right') {
        handleSeek(SEEK_TIME);
      } else if (zone === 'left') {
        handleSeek(-SEEK_TIME);
      } else {
        togglePlay();
      }

      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
      doubleTapTimer.current = setTimeout(() => {
        togglePlay();
        lastTapTime.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [handleSeek, togglePlay, hasError]);

  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        default:
          break;
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, togglePlay]);

  const handleSlideChange = useCallback((s: SwiperType) => {
    setCurrentIndex(s.activeIndex);
    setHasError(false);
    setProgress(0);
    setIsPlaying(true);
    setSeekFeedback(null);
    if (onVideoChange) {
      onVideoChange(s.activeIndex);
    }
  }, [onVideoChange]);

  const preventDefaultMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="react-riyils-viewer"
      style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
    >
      <div className="react-riyils-viewer__gradient-top" />

      <div className="react-riyils-viewer__progress-container">
        <div
          className="react-riyils-viewer__progress-fill"
          style={{ width: `${progress}%`, background: progressBarColor }}
        />
      </div>

      <div className="react-riyils-viewer__close-container">
        <button
          type="button"
          onClick={onClose}
          className="react-riyils-viewer__btn react-riyils-viewer__btn-close"
          aria-label={t.close}
        >
          <X size={24} strokeWidth={2.5} />
        </button>
      </div>

      <Swiper
        modules={[Keyboard, Mousewheel, Virtual]}
        direction="vertical"
        initialSlide={initialIndex}
        onSwiper={(s) => (swiperRef.current = s)}
        onSlideChange={handleSlideChange}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        threshold={10}
        speed={400}
        keyboard={{ enabled: true }}
        mousewheel={{ enabled: true, thresholdDelta: 50 }}
        virtual={{ enabled: true, addSlidesBefore: 1, addSlidesAfter: 2 }}
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video.id} virtualIndex={index} className="react-riyils-viewer__slide">
            {index === currentIndex ? (
              <>
                {hasError && (
                  <div className="react-riyils-viewer__error-overlay">
                    <div className="react-riyils-viewer__error-icon-box">
                      <AlertCircle size={48} className="react-riyils-viewer__error-icon" />
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="react-riyils-viewer__retry-btn"
                    >
                      <RotateCcw size={32} />
                    </button>
                  </div>
                )}

                <fieldset
                  className="react-riyils-viewer__gesture-grid"
                  onContextMenu={preventDefaultMenu}
                  tabIndex={-1}
                  style={{ border: 0, margin: 0, padding: 0 }}
                >
                  <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone"
                    onClick={(e) => handleZoneClick('left', e)}
                    aria-label={t.rewind}
                    disabled={hasError}
                  />

                  <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone"
                    onClick={(e) => handleZoneClick('center', e)}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    disabled={hasError}
                  />

                  <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone"
                    onClick={(e) => handleZoneClick('right', e)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleTouchStart}
                    onMouseUp={handleTouchEnd}
                    aria-label={t.forward}
                    disabled={hasError}
                  />
                </fieldset>

                {!hasError && (
                  <>
                    <div className={`react-riyils-viewer__feedback-speed ${isSpeedUp ? 'visible' : ''}`}>
                      <Zap size={16} fill="currentColor" className="text-yellow-400" />
                      <span>{t.speedIndicator}</span>
                    </div>

                    {!isPlaying && (
                      <div className="react-riyils-viewer__feedback-center">
                        <div className="react-riyils-viewer__feedback-icon animate-in">
                          <Play size={32} fill="white" />
                        </div>
                      </div>
                    )}

                    {isPlaying && showPlayPauseIcon && (
                      <div className="react-riyils-viewer__feedback-center">
                        <div className="react-riyils-viewer__feedback-icon animate-out">
                          <Pause size={32} fill="white" />
                        </div>
                      </div>
                    )}

                    {seekFeedback && (
                      <div className={`react-riyils-viewer__feedback-seek ${seekFeedback === 'forward' ? 'right' : 'left'}`}>
                        <div className="react-riyils-viewer__seek-circle">
                          {seekFeedback === 'forward' ? <ChevronsRight size={32} /> : <ChevronsLeft size={32} />}
                          <span className="react-riyils-viewer__seek-text">10s</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <video
                  ref={activeVideoRef}
                  className="react-riyils-viewer__video"
                  playsInline
                  loop={!enableAutoAdvance}
                  muted={isMuted}
                  autoPlay
                  poster={video.thumbnailUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  onContextMenu={preventDefaultMenu}
                  disablePictureInPicture
                  disableRemotePlayback
                  aria-label={`Video ${video.id}`}
                >
                  <track
                    kind="captions"
                    src={video.captionUrl || ''}
                    label="English"
                  />
                </video>
              </>
            ) : (
              <div className="react-riyils-viewer__slide">
                <div className="react-riyils-viewer__loader" />
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>

      <div
        className="react-riyils-viewer__scroll-hint"
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 45,
          pointerEvents: 'none',
          opacity: showScrollHint ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: showScrollHint ? 'rr-bounce 1s infinite' : 'none',
        }}
      >
        <ChevronsUp size={32} color="rgba(255, 255, 255, 0.7)" />
      </div>

      <div className="react-riyils-viewer__gradient-bottom">
        <div className="react-riyils-viewer__controls-row">
          <button
            type="button"
            onClick={handleMuteToggle}
            className="react-riyils-viewer__btn react-riyils-viewer__btn-mute"
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rr-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
    </div>
  );
}