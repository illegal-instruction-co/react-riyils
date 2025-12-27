import React, { useImperativeHandle, forwardRef, useRef, useCallback } from 'react'

export interface ProgressBarRef {
    update: (percent: number, force?: boolean) => void
}

interface ProgressBarProps {
    color?: string
    onSeek?: (percent: number) => void
}

export const ProgressBar = forwardRef<ProgressBarRef, ProgressBarProps>(({ color = '#fff', onSeek }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
        update: (percent: number, force = false) => {
            const el = inputRef.current
            if (!el) return

            if (force || document.activeElement !== el) {
                el.value = percent.toString()
                el.style.setProperty('--progress-width', `${percent}%`)
            }
        },
    }))

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseFloat(e.target.value)
        const el = inputRef.current
        if (el) {
            el.style.setProperty('--progress-width', `${value}%`)
        }
        if (onSeek) onSeek(value)
    }, [onSeek])

    return (
        <div className="react-riyils-viewer__progress-container">
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
        </div>
    )
})

ProgressBar.displayName = 'ProgressBar'