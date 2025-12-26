import React, { useImperativeHandle, useRef, forwardRef } from 'react';

export interface ProgressBarRef {
    update: (percent: number) => void;
}

interface ProgressBarProps {
    color?: string;
}

export const ProgressBar = forwardRef<ProgressBarRef, ProgressBarProps>(({ color = '#fff' }, ref) => {
    const fillRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        update: (percent: number) => {
            if (fillRef.current) {
                fillRef.current.style.width = `${percent}%`;
            }
        },
    }));

    return (
        <div className="react-riyils-viewer__progress-container">
            <div
                ref={fillRef}
                className="react-riyils-viewer__progress-fill"
                style={{ width: '0%', background: color, transition: 'width 0.1s linear' }}
            />
        </div>
    );
});

ProgressBar.displayName = 'ProgressBar';
