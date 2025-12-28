import React, { useImperativeHandle, forwardRef, useRef, useCallback, useMemo } from 'react'
import { useVideoSource, type VideoQualityVariants } from '../use-video-source'
import { throttle } from '../utils'

export interface ProgressBarRef {
    update: (percent: number, force?: boolean) => void
}

interface ProgressBarProps {
    color?: string
    onSeek?: (percent: number) => void
    videoUrl?: string | VideoQualityVariants
    videoId?: string
}

export const ProgressBar = forwardRef<ProgressBarRef, ProgressBarProps>(({ color = '#fff', onSeek, videoUrl, videoId }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const previewContainerRef = useRef<HTMLDivElement>(null)
    const previewVideoRef = useRef<HTMLVideoElement>(null)
    const previewTimeRef = useRef<HTMLDivElement>(null)

    useVideoSource(previewVideoRef, 'viewer', `preview-${videoId || 'unknown'}`, videoUrl, true)

    useImperativeHandle(ref, () => ({
        update: (percent: number, force = false) => {
            const el = inputRef.current
            if (!el) return
            const val = percent.toString()
            if (el.value !== val) el.value = val
            el.style.setProperty('--progress-width', `${percent}%`)
        },
    }))

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLFieldSetElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
        const percent = (x / rect.width) * 100

        if (previewContainerRef.current) {
            previewContainerRef.current.style.display = 'flex'
            previewContainerRef.current.style.transform = `translateX(${x}px) translateX(-50%)`
        }

        const v = previewVideoRef.current
        if (v && Number.isFinite(v.duration)) {
            const time = (percent / 100) * v.duration
            if (Math.abs(v.currentTime - time) > 0.5) {
                const vid = v as any
                if (vid.fastSeek) {
                    vid.fastSeek(time)
                } else {
                    v.currentTime = time
                }
                if (previewTimeRef.current) {
                    previewTimeRef.current.textContent = formatTime(time)
                }
            }
        }
    }, [])

    const handleMouseLeave = useCallback(() => {
        if (previewContainerRef.current) {
            previewContainerRef.current.style.display = 'none'
        }
    }, [])

    const throttledSeek = useMemo(() => throttle((val: number) => {
        if (onSeek) onSeek(val)
    }, 50), [onSeek])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseFloat(e.target.value)
        const el = inputRef.current
        if (el) {
            el.style.setProperty('--progress-width', `${value}%`)
        }
        throttledSeek(value)
    }, [throttledSeek])

    return (
        <fieldset
            className="react-riyils-viewer__progress-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            aria-label="Video progress control"
            style={{
                border: 'none',
                padding: 0,
                margin: 0,
                minWidth: 0
            }}
        >
            <div
                ref={previewContainerRef}
                className="react-riyils-viewer__progress-preview"
                style={{ display: 'none', left: 0, transform: 'translateX(-50%)' }}
            >
                <video
                    ref={previewVideoRef}
                    className="react-riyils-viewer__preview-video"
                    muted
                    playsInline
                    preload="metadata"
                />
                <div ref={previewTimeRef} className="react-riyils-viewer__preview-time">
                    0:00
                </div>
            </div>
            <input
                ref={inputRef}
                type="range"
                min="0"
                max="100"
                step="0.1"
                defaultValue="0"
                onChange={handleChange}
                className="react-riyils-viewer__progress-input"
                aria-label="Video progress"
                style={{
                    '--progress-width': '0%',
                    '--progress-color': color
                } as React.CSSProperties}
            />
        </fieldset>
    )
})

ProgressBar.displayName = 'ProgressBar'
