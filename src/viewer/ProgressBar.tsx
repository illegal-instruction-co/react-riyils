import React, { useImperativeHandle, forwardRef, useRef, useCallback, useState, useMemo } from 'react'
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
    const previewVideoRef = useRef<HTMLVideoElement>(null)
    const [hoverPercent, setHoverPercent] = useState<number | null>(null)
    const [hoverPos, setHoverPos] = useState<number>(0)
    const [previewTime, setPreviewTime] = useState<string>('00:00')

    useVideoSource(previewVideoRef, 'viewer', `preview-${videoId || 'unknown'}`, videoUrl, hoverPercent !== null)

    useImperativeHandle(ref, () => ({
        update: (percent: number, force = false) => {
            const el = inputRef.current
            if (!el) return
            el.value = percent.toString()
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
        setHoverPercent(percent)
        setHoverPos(x)

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
                setPreviewTime(formatTime(time))
            }
        }
    }, [])


    const handleMouseLeave = useCallback(() => {
        setHoverPercent(null)
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
            {hoverPercent !== null && (
                <div
                    className="react-riyils-viewer__progress-preview"
                    style={{ left: hoverPos }}
                >
                    <video
                        ref={previewVideoRef}
                        className="react-riyils-viewer__preview-video"
                        muted
                        playsInline
                        preload="metadata"
                    />
                    <div className="react-riyils-viewer__preview-time">
                        {previewTime}
                    </div>
                </div>
            )}
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
