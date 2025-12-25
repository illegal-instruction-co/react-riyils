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
  RotateCcw,
} from 'lucide-react';
import { videoSourceManager, type VideoQualityVariants } from './use-video-source';

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

const DOUBLE_TAP_DELAY_MS = 300;
const LONG_PRESS_DELAY_MS = 500;
const SEEK_SECONDS = 10;
const FEEDBACK_ANIMATION_MS = 600;
const SCROLL_HINT_MS = 1000;

type SeekFeedback = 'forward' | 'rewind' | null;

function useLockBodyScroll(): void {
  useEffect(() => {
    const body = document.body;
    const originalOverflow = globalThis.window.getComputedStyle(body).overflow;
    const originalOverscroll = body.style.overscrollBehavior;

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = originalOverflow;
      body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);
}

function isTextInput(target: EventTarget | null): boolean {
  if (!target) return false;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function shouldKeepMounted(index: number, activeIndex: number): boolean {
  return index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1;
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

  const t = useMemo(
    () => ({
      ...defaultRiyilsTranslations,
      ...translations,
    }),
    [translations]
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedback>(null);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasError, setHasError] = useState(false);

  const swiperRef = useRef<SwiperType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const longPressTimer = useRef<number | null>(null);
  const doubleTapTimer = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);
  const longPressTriggered = useRef<boolean>(false);
  const feedbackTimer = useRef<number | null>(null);
  const scrollHintTimer = useRef<number | null>(null);

  const activeVideoData = videos[currentIndex];

  const preloadAround = useCallback(
    (index: number) => {
      if (index < 0 || index >= videos.length) return;
      videoSourceManager.preload(index, videos[index]?.videoUrl);
      if (index - 1 >= 0) videoSourceManager.preload(index - 1, videos[index - 1]?.videoUrl);
      if (index + 1 < videos.length) videoSourceManager.preload(index + 1, videos[index + 1]?.videoUrl);
    },
    [videos]
  );

  useEffect(() => {
    preloadAround(initialIndex);
  }, [initialIndex, preloadAround]);

  useEffect(() => {
    preloadAround(currentIndex);
  }, [currentIndex, preloadAround]);

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

  const getVideoEl = useCallback((index: number): HTMLVideoElement | null => {
    return videoRefs.current.get(index) ?? null;
  }, []);

  const pauseVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    video.pause();
  }, []);

  const safePlay = useCallback((video: HTMLVideoElement | null, onNotAllowed: () => void) => {
    if (!video) return;
    video.play().catch((error: unknown) => {
      const err = error as { name?: string };
      if (err?.name === 'NotAllowedError') {
        onNotAllowed();
      }
    });
  }, []);

  const applyActivePlaybackState = useCallback(() => {
    const video = getVideoEl(currentIndex);
    if (!video || hasError) return;

    video.muted = isMuted;
    video.playbackRate = isSpeedUp ? 2 : 1;

    if (isPlaying) {
      safePlay(video, () => {
        video.muted = true;
        setIsMuted(true);
        safePlay(video, () => setIsPlaying(false));
      });
    } else {
      pauseVideo(video);
    }
  }, [currentIndex, getVideoEl, hasError, isMuted, isSpeedUp, isPlaying, pauseVideo, safePlay]);

  useEffect(() => {
    applyActivePlaybackState();
  }, [applyActivePlaybackState]);

  const stopAllExcept = useCallback(
    (active: number) => {
      videoRefs.current.forEach((video, index) => {
        if (index !== active) {
          video.pause();
        }
      });
    },
    []
  );

  const resetForNewActive = useCallback(() => {
    setHasError(false);
    setProgress(0);
    setIsPlaying(true);
    setSeekFeedback(null);
    setIsSpeedUp(false);
    longPressTriggered.current = false;

    if (longPressTimer.current) {
      globalThis.window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (doubleTapTimer.current) {
      globalThis.window.clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = null;
    }

    if (feedbackTimer.current) {
      globalThis.window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }
  }, []);

  useEffect(() => {
    setShowScrollHint(true);
    if (scrollHintTimer.current) {
      globalThis.window.clearTimeout(scrollHintTimer.current);
    }
    scrollHintTimer.current = globalThis.window.setTimeout(() => {
      setShowScrollHint(false);
      scrollHintTimer.current = null;
    }, SCROLL_HINT_MS);

    return () => {
      if (scrollHintTimer.current) {
        globalThis.window.clearTimeout(scrollHintTimer.current);
        scrollHintTimer.current = null;
      }
    };
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

  const handleRetry = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setHasError(false);
      setIsPlaying(true);

      const video = getVideoEl(currentIndex);
      if (!video) return;

      videoSourceManager.reset(currentIndex);
      videoSourceManager.preload(currentIndex, activeVideoData?.videoUrl);
      videoSourceManager.attach(video, currentIndex, activeVideoData?.videoUrl);

      video.load();
      safePlay(video, () => {
        video.muted = true;
        setIsMuted(true);
        safePlay(video, () => setIsPlaying(false));
      });
    },
    [activeVideoData?.videoUrl, currentIndex, getVideoEl, safePlay]
  );

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (vid.duration > 0) {
      setProgress((vid.currentTime / vid.duration) * 100);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (!enableAutoAdvance) return;

    const swiper = swiperRef.current;
    const activeVideo = getVideoEl(currentIndex);

    if (!swiper || !activeVideo) return;

    if (swiper.isEnd) {
      activeVideo.currentTime = 0;
      safePlay(activeVideo, () => { });
      return;
    }

    swiper.slideNext();
  }, [currentIndex, enableAutoAdvance, getVideoEl, safePlay]);

  const startSpeedUpTimer = useCallback(() => {
    if (hasError) return;
    longPressTriggered.current = false;

    if (longPressTimer.current) {
      globalThis.window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    longPressTimer.current = globalThis.window.setTimeout(() => {
      setIsSpeedUp(true);
      longPressTriggered.current = true;
      longPressTimer.current = null;
    }, LONG_PRESS_DELAY_MS);
  }, [hasError]);

  const stopSpeedUpTimer = useCallback(() => {
    if (longPressTimer.current) {
      globalThis.window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsSpeedUp(false);
  }, []);

  const showFeedbackOnce = useCallback((setter: (v: boolean) => void) => {
    setter(true);
    if (feedbackTimer.current) {
      globalThis.window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = globalThis.window.setTimeout(() => {
      setter(false);
      feedbackTimer.current = null;
    }, FEEDBACK_ANIMATION_MS);
  }, []);

  const togglePlay = useCallback(() => {
    if (hasError) return;

    setIsPlaying((prev) => {
      const next = !prev;
      showFeedbackOnce(setShowPlayPauseIcon);
      return next;
    });
  }, [hasError, showFeedbackOnce]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const video = getVideoEl(currentIndex);
      if (!video || hasError) return;

      const nextTime = clamp(video.currentTime + seconds, 0, video.duration || Number.MAX_SAFE_INTEGER);
      video.currentTime = nextTime;

      setSeekFeedback(seconds > 0 ? 'forward' : 'rewind');

      globalThis.window.setTimeout(() => {
        setSeekFeedback(null);
      }, FEEDBACK_ANIMATION_MS);
    },
    [currentIndex, getVideoEl, hasError]
  );

  const handleZoneClick = useCallback(
    (zone: 'left' | 'center' | 'right', e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (hasError) return;

      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastTapTime.current;

      if (timeDiff > 0 && timeDiff < DOUBLE_TAP_DELAY_MS) {
        if (doubleTapTimer.current) {
          globalThis.window.clearTimeout(doubleTapTimer.current);
          doubleTapTimer.current = null;
        }

        if (zone === 'right') {
          handleSeek(SEEK_SECONDS);
        } else if (zone === 'left') {
          handleSeek(-SEEK_SECONDS);
        } else {
          togglePlay();
        }

        lastTapTime.current = 0;
        return;
      }

      lastTapTime.current = now;

      if (doubleTapTimer.current) {
        globalThis.window.clearTimeout(doubleTapTimer.current);
      }
      doubleTapTimer.current = globalThis.window.setTimeout(() => {
        togglePlay();
        lastTapTime.current = 0;
        doubleTapTimer.current = null;
      }, DOUBLE_TAP_DELAY_MS);
    },
    [handleSeek, hasError, togglePlay]
  );

  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;

      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, togglePlay]);

  const handleSlideChange = useCallback(
    (s: SwiperType) => {
      const nextIndex = s.activeIndex;
      setCurrentIndex(nextIndex);
      resetForNewActive();

      stopAllExcept(nextIndex);
      preloadAround(nextIndex);

      if (onVideoChange) {
        onVideoChange(nextIndex);
      }

      const nextVideo = getVideoEl(nextIndex);
      if (nextVideo) {
        nextVideo.currentTime = 0;
      }
    },
    [getVideoEl, onVideoChange, preloadAround, resetForNewActive, stopAllExcept]
  );

  const preventDefaultMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const assignVideoRef = useCallback(
    (index: number) => (el: HTMLVideoElement | null) => {
      const prev = videoRefs.current.get(index);

      if (prev && prev !== el) {
        videoSourceManager.detach(index);
        videoRefs.current.delete(index);
      }

      if (!el) {
        if (prev) {
          videoSourceManager.detach(index);
          videoRefs.current.delete(index);
        }
        return;
      }

      videoRefs.current.set(index, el);
      videoSourceManager.attach(el, index, videos[index]?.videoUrl);
      el.muted = isMuted;
      el.playbackRate = 1;
    },
    [isMuted, videos]
  );

  const activeAriaLabel = useMemo(() => {
    const id = activeVideoData?.id ?? '';
    return `Video ${id}`;
  }, [activeVideoData?.id]);

  type RenderSlideState = {
    currentIndex: number;
    hasError: boolean;
    isMuted: boolean;
    isPlaying: boolean;
    isSpeedUp: boolean;
    seekFeedback: SeekFeedback;
    showPlayPauseIcon: boolean;
    enableAutoAdvance: boolean;
    activeAriaLabel?: string;
  };

  type RenderSlideHandlers = {
    assignVideoRef: (index: number) => (el: HTMLVideoElement | null) => void;
    handleRetry: (e: React.MouseEvent | React.TouchEvent) => void;
    handleZoneClick: (zone: 'left' | 'center' | 'right', e: React.MouseEvent | React.TouchEvent) => void;
    startSpeedUpTimer: () => void;
    stopSpeedUpTimer: () => void;
    handleTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    handleVideoEnded: () => void;
    handleVideoError: () => void;
    preventDefaultMenu: (e: React.SyntheticEvent) => boolean;
  };

  function renderSlide(
    video: Video,
    index: number,
    state: RenderSlideState,
    t: RiyilsTranslations,
    handlers: RenderSlideHandlers
  ): React.JSX.Element {
    const mounted = shouldKeepMounted(index, state.currentIndex);
    const active = index === state.currentIndex;

    if (!mounted) {
      return (
        <div className="react-riyils-viewer__slide">
          <div className="react-riyils-viewer__loader" />
        </div>
      );
    }

    return (
      <>
        {active && state.hasError && (
          <div className="react-riyils-viewer__error-overlay">
            <div className="react-riyils-viewer__error-icon-box">
              <AlertCircle size={48} className="react-riyils-viewer__error-icon" />
            </div>
            <button type="button" onClick={handlers.handleRetry} className="react-riyils-viewer__retry-btn">
              <RotateCcw size={32} />
            </button>
          </div>
        )}

        {active && (
          <fieldset
            className="react-riyils-viewer__gesture-grid"
            onContextMenu={handlers.preventDefaultMenu}
            tabIndex={-1}
            style={{ border: 0, margin: 0, padding: 0 }}
          >
            <button
              type="button"
              className="react-riyils-viewer__gesture-zone"
              onClick={(e) => handlers.handleZoneClick('left', e)}
              aria-label={t.rewind}
              disabled={state.hasError}
            />
            <button
              type="button"
              className="react-riyils-viewer__gesture-zone"
              onClick={(e) => handlers.handleZoneClick('center', e)}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
              disabled={state.hasError}
            />
            <button
              type="button"
              className="react-riyils-viewer__gesture-zone"
              onClick={(e) => handlers.handleZoneClick('right', e)}
              onTouchStart={handlers.startSpeedUpTimer}
              onTouchEnd={handlers.stopSpeedUpTimer}
              onMouseDown={handlers.startSpeedUpTimer}
              onMouseUp={handlers.stopSpeedUpTimer}
              aria-label={t.forward}
              disabled={state.hasError}
            />
          </fieldset>
        )}

        {active && !state.hasError && (
          <>
            <div className={`react-riyils-viewer__feedback-speed ${state.isSpeedUp ? 'visible' : ''}`}>
              <Zap size={16} fill="currentColor" className="text-yellow-400" />
              <span>{t.speedIndicator}</span>
            </div>

            {!state.isPlaying && (
              <div className="react-riyils-viewer__feedback-center">
                <div className="react-riyils-viewer__feedback-icon animate-in">
                  <Play size={32} fill="white" />
                </div>
              </div>
            )}

            {state.isPlaying && state.showPlayPauseIcon && (
              <div className="react-riyils-viewer__feedback-center">
                <div className="react-riyils-viewer__feedback-icon animate-out">
                  <Pause size={32} fill="white" />
                </div>
              </div>
            )}

            {state.seekFeedback && (
              <div
                className={`react-riyils-viewer__feedback-seek ${state.seekFeedback === 'forward' ? 'right' : 'left'
                  }`}
              >
                <div className="react-riyils-viewer__seek-circle">
                  {state.seekFeedback === 'forward' ? (
                    <ChevronsRight size={32} />
                  ) : (
                    <ChevronsLeft size={32} />
                  )}
                  <span className="react-riyils-viewer__seek-text">10s</span>
                </div>
              </div>
            )}
          </>
        )}

        <video
          ref={handlers.assignVideoRef(index)}
          className={`react-riyils-viewer__video ${active ? 'active' : 'react-riyils-viewer__video-buffer'}`}
          playsInline
          loop={!state.enableAutoAdvance}
          muted={state.isMuted}
          autoPlay={active}
          poster={video.thumbnailUrl}
          onTimeUpdate={active ? handlers.handleTimeUpdate : undefined}
          onEnded={active ? handlers.handleVideoEnded : undefined}
          onError={active ? handlers.handleVideoError : undefined}
          onContextMenu={active ? handlers.preventDefaultMenu : undefined}
          disablePictureInPicture
          disableRemotePlayback
          aria-label={active ? state.activeAriaLabel : undefined}
          tabIndex={-1}
        >
          <track kind="captions" src={video.captionUrl || ''} label="English" />
        </video>
      </>
    );
  }

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
            {renderSlide(
              video,
              index,
              {
                currentIndex,
                hasError,
                isMuted,
                isPlaying,
                isSpeedUp,
                seekFeedback,
                showPlayPauseIcon,
                enableAutoAdvance,
                activeAriaLabel: index === currentIndex ? activeAriaLabel : undefined,
              },
              t,
              {
                assignVideoRef,
                handleRetry,
                handleZoneClick,
                startSpeedUpTimer,
                stopSpeedUpTimer,
                handleTimeUpdate,
                handleVideoEnded,
                handleVideoError,
                preventDefaultMenu,
              }
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
