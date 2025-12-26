import React, { useImperativeHandle, forwardRef, useState, useCallback } from 'react';

export interface ProgressBarRef {
    update: (percent: number) => void;
}

interface ProgressBarProps {
    color?: string;
    onSeek?: (percent: number) => void;
}

export const ProgressBar = forwardRef<ProgressBarRef, ProgressBarProps>(({ color = '#fff', onSeek }, ref) => {
    const [progress, setProgress] = useState(0);

    useImperativeHandle(ref, () => ({
        update: (percent: number) => {
            setProgress(percent);
        },
    }));

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseFloat(e.target.value);
        setProgress(value);
        if (onSeek) onSeek(value);
    }, [onSeek]);

    return (
        <div className="react-riyils-viewer__progress-container">
            <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleChange}
                className="react-riyils-viewer__progress-input"
                aria-label="Video progress"
                style={{
                    '--progress-width': `${progress}%`,
                    '--progress-color': color
                } as React.CSSProperties}
            />
        </div>
    );
});

ProgressBar.displayName = 'ProgressBar';