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
import {
  preloadVideoSource,
  resetVideoSource,
  useVideoSource,
  type VideoQualityVariants,
} from './use-video-source'
import { playbackController } from './playback-controller'

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
}

export const defaultRiyilsTranslations: RiyilsTranslations = {
  close: 'Close',
  speedIndicator: '2x Speed',
  forward: '10s Forward',
  rewind: '10s Rewind',
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

const DOUBLE_TAP_DELAY_MS = 300
const LONG_PRESS_DELAY_MS = 500
const SEEK_SECONDS = 10
const FEEDBACK_ANIMATION_MS = 600
const SCROLL_HINT_MS = 1000
const PLAY_VERIFY_MS = 260

type SeekFeedback = 'forward' | 'rewind' | null
type GestureZone = 'left' | 'center' | 'right'

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function shouldKeepMounted(index: number, activeIndex: number): boolean {
  return index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1
}

function stopTimer(ref: React.MutableRefObject<number | null>): void {
  if (ref.current !== null) {
    globalThis.window.clearTimeout(ref.current)
    ref.current = null
  }
}

function setOneShot(ref: React.MutableRefObject<number | null>, cb: () => void, ms: number): void {
  stopTimer(ref)
  ref.current = globalThis.window.setTimeout(() => {
    ref.current = null
    cb()
  }, ms)
}

function useLockBodyScroll(): void {
  useEffect(() => {
    const body = document.body
    const originalOverflow = body.style.overflow
    const originalOverscroll = body.style.overscrollBehavior
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    return () => {
      body.style.overflow = originalOverflow
      body.style.overscrollBehavior = originalOverscroll
    }
  }, [])
}

type PlaybackState = {
  isMuted: boolean
  isPlaying: boolean
  isSpeedUp: boolean
  hasError: boolean
  enableAutoAdvance: boolean
}

type SlideUIState = {
  currentIndex: number
  progress: number
  seekFeedback: SeekFeedback
  showPlayPauseIcon: boolean
  showScrollHint: boolean
}

type SlideHandlers = {
  assignVideoRef: (
    index: number,
    videoId: string,
    videoUrl: Video['videoUrl'],
    shouldLoad: boolean
  ) => (el: HTMLVideoElement | null) => void
  onZoneClick: (zone: GestureZone, e: React.MouseEvent | React.TouchEvent) => void
  onStartSpeed: () => void
  onStopSpeed: () => void
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  onEnded: () => void
  onError: () => void
  onRetry: (e: React.MouseEvent | React.TouchEvent) => void
  onContextMenu: (e: React.SyntheticEvent) => boolean
}

type RiyilsSlideProps = {
  video: Video
  index: number
  t: RiyilsTranslations
  ui: SlideUIState
  playback: PlaybackState
  activeAriaLabel?: string
  handlers: SlideHandlers
}

const RiyilsSlide = React.memo(function RiyilsSlide({
  video,
  index,
  t,
  ui,
  playback,
  activeAriaLabel,
  handlers,
}: RiyilsSlideProps) {
  const mounted = shouldKeepMounted(index, ui.currentIndex)
  const active = index === ui.currentIndex
  const shouldLoad = mounted

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
          style={{ border: 0, margin: 0, padding: 0 }}
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
            aria-label={playback.isPlaying ? 'Pause' : 'Play'}
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
            <Zap size={16} fill="currentColor" className="text-yellow-400" />
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
        shouldLoad={shouldLoad}
        playback={playback}
        activeAriaLabel={active ? activeAriaLabel : undefined}
        handlers={handlers}
      />
    </>
  )
})

type VideoElProps = {
  video: Video
  index: number
  active: boolean
  shouldLoad: boolean
  playback: PlaybackState
  activeAriaLabel?: string
  handlers: SlideHandlers
}

function VideoEl({ video, index, active, shouldLoad, playback, activeAriaLabel, handlers }: Readonly<VideoElProps>) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useVideoSource(videoRef, 'viewer', video.id, video.videoUrl, shouldLoad)

  return (
    <video
      ref={(el) => {
        handlers.assignVideoRef(index, video.id, video.videoUrl, shouldLoad)(el)
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
      tabIndex={-1}
    >
      <track kind="captions" src={video.captionUrl || ''} label="English" />
    </video>
  )
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
  useLockBodyScroll()

  const t = useMemo(() => ({ ...defaultRiyilsTranslations, ...translations }), [translations])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isMuted, setIsMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isSpeedUp, setIsSpeedUp] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedback>(null)
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [hasError, setHasError] = useState(false)

  const swiperRef = useRef<SwiperType | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())

  const longPressTimer = useRef<number | null>(null)
  const doubleTapTimer = useRef<number | null>(null)
  const feedbackTimer = useRef<number | null>(null)
  const scrollHintTimer = useRef<number | null>(null)

  const lastTapTime = useRef<number>(0)
  const longPressTriggered = useRef<boolean>(false)
  const playTokenRef = useRef<number>(0)

  const activeVideoData = videos[currentIndex]

  const preloadAround = useCallback(
    (index: number) => {
      if (index < 0 || index >= videos.length) return
      const cur = videos[index]
      if (cur) preloadVideoSource('viewer', cur.id, cur.videoUrl)
      const prev = videos[index - 1]
      if (prev) preloadVideoSource('viewer', prev.id, prev.videoUrl)
      const next = videos[index + 1]
      if (next) preloadVideoSource('viewer', next.id, next.videoUrl)
    },
    [videos]
  )

  useEffect(() => {
    preloadAround(initialIndex)
  }, [initialIndex, preloadAround])

  useEffect(() => {
    preloadAround(currentIndex)
  }, [currentIndex, preloadAround])

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

  const getVideoEl = useCallback((index: number) => videoRefs.current.get(index) ?? null, [])

  const stopAllExcept = useCallback((active: number) => {
    videoRefs.current.forEach((v, idx) => {
      if (idx !== active) v.pause()
    })
  }, [])

  const resetForNewActive = useCallback(() => {
    setHasError(false)
    setProgress(0)
    setSeekFeedback(null)
    setIsSpeedUp(false)
    setIsPlaying(true)
    longPressTriggered.current = false
    stopTimer(longPressTimer)
    stopTimer(doubleTapTimer)
    stopTimer(feedbackTimer)
  }, [])

  const applyPlayback = useCallback(async () => {
    const video = getVideoEl(currentIndex)
    const activeId = activeVideoData?.id
    if (!video || !activeId || hasError) return
    const token = playTokenRef.current + 1
    playTokenRef.current = token
    if (!isPlaying) {
      playbackController.reset('viewer', activeId)
      video.pause()
      return
    }
    const result = await playbackController.play({
      scope: 'viewer',
      id: activeId,
      video,
      options: {
        muted: isMuted,
        playbackRate: isSpeedUp ? 2 : 1,
        allowAutoMute: true,
        verifyMs: PLAY_VERIFY_MS,
      },
    })
    if (playTokenRef.current !== token) return
    if (result === 'playing') {
      if (video.muted !== isMuted) setIsMuted(video.muted)
      if (!isPlaying) setIsPlaying(true)
      return
    }
    if (result === 'blocked') {
      setIsMuted(true)
    }
    setIsPlaying(false)
  }, [activeVideoData?.id, getVideoEl, hasError, isMuted, isPlaying, isSpeedUp, currentIndex])

  useEffect(() => {
    void applyPlayback()
  }, [applyPlayback])

  useEffect(() => {
    setShowScrollHint(true)
    setOneShot(scrollHintTimer, () => setShowScrollHint(false), SCROLL_HINT_MS)
    return () => stopTimer(scrollHintTimer)
  }, [currentIndex])

  useEffect(() => {
    const s = swiperRef.current
    if (!s || s.destroyed) return
    s.virtual?.update(true)
    s.update()
    s.keyboard?.enable()
  }, [videos.length])

  const handleVideoError = useCallback(() => {
    setHasError(true)
    setIsPlaying(false)
    if (activeVideoData?.id) playbackController.reset('viewer', activeVideoData.id)
  }, [activeVideoData?.id])

  const handleRetry = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      setHasError(false)
      setIsPlaying(true)
      if (activeVideoData) {
        playbackController.reset('viewer', activeVideoData.id)
        resetVideoSource('viewer', activeVideoData.id)
      }
      const v = getVideoEl(currentIndex)
      if (!v) return
      v.load()
      void applyPlayback()
    },
    [activeVideoData, applyPlayback, currentIndex, getVideoEl]
  )

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (v.duration > 0) {
      setProgress((v.currentTime / v.duration) * 100)
    }
  }, [])

  const handleVideoEnded = useCallback(() => {
    if (!enableAutoAdvance) return
    const swiper = swiperRef.current
    const v = getVideoEl(currentIndex)
    if (!swiper || !v) return
    if (swiper.isEnd) {
      v.currentTime = 0
      void applyPlayback()
      return
    }
    swiper.slideNext()
  }, [applyPlayback, currentIndex, enableAutoAdvance, getVideoEl])

  const startSpeedUpTimer = useCallback(() => {
    if (hasError) return
    longPressTriggered.current = false
    stopTimer(longPressTimer)
    longPressTimer.current = globalThis.window.setTimeout(() => {
      setIsSpeedUp(true)
      longPressTriggered.current = true
      longPressTimer.current = null
    }, LONG_PRESS_DELAY_MS)
  }, [hasError])

  const stopSpeedUpTimer = useCallback(() => {
    stopTimer(longPressTimer)
    setIsSpeedUp(false)
  }, [])

  const showPlayPauseOnce = useCallback(() => {
    setShowPlayPauseIcon(true)
    setOneShot(feedbackTimer, () => setShowPlayPauseIcon(false), FEEDBACK_ANIMATION_MS)
  }, [])

  const togglePlay = useCallback(() => {
    if (hasError) return
    setIsPlaying((p) => !p)
    showPlayPauseOnce()
  }, [hasError, showPlayPauseOnce])

  const handleSeek = useCallback(
    (deltaSeconds: number) => {
      const v = getVideoEl(currentIndex)
      if (!v || hasError) return
      const next = clamp(v.currentTime + deltaSeconds, 0, v.duration || Number.MAX_SAFE_INTEGER)
      v.currentTime = next
      setSeekFeedback(deltaSeconds > 0 ? 'forward' : 'rewind')
      globalThis.window.setTimeout(() => setSeekFeedback(null), FEEDBACK_ANIMATION_MS)
    },
    [currentIndex, getVideoEl, hasError]
  )

  const handleZoneClick = useCallback(
    (zone: GestureZone, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (hasError) return
      if (longPressTriggered.current) {
        longPressTriggered.current = false
        return
      }
      const now = Date.now()
      const diff = now - lastTapTime.current
      const isDoubleTap = diff > 0 && diff < DOUBLE_TAP_DELAY_MS
      lastTapTime.current = now
      if (isDoubleTap) {
        stopTimer(doubleTapTimer)
        if (zone === 'right') handleSeek(SEEK_SECONDS)
        else if (zone === 'left') handleSeek(-SEEK_SECONDS)
        else togglePlay()
        lastTapTime.current = 0
        return
      }
      stopTimer(doubleTapTimer)
      doubleTapTimer.current = globalThis.window.setTimeout(() => {
        togglePlay()
        lastTapTime.current = 0
        doubleTapTimer.current = null
      }, DOUBLE_TAP_DELAY_MS)
    },
    [handleSeek, hasError, togglePlay]
  )

  const handleMuteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMuted((m) => !m)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return
      if (e.code === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
        return
      }
      if (e.code === 'KeyM') {
        e.preventDefault()
        setIsMuted((m) => !m)
      }
    }
    globalThis.window.addEventListener('keydown', onKey)
    return () => globalThis.window.removeEventListener('keydown', onKey)
  }, [onClose, togglePlay])

  const handleSlideChange = useCallback(
    (s: SwiperType) => {
      const nextIndex = s.activeIndex
      const next = videos[nextIndex]
      setCurrentIndex(nextIndex)
      resetForNewActive()
      stopAllExcept(nextIndex)
      preloadAround(nextIndex)
      if (next) playbackController.cancelAllExcept(`viewer:${next.id}`)
      onVideoChange?.(nextIndex)
      const nextVideo = getVideoEl(nextIndex)
      if (nextVideo) nextVideo.currentTime = 0
    },
    [getVideoEl, onVideoChange, preloadAround, resetForNewActive, stopAllExcept, videos]
  )

  const preventDefaultMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }, [])

  const assignVideoRef = useCallback(
    (index: number, _videoId: string, _videoUrl: Video['videoUrl'], _shouldLoad: boolean) =>
      (el: HTMLVideoElement | null) => {
        const prev = videoRefs.current.get(index)
        if (prev && prev !== el) {
          videoRefs.current.delete(index)
        }
        if (!el) {
          if (prev) videoRefs.current.delete(index)
          return
        }
        videoRefs.current.set(index, el)
        el.muted = isMuted
        el.playbackRate = 1
        if (index === currentIndex && isPlaying && !hasError) {
          queueMicrotask(() => {
            void applyPlayback()
          })
        }
      },
    [applyPlayback, currentIndex, hasError, isMuted, isPlaying]
  )

  const activeAriaLabel = useMemo(() => {
    const id = activeVideoData?.id ?? ''
    return `Video ${id}`
  }, [activeVideoData?.id])

  const uiState: SlideUIState = useMemo(
    () => ({
      currentIndex,
      progress,
      seekFeedback,
      showPlayPauseIcon,
      showScrollHint,
    }),
    [currentIndex, progress, seekFeedback, showPlayPauseIcon, showScrollHint]
  )

  const playbackState: PlaybackState = useMemo(
    () => ({
      isMuted,
      isPlaying,
      isSpeedUp,
      hasError,
      enableAutoAdvance,
    }),
    [enableAutoAdvance, hasError, isMuted, isPlaying, isSpeedUp]
  )

  const handlers: SlideHandlers = useMemo(
    () => ({
      assignVideoRef,
      onZoneClick: handleZoneClick,
      onStartSpeed: startSpeedUpTimer,
      onStopSpeed: stopSpeedUpTimer,
      onTimeUpdate: handleTimeUpdate,
      onEnded: handleVideoEnded,
      onError: handleVideoError,
      onRetry: handleRetry,
      onContextMenu: preventDefaultMenu,
    }),
    [
      assignVideoRef,
      handleZoneClick,
      handleRetry,
      handleTimeUpdate,
      handleVideoEnded,
      handleVideoError,
      preventDefaultMenu,
      startSpeedUpTimer,
      stopSpeedUpTimer,
    ]
  )

  return (
    <div ref={containerRef} className="react-riyils-viewer" style={{ WebkitTouchCallout: 'none' }}>
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
        onSwiper={(s) => {
          swiperRef.current = s
        }}
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
            <RiyilsSlide
              video={video}
              index={index}
              t={t}
              ui={uiState}
              playback={playbackState}
              activeAriaLabel={index === currentIndex ? activeAriaLabel : undefined}
              handlers={handlers}
            />
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
          opacity: uiState.showScrollHint ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: uiState.showScrollHint ? 'rr-bounce 1s infinite' : 'none',
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
  )
}
