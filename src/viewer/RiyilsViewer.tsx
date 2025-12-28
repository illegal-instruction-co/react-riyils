import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Mousewheel, Virtual } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import {
    ChevronsUp,
    ChevronUp,
    ChevronDown,
    Volume2,
    VolumeX,
    X,
    Minimize2,
    Maximize2,
} from 'lucide-react'
import { MiniPlayer } from './MiniPlayer'
import { type VideoQualityVariants } from '../use-video-source'
import { ProgressBar, type ProgressBarRef } from './ProgressBar'
import { useVideoRegistry } from './useVideoRegistry'
import { useRiyilsGestures, type GestureIntent, type GestureZone } from './useRiyilsGestures'
import { useRiyilsKeyboard } from './useRiyilsKeyboard'
import { useRiyilsPlayback, type PlaybackState } from './useRiyilsPlayback'
import { useRiyilsPreload } from './useRiyilsPreload'
import { usePageLifecycleGuard } from './usePageLifecycleGuard'
import { useIosAutoplayUnlock } from './useIosAutoplayUnlock'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'
import { RiyilsSlide, type SlideUIState } from './RiyilsSlide'

import 'swiper/css'
import 'swiper/css/virtual'
import '../carousel/video-swiper.css'
import { triggerHaptic as originalTriggerHaptic, throttle } from '../utils'

const triggerHaptic = throttle(originalTriggerHaptic, 100)

export interface Video {
    id: string
    videoUrl: string | VideoQualityVariants
    thumbnailUrl?: string
    captionUrl?: string
    caption?: string
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
    more: string
    less: string
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
    more: 'more',
    less: 'less',
}

export interface AdConfig {
    interval?: number
    shouldInject?: (index: number) => boolean
    getAd: (index: number) => Video
}

export interface RiyilsViewerProps {
    readonly videos: Video[]
    readonly initialIndex?: number
    readonly onClose: () => void
    readonly onVideoChange?: (index: number) => void
    readonly translations?: Partial<RiyilsTranslations>
    readonly progressBarColor?: string
    readonly enableAutoAdvance?: boolean
    readonly controls?: RiyilsViewerControl[]
    readonly adConfig?: AdConfig
}

export interface RiyilsViewerControlContext {
    currentIndex: number
    video: Video
    isMuted: boolean
    isPlaying: boolean
    togglePlay: () => void
    toggleMute: () => void
}

export interface RiyilsViewerControl {
    id: string
    icon: React.ReactNode
    ariaLabel: string
    onClick: (ctx: RiyilsViewerControlContext) => void
    visible?: boolean | ((ctx: RiyilsViewerControlContext) => boolean)
    active?: boolean | ((ctx: RiyilsViewerControlContext) => boolean)
    className?: string
}

const FEEDBACK_ANIMATION_MS = 250
const SCROLL_HINT_MS = 1000

type SeekFeedback = 'forward' | 'rewind' | null



function useLockBodyScroll(isPipActive: boolean): void {
    useEffect(() => {
        if (isPipActive) {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        } else {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [isPipActive]);
}

export type SlideHandlers = {
    registerVideo: (index: number) => (el: HTMLVideoElement | null) => void
    onZoneClick: (zone: GestureZone, e: React.MouseEvent | React.TouchEvent) => void
    onStartSpeed: () => void
    onStopSpeed: () => void
    onTimeUpdate: (e: Event) => void
    onEnded: () => void
    onError: () => void
    onRetry: (e: React.MouseEvent | React.TouchEvent) => void
    onContextMenu: (e: React.SyntheticEvent) => boolean
    onPipChange: (active: boolean) => void
}

function RiyilsViewerInner({
    videos,
    initialIndex = 0,
    onClose,
    onVideoChange,
    translations = {},
    progressBarColor = '#fff',
    enableAutoAdvance = false,
    controls,
    adConfig,
}: RiyilsViewerProps) {
    const observer = useRiyilsObserver('viewer')
    const t = useMemo(() => ({ ...defaultRiyilsTranslations, ...translations }), [translations])

    const finalVideos = useMemo(() => {
        if (!adConfig) return videos
        const result: Video[] = []
        let originalIndex = 0

        for (const video of videos) {
            result.push(video)
            originalIndex++

            let shouldInject = false
            if (adConfig.shouldInject) {
                shouldInject = adConfig.shouldInject(originalIndex)
            } else if (adConfig.interval && adConfig.interval > 0) {
                shouldInject = originalIndex % adConfig.interval === 0
            }

            if (shouldInject) {
                const ad = adConfig.getAd(originalIndex)
                result.push(ad)
            }
        }
        return result
    }, [videos, adConfig])

    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [seekFeedback, setSeekFeedback] = useState<SeekFeedback>(null)
    const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false)
    const [showScrollHint, setShowScrollHint] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)
    const [isPipActive, setIsPipActive] = useState(false);
    useLockBodyScroll(isPipActive)

    const swiperRef = useRef<SwiperType | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const progressBarRef = useRef<ProgressBarRef>(null)

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(globalThis.window !== undefined && globalThis.window.innerWidth >= 768)
        checkDesktop()
        globalThis.window.addEventListener('resize', checkDesktop)
        return () => globalThis.window.removeEventListener('resize', checkDesktop)
    }, [])

    useIosAutoplayUnlock(containerRef)

    const registry = useVideoRegistry()

    const getVideoEl = useCallback((index: number) => registry.get(index), [registry])
    const getActiveId = useCallback(() => finalVideos[currentIndex]?.id, [finalVideos, currentIndex])

    const { preloadAround } = useRiyilsPreload(finalVideos, currentIndex, initialIndex)

    const { playbackState, playbackHandlers } = useRiyilsPlayback(
        getVideoEl,
        getActiveId,
        currentIndex,
        enableAutoAdvance,
        observer
    )

    usePageLifecycleGuard({
        getActiveId,
        onReset: playbackHandlers.onError,
        onRetry: playbackHandlers.onRetry,
    })

    const defaultControls = useMemo<RiyilsViewerControl[]>(() => [
        {
            id: 'pip',
            icon: isPipActive ? <Maximize2 size={24} /> : <Minimize2 size={24} />,
            ariaLabel: isPipActive ? 'Expand' : 'Minimize',
            onClick: () => { void togglePip(); },
            visible: true,
            className: 'react-riyils-viewer__btn-pip',
        },
        {
            id: 'mute',
            icon: playbackState.isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />,
            ariaLabel: playbackState.isMuted ? t.unmute : t.mute,
            onClick: ({ toggleMute }) => toggleMute(),
            active: ({ isMuted }) => !isMuted,
            className: 'react-riyils-viewer__btn-mute',
        },
    ], [playbackState.isMuted, t, isPipActive])

    const mergedControls = useMemo<RiyilsViewerControl[]>(() => {
        if (!controls || controls.length === 0) return defaultControls
        return [...defaultControls, ...controls]
    }, [defaultControls, controls])

    const showPlayPauseOnce = useCallback(() => {
        setShowPlayPauseIcon(true)
        globalThis.window.setTimeout(() => setShowPlayPauseIcon(false), FEEDBACK_ANIMATION_MS)
    }, [])

    const togglePlay = useCallback(() => {
        if (playbackState.hasError) return
        triggerHaptic()
        playbackHandlers.togglePlay()
        showPlayPauseOnce()
    }, [playbackHandlers, playbackState.hasError, showPlayPauseOnce])

    const togglePip = useCallback(async () => {
        setIsPipActive(prev => !prev)
    }, []);

    const handleGestureIntent = useCallback(
        (intent: GestureIntent) => {
            if (intent.type === 'seek') {
                triggerHaptic()
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
                triggerHaptic()
                if (!playbackState.hasError) playbackHandlers.setSpeedUp(true)
                return
            }
            if (intent.type === 'speed-stop') {
                playbackHandlers.setSpeedUp(false)
            }
        },
        [playbackHandlers, playbackState.hasError, togglePlay]
    )

    const { onZoneClick, onStartSpeed, onStopSpeed } = useRiyilsGestures(handleGestureIntent, playbackState.hasError)

    useRiyilsKeyboard(onClose, togglePlay, playbackHandlers.toggleMute)

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

    const handleTimeUpdate = useCallback((e: Event) => {
        const v = e.target as HTMLVideoElement
        if (v.duration > 0) progressBarRef.current?.update((v.currentTime / v.duration) * 100, v.currentTime, v.duration)
    }, [])

    const handleProgressBarSeek = useCallback(
        (percent: number) => {
            const v = getVideoEl(currentIndex)
            if (!v || !Number.isFinite(v.duration)) return

            const targetTime = (percent / 100) * v.duration
            const delta = targetTime - v.currentTime

            playbackHandlers.seek(delta, 'gesture')
        },
        [currentIndex, getVideoEl, playbackHandlers]
    )

    const handleSlideChange = useMemo(() => throttle((s: SwiperType) => {
        const nextIndex = s.activeIndex
        setCurrentIndex(nextIndex)

        registry.stopAllExcept(nextIndex)

        preloadAround(nextIndex)
        onVideoChange?.(nextIndex)
    }, 100), [onVideoChange, preloadAround, registry, finalVideos])

    const stateRef = useRef({
        currentIndex,
        videos: finalVideos,
        enableAutoAdvance,
        playbackHandlers,
        registry,
    })

    useEffect(() => {
        stateRef.current = {
            currentIndex,
            videos: finalVideos,
            enableAutoAdvance,
            playbackHandlers,
            registry,
        }
    })

    const handlers: SlideHandlers = useMemo(
        () => ({
            registerVideo: (index: number) => (el: HTMLVideoElement | null) => {
                stateRef.current.registry.register(index)(el)
            },
            onZoneClick,
            onStartSpeed,
            onStopSpeed,
            onPipChange: (active: boolean) => setIsPipActive(active),
            onTimeUpdate: handleTimeUpdate,
            onEnded: () => {
                const { enableAutoAdvance, currentIndex, playbackHandlers, registry } = stateRef.current
                const v = registry.get(currentIndex)
                if (!v) return
                if (v.duration > 0 && v.currentTime < v.duration - 0.2) return
                playbackHandlers.onEnded()
                if (!enableAutoAdvance) return
                const swiper = swiperRef.current
                if (!swiper || swiper.isEnd) return
                swiper.slideNext()
            },
            onError: () => stateRef.current.playbackHandlers.onError(),
            onRetry: (e) => {
                e.stopPropagation()
                stateRef.current.playbackHandlers.onRetry()
            },
            onContextMenu: (e) => {
                e.preventDefault()
                e.stopPropagation()
                return false
            },
        }),
        [handleTimeUpdate, onStartSpeed, onStopSpeed, onZoneClick, setIsPipActive]
    )

    const activeAriaLabel = useMemo(() => {
        const v = finalVideos[currentIndex]
        const id = v?.id ?? ''
        const caption = v?.caption ? `. ${v.caption}` : ''
        return `${t.videoPlayer} - ${id}${caption}`
    }, [currentIndex, finalVideos, t.videoPlayer])

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
        <div ref={containerRef} className={`react-riyils-viewer ${isPipActive ? 'is-pip-hidden' : ''}`}>
            <div className="react-riyils-viewer__gradient-top" />
            <ProgressBar
                ref={progressBarRef}
                color={progressBarColor}
                onSeek={handleProgressBarSeek}
                videoUrl={finalVideos[currentIndex]?.videoUrl}
                videoId={finalVideos[currentIndex]?.id}
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
                effect="slide"
                initialSlide={initialIndex}
                onSwiper={(s) => {
                    swiperRef.current = s
                }}
                onSlideChange={handleSlideChange}
                speed={400}
                threshold={5}
                resistance={true}
                resistanceRatio={0.85}
                touchRatio={1}
                followFinger={true}
                shortSwipes={true}
                longSwipes={true}
                longSwipesRatio={0.1}
                longSwipesMs={300}
                observer={true}
                observeParents={true}
                mousewheel={{
                    enabled: true,
                    eventsTarget: '.react-riyils-viewer',
                    thresholdDelta: 15,
                    forceToAxis: true,
                }}
                virtual={{ enabled: true, addSlidesBefore: 1, addSlidesAfter: 1 }}
                style={{ height: '100%', width: '100%' }}
            >
                {finalVideos.map((video, index) => (
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

            {isDesktop && (
                <div className="react-riyils-viewer__nav-container">
                    <button
                        type="button"
                        className="react-riyils-viewer__btn react-riyils-viewer__btn-nav"
                        onClick={(e) => {
                            e.stopPropagation()
                            swiperRef.current?.slidePrev()
                        }}
                        aria-label="Previous video"
                    >
                        <ChevronUp size={24} strokeWidth={3} />
                    </button>

                    <button
                        type="button"
                        className="react-riyils-viewer__btn react-riyils-viewer__btn-nav"
                        onClick={(e) => {
                            e.stopPropagation()
                            swiperRef.current?.slideNext()
                        }}
                        aria-label="Next video"
                    >
                        <ChevronDown size={24} strokeWidth={3} />
                    </button>
                </div>
            )}

            <div className="react-riyils-viewer__gradient-bottom">
                <div className="react-riyils-viewer__controls-row">
                    {mergedControls
                        .filter((c) => {
                            if (typeof c.visible === 'function') return c.visible({
                                currentIndex,
                                video: finalVideos[currentIndex],
                                isMuted: playbackState.isMuted,
                                isPlaying: playbackState.isPlaying,
                                togglePlay,
                                toggleMute: playbackHandlers.toggleMute
                            })
                            return c.visible ?? true
                        })
                        .map((c) => {
                            const ctx: RiyilsViewerControlContext = {
                                currentIndex,
                                video: finalVideos[currentIndex],
                                isMuted: playbackState.isMuted,
                                isPlaying: playbackState.isPlaying,
                                togglePlay,
                                toggleMute: playbackHandlers.toggleMute
                            }
                            const isActive = typeof c.active === 'function' ? c.active(ctx) : (c.active ?? false)

                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`react-riyils-viewer__btn ${c.className ?? ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        c.onClick(ctx)
                                    }}
                                    aria-label={c.ariaLabel}
                                    aria-pressed={isActive}
                                    style={isActive ? { background: 'rgba(255, 255, 255, 0.9)', color: '#000' } : undefined}
                                >
                                    {c.icon}
                                </button>
                            )
                        })}
                </div>
            </div>

            {isPipActive && (
                createPortal(
                    <MiniPlayer
                        videoEl={getVideoEl(currentIndex)!}
                        onClose={() => {
                            setIsPipActive(false)
                            onClose()
                        }}
                        onMaximize={() => setIsPipActive(false)}
                    />,
                    document.body
                )
            )}

        </div>
    )
}

function RiyilsViewer(props: RiyilsViewerProps) {
    if (typeof document === 'undefined') return null
    return createPortal(<RiyilsViewerInner {...props} />, document.body)
}

export { RiyilsViewer, RiyilsViewerInner }
