import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Mousewheel, Virtual } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import {
  AlertCircle,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { resetVideoSource, useVideoSource, type VideoQualityVariants } from './use-video-source'
import { ProgressBar, type ProgressBarRef } from './progress-bar'
import { useVideoRegistry } from './viewer/useVideoRegistry'
import { useRiyilsGestures, type GestureIntent, type GestureZone } from './viewer/useRiyilsGestures'
import { useRiyilsKeyboard } from './viewer/useRiyilsKeyboard'
import { useRiyilsPlayback } from './viewer/useRiyilsPlayback'
import { useRiyilsPreload } from './viewer/useRiyilsPreload'
import { useIosSafariGuard } from './viewer/useIosSafariGuard'
import { useIosAutoplayUnlock } from './viewer/useIosAutoplayUnlock'
import { PlaybackControllerProvider } from './playback/PlaybackControllerContext'
import { useRiyilsObserver } from './observe/useRiyilsObserver'

import 'swiper/css'
import 'swiper/css/virtual'

export interface Video {
  id: string
  videoUrl: string | VideoQualityVariants
  thumbnailUrl?: string
  captionUrl?: string
}

export interface RiyilsTranslations {
  close: string
  speedIndicator: string
  forward: string
  rewind: string
  play: string
  pause: string
  mute: string
  unmute: string
  videoPlayer: string
}

export const defaultRiyilsTranslations: RiyilsTranslations = {
  close: 'Close',
  speedIndicator: '2x Speed',
  forward: '10s Forward',
  rewind: '10s Rewind',
  play: 'Play',
  pause: 'Pause',
  mute: 'Mute',
  unmute: 'Unmute',
  videoPlayer: 'Video player',
}

export interface RiyilsViewerProps {
  readonly videos: Video[]
  readonly initialIndex?: number
  readonly onClose: () => void
  readonly onVideoChange?: (index: number) => void
  readonly translations?: Partial<RiyilsTranslations>
  readonly progressBarColor?: string
  readonly enableAutoAdvance?: boolean
}

const FEEDBACK_ANIMATION_MS = 600
const SCROLL_HINT_MS = 1000

type SeekFeedback = 'forward' | 'rewind' | null

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function shouldKeepMounted(index: number, activeIndex: number): boolean {
  return index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1
}

function useLockBodyScroll(): void {
  useEffect(() => {
    const body = document.body
    const o = body.style.overflow
    const b = body.style.overscrollBehavior
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    return () => {
      body.style.overflow = o
      body.style.overscrollBehavior = b
    }
  }, [])
}

export type PlaybackState = {
  isMuted: boolean
  isSpeedUp: boolean
  isPlaying: boolean
  hasError: boolean
  hasStarted: boolean
  enableAutoAdvance: boolean
}

type SlideUIState = {
  currentIndex: number
  seekFeedback: SeekFeedback
  showPlayPauseIcon: boolean
  showScrollHint: boolean
}

type SlideHandlers = {
  registerVideo: (index: number) => (el: HTMLVideoElement | null) => void
  onZoneClick: (zone: GestureZone, e: React.MouseEvent | React.TouchEvent) => void
  onStartSpeed: () => void
  onStopSpeed: () => void
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onEnded: () => void
  onError: () => void
  onRetry: (e: React.MouseEvent | React.TouchEvent) => void
  onContextMenu: (e: React.SyntheticEvent) => boolean
}

const RiyilsSlide = React.memo(function RiyilsSlide({
  video,
  index,
  t,
  ui,
  playback,
  activeAriaLabel,
  handlers,
}: {
  video: Video
  index: number
  t: RiyilsTranslations
  ui: SlideUIState
  playback: PlaybackState
  activeAriaLabel?: string
  handlers: SlideHandlers
}) {
  const mounted = shouldKeepMounted(index, ui.currentIndex)
  const active = index === ui.currentIndex

  if (!mounted) {
    return (
      <div className="react-riyils-viewer__slide">
        <div className="react-riyils-viewer__loader" />
      </div>
    )
  }

  return (
    <>
      {active && playback.hasError && (
        <div className="react-riyils-viewer__error-overlay">
          <div className="react-riyils-viewer__error-icon-box">
            <AlertCircle size={48} className="react-riyils-viewer__error-icon" />
          </div>
          <button type="button" onClick={handlers.onRetry} className="react-riyils-viewer__retry-btn">
            <RotateCcw size={32} />
          </button>
        </div>
      )}

      {active && (
        <fieldset
          className="react-riyils-viewer__gesture-grid"
          onContextMenu={handlers.onContextMenu}
          tabIndex={-1}
        >
          <button
            type="button"
            className="react-riyils-viewer__gesture-zone"
            onClick={(e) => handlers.onZoneClick('left', e)}
            aria-label={t.rewind}
            disabled={playback.hasError}
          />
          <button
            type="button"
            className="react-riyils-viewer__gesture-zone"
            onClick={(e) => handlers.onZoneClick('center', e)}
            aria-label={playback.isPlaying ? t.pause : t.play}
            disabled={playback.hasError}
          />
          <button
            type="button"
            className="react-riyils-viewer__gesture-zone"
            onClick={(e) => handlers.onZoneClick('right', e)}
            onTouchStart={handlers.onStartSpeed}
            onTouchEnd={handlers.onStopSpeed}
            onMouseDown={handlers.onStartSpeed}
            onMouseUp={handlers.onStopSpeed}
            aria-label={t.forward}
            disabled={playback.hasError}
          />
        </fieldset>
      )}

      {active && !playback.hasError && (
        <>
          <div className={`react-riyils-viewer__feedback-speed ${playback.isSpeedUp ? 'visible' : ''}`}>
            <Zap size={16} fill="currentColor" />
            <span>{t.speedIndicator}</span>
          </div>

          {!playback.isPlaying && (
            <div className="react-riyils-viewer__feedback-center">
              <div className="react-riyils-viewer__feedback-icon animate-in">
                <Play size={32} fill="white" />
              </div>
            </div>
          )}

          {playback.isPlaying && ui.showPlayPauseIcon && (
            <div className="react-riyils-viewer__feedback-center">
              <div className="react-riyils-viewer__feedback-icon animate-out">
                <Pause size={32} fill="white" />
              </div>
            </div>
          )}

          {ui.seekFeedback && (
            <div className={`react-riyils-viewer__feedback-seek ${ui.seekFeedback === 'forward' ? 'right' : 'left'}`}>
              <div className="react-riyils-viewer__seek-circle">
                {ui.seekFeedback === 'forward' ? <ChevronsRight size={32} /> : <ChevronsLeft size={32} />}
                <span className="react-riyils-viewer__seek-text">10s</span>
              </div>
            </div>
          )}
        </>
      )}

      <VideoEl
        video={video}
        index={index}
        active={active}
        shouldLoad={mounted}
        playback={playback}
        activeAriaLabel={active ? activeAriaLabel : undefined}
        handlers={handlers}
      />
    </>
  )
})

function VideoEl({
  video,
  index,
  active,
  shouldLoad,
  playback,
  activeAriaLabel,
  handlers,
}: Readonly<{
  video: Video
  index: number
  active: boolean
  shouldLoad: boolean
  playback: PlaybackState
  activeAriaLabel?: string
  handlers: SlideHandlers
}>) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useVideoSource(videoRef, 'viewer', video.id, video.videoUrl, shouldLoad)

  const showLoading =
    active &&
    !playback.hasError &&
    (!videoRef.current || videoRef.current.readyState < 2)

  return (
    <div className="react-riyils-viewer__video-wrapper">
      <video
        ref={(el) => {
          handlers.registerVideo(index)(el)
          videoRef.current = el
        }}
        className={`react-riyils-viewer__video ${active ? 'active' : 'react-riyils-viewer__video-buffer'}`}
        playsInline
        loop={!playback.enableAutoAdvance}
        muted={playback.isMuted}
        autoPlay={active}
        poster={video.thumbnailUrl}
        onTimeUpdate={active ? handlers.onTimeUpdate : undefined}
        onEnded={active ? handlers.onEnded : undefined}
        onError={active ? handlers.onError : undefined}
        onContextMenu={active ? handlers.onContextMenu : undefined}
        disablePictureInPicture
        disableRemotePlayback
        aria-label={active ? activeAriaLabel : undefined}
        aria-hidden={!active}
        tabIndex={-1}
      >
        <track kind="captions" src={video.captionUrl || ''} label="English" />
      </video>

      {showLoading && (
        <div className="react-riyils-viewer__loading">
          <div className="react-riyils-viewer__spinner" />
        </div>
      )}
    </div>
  )
}

function RiyilsViewerInner({
  videos,
  initialIndex = 0,
  onClose,
  onVideoChange,
  translations = {},
  progressBarColor = '#fff',
  enableAutoAdvance = false,
}: RiyilsViewerProps) {
  useLockBodyScroll()

  const observer = useRiyilsObserver('viewer')

  const t = useMemo(() => ({ ...defaultRiyilsTranslations, ...translations }), [translations])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedback>(null)
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)

  const swiperRef = useRef<SwiperType | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const progressBarRef = useRef<ProgressBarRef>(null)

  useIosAutoplayUnlock(containerRef)

  const registry = useVideoRegistry()

  const getVideoEl = useCallback((index: number) => registry.get(index), [registry])
  const getActiveId = useCallback(() => videos[currentIndex]?.id, [videos, currentIndex])

  const { preloadAround } = useRiyilsPreload(videos, currentIndex, initialIndex)

  const { playbackState, playbackHandlers } = useRiyilsPlayback(
    getVideoEl,
    getActiveId,
    currentIndex,
    enableAutoAdvance,
    observer
  )

  useIosSafariGuard({
    getActiveId,
    onReset: playbackHandlers.onError,
    onRetry: playbackHandlers.onRetry,
  })

  const showPlayPauseOnce = useCallback(() => {
    setShowPlayPauseIcon(true)
    globalThis.window.setTimeout(() => setShowPlayPauseIcon(false), FEEDBACK_ANIMATION_MS)
  }, [])

  const togglePlay = useCallback(() => {
    if (playbackState.hasError) return
    playbackHandlers.togglePlay()
    showPlayPauseOnce()
  }, [playbackHandlers, playbackState.hasError, showPlayPauseOnce])

  const handleGestureIntent = useCallback(
    (intent: GestureIntent) => {
      if (intent.type === 'seek') {
        playbackHandlers.seek(intent.delta, 'gesture')
        setSeekFeedback(intent.delta > 0 ? 'forward' : 'rewind')
        globalThis.window.setTimeout(() => setSeekFeedback(null), FEEDBACK_ANIMATION_MS)
        return
      }
      if (intent.type === 'toggle-play') {
        togglePlay()
        return
      }
      if (intent.type === 'speed-start') {
        if (!playbackState.hasError) playbackHandlers.setSpeedUp(true)
        return
      }
      if (intent.type === 'speed-stop') {
        playbackHandlers.setSpeedUp(false)
      }
    },
    [playbackHandlers, playbackState.hasError, togglePlay]
  )

  const { onZoneClick, onStartSpeed, onStopSpeed } = useRiyilsGestures(
    handleGestureIntent,
    playbackState.hasError
  )

  useRiyilsKeyboard(
    onClose,
    togglePlay,
    playbackHandlers.toggleMute
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onCtx = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    container.addEventListener('contextmenu', onCtx)
    return () => container.removeEventListener('contextmenu', onCtx)
  }, [])

  useEffect(() => {
    setShowScrollHint(true)
    const tmr = globalThis.window.setTimeout(() => setShowScrollHint(false), SCROLL_HINT_MS)
    return () => globalThis.window.clearTimeout(tmr)
  }, [currentIndex])

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (v.duration > 0) progressBarRef.current?.update((v.currentTime / v.duration) * 100)
  }, [])

  const handleProgressBarSeek = useCallback((percent: number) => {
    const v = getVideoEl(currentIndex);
    const id = getActiveId();
    if (!v || !id || Number.isNaN(v.duration) || v.duration === Infinity) return;

    const newTime = (percent / 100) * v.duration;
    v.currentTime = newTime;

    observer.seek(id, 0, 'gesture');
  }, [currentIndex, getActiveId, getVideoEl, observer]);

  const handleVideoEnded = useCallback(() => {
    if (!enableAutoAdvance) return
    const swiper = swiperRef.current
    const v = getVideoEl(currentIndex)
    if (!swiper || !v) return
    if (swiper.isEnd) {
      v.currentTime = 0
      void v.play().catch(() => undefined)
      return
    }
    swiper.slideNext()
  }, [currentIndex, enableAutoAdvance, getVideoEl])

  const handleSlideChange = useCallback(
    (s: SwiperType) => {
      const nextIndex = s.activeIndex
      setCurrentIndex(nextIndex)
      registry.stopAllExcept(nextIndex)
      preloadAround(nextIndex)
      onVideoChange?.(nextIndex)
      const nextVideo = getVideoEl(nextIndex)
      if (nextVideo) {
        nextVideo.pause()
        nextVideo.currentTime = 0
        nextVideo.load()
      }
    },
    [getVideoEl, onVideoChange, preloadAround, registry]
  )

  const handlers: SlideHandlers = useMemo(
    () => ({
      registerVideo: registry.register,
      onZoneClick,
      onStartSpeed,
      onStopSpeed,
      onTimeUpdate: handleTimeUpdate,
      onEnded: handleVideoEnded,
      onError: playbackHandlers.onError,
      onRetry: (e) => {
        e.stopPropagation()
        const id = getActiveId()
        if (id) resetVideoSource('viewer', id)
        playbackHandlers.onRetry()
      },
      onContextMenu: (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      },
    }),
    [
      getActiveId,
      handleTimeUpdate,
      handleVideoEnded,
      onStartSpeed,
      onStopSpeed,
      onZoneClick,
      playbackHandlers,
      registry.register,
    ]
  )

  const activeAriaLabel = useMemo(() => {
    const id = videos[currentIndex]?.id ?? ''
    return `${t.videoPlayer} - ${id}`
  }, [currentIndex, videos, t.videoPlayer])

  const uiState: SlideUIState = useMemo(
    () => ({
      currentIndex,
      seekFeedback,
      showPlayPauseIcon,
      showScrollHint,
    }),
    [currentIndex, seekFeedback, showPlayPauseIcon, showScrollHint]
  )

  const playback: PlaybackState = useMemo(
    () => ({
      ...playbackState,
      enableAutoAdvance,
    }),
    [enableAutoAdvance, playbackState]
  )

  return (
    <div ref={containerRef} className="react-riyils-viewer">
      <div className="react-riyils-viewer__gradient-top" />
      <ProgressBar
        ref={progressBarRef}
        color={progressBarColor}
        onSeek={handleProgressBarSeek}
      />
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
        onSwiper={(s) => {
          swiperRef.current = s
        }}
        onSlideChange={handleSlideChange}
        threshold={10}
        speed={400}
        keyboard={{ enabled: true }}
        mousewheel={{ enabled: true, thresholdDelta: 50 }}
        virtual={{ enabled: true, addSlidesBefore: 1, addSlidesAfter: 2 }}
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video.id} virtualIndex={index} className="react-riyils-viewer__slide">
            <RiyilsSlide
              video={video}
              index={index}
              t={t}
              ui={uiState}
              playback={playback}
              activeAriaLabel={index === currentIndex ? activeAriaLabel : undefined}
              handlers={handlers}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div
        className={`react-riyils-viewer__scroll-hint ${uiState.showScrollHint ? 'react-riyils-viewer__scroll-hint--visible' : 'react-riyils-viewer__scroll-hint--hidden'
          }`}
      >
        <ChevronsUp size={32} color="rgba(255, 255, 255, 0.7)" />
      </div>

      <div className="react-riyils-viewer__gradient-bottom">
        <div className="react-riyils-viewer__controls-row">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              playbackHandlers.toggleMute()
            }}
            className="react-riyils-viewer__btn react-riyils-viewer__btn-mute"
            aria-label={playbackState.isMuted ? t.unmute : t.mute}
          >
            {playbackState.isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RiyilsViewer(props: RiyilsViewerProps) {
  return (
    <PlaybackControllerProvider>
      <RiyilsViewerInner {...props} />
    </PlaybackControllerProvider>
  )
}
