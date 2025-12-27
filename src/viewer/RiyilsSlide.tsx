import React, { useEffect, useState } from 'react'
import {
    AlertCircle,
    ChevronsLeft,
    ChevronsRight,
    Pause,
    Play,
    RotateCcw,
    Zap,
} from 'lucide-react'
import { VideoEl } from './VideoEl'
import { type Video, type RiyilsTranslations, type SlideHandlers } from './RiyilsViewer'
import { type PlaybackState } from './useRiyilsPlayback'
import { triggerHaptic } from '../utils'

export type SlideUIState = {
    currentIndex: number
    seekFeedback: 'forward' | 'rewind' | null
    showPlayPauseIcon: boolean
    showScrollHint: boolean
}

function shouldKeepMounted(index: number, activeIndex: number): boolean {
    return index === activeIndex || index === activeIndex - 1 || index === activeIndex + 1
}

export const RiyilsSlide = React.memo(function RiyilsSlide({
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
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false)

    useEffect(() => {
        if (!active) {
            setIsCaptionExpanded(false)
        }
    }, [active])

    useEffect(() => {
        const el = document.querySelector('.react-riyils-viewer__gesture-zone.pressed')
        el?.classList.remove('pressed')
    }, [ui.currentIndex])

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

            <fieldset className="react-riyils-viewer__gesture-overlay" onContextMenu={handlers.onContextMenu} tabIndex={-1}>
                <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone left"
                    onClick={(e) => handlers.onZoneClick('left', e)}
                    onTouchStart={(e) => {
                        if (playback.hasError) return
                        e.currentTarget.classList.add('pressed')
                    }}
                    onTouchEnd={(e) => e.currentTarget.classList.remove('pressed')}
                    onTouchCancel={(e) => e.currentTarget.classList.remove('pressed')}
                    onMouseDown={(e) => e.currentTarget.classList.add('pressed')}
                    onMouseUp={(e) => e.currentTarget.classList.remove('pressed')}
                    onMouseLeave={(e) => e.currentTarget.classList.remove('pressed')}
                    aria-label={t.rewind}
                    disabled={playback.hasError}
                />

                <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone center"
                    onClick={(e) => handlers.onZoneClick('center', e)}
                    onTouchStart={(e) => {
                        if (playback.hasError) return
                        e.currentTarget.classList.add('pressed')
                    }}
                    onTouchEnd={(e) => e.currentTarget.classList.remove('pressed')}
                    onTouchCancel={(e) => e.currentTarget.classList.remove('pressed')}
                    onMouseDown={(e) => e.currentTarget.classList.add('pressed')}
                    onMouseUp={(e) => e.currentTarget.classList.remove('pressed')}
                    onMouseLeave={(e) => e.currentTarget.classList.remove('pressed')}
                    aria-label={playback.isPlaying ? t.pause : t.play}
                    disabled={playback.hasError}
                />

                <button
                    type="button"
                    className="react-riyils-viewer__gesture-zone right"
                    onClick={(e) => handlers.onZoneClick('right', e)}
                    onTouchStart={(e) => {
                        if (playback.hasError) return
                        e.currentTarget.classList.add('pressed')
                        handlers.onStartSpeed()
                    }}
                    onTouchEnd={(e) => {
                        e.currentTarget.classList.remove('pressed')
                        handlers.onStopSpeed()
                    }}
                    onTouchCancel={(e) => {
                        e.currentTarget.classList.remove('pressed')
                        handlers.onStopSpeed()
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.classList.add('pressed')
                        handlers.onStartSpeed()
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.classList.remove('pressed')
                        handlers.onStopSpeed()
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.classList.remove('pressed')
                        handlers.onStopSpeed()
                    }}
                    aria-label={t.forward}
                    disabled={playback.hasError}
                />
            </fieldset>

            {active && !playback.hasError && (
                <>
                    <div className={`react-riyils-viewer__feedback-speed ${playback.isSpeedUp ? 'visible' : ''}`}>
                        <Zap size={16} fill="currentColor" />
                        <span>{t.speedIndicator}</span>
                    </div>

                    <div
                        className={`react-riyils-viewer__play-indicator ${playback.isPlaying ? 'hidden' : 'visible'
                            }`}
                    >
                        <div className="react-riyils-viewer__feedback-icon">
                            <Play size={32} fill="white" />
                        </div>
                    </div>

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

            {active && video.caption && (
                <div className="react-riyils-viewer__caption-container">
                    <button
                        type="button"
                        className={`react-riyils-viewer__caption-sheet ${isCaptionExpanded ? 'is-expanded' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsCaptionExpanded(!isCaptionExpanded)
                            triggerHaptic()
                        }}
                        aria-expanded={isCaptionExpanded}
                        aria-label={isCaptionExpanded ? 'Collapse caption' : 'Expand caption'}
                    >
                        <div className="react-riyils-viewer__caption-handle">
                            <div className="react-riyils-viewer__caption-handle-bar" />
                        </div>
                        <div className="react-riyils-viewer__caption-content">
                            <span className="react-riyils-viewer__caption-text">
                                {video.caption}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            <VideoEl
                key={`${video.id}-${index}-${playback.retryCount}`}
                video={video}
                index={index}
                active={active}
                activeIndex={ui.currentIndex}
                shouldLoad={mounted}
                playback={playback}
                activeAriaLabel={active ? activeAriaLabel : undefined}
                handlers={handlers}
            />
        </>
    )
})
