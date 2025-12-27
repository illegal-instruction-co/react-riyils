import React, { memo } from 'react'
import { Play, AlertCircle, RotateCcw } from 'lucide-react'
import type { ReactRiyilsTranslations } from '../index'
import { useRiyilsObserver } from '../observe/useRiyilsObserver'

type Observer = ReturnType<typeof useRiyilsObserver>

interface CarouselSlideProps {
    active: boolean
    hasError: boolean
    t: ReactRiyilsTranslations
    onClick: () => void
    onRetry: () => void
    observer: Observer
    videoId: string
    children: React.ReactNode
}

export const CarouselSlide = memo(function CarouselSlide({
    active,
    hasError,
    t,
    onClick,
    onRetry,
    observer,
    videoId,
    children,
}: Readonly<CarouselSlideProps>) {
    const disabled = active && hasError

    return (
        <button
            type="button"
            className="react-riyils__slide-button"
            onClick={() => {
                if (disabled) return
                observer.play(videoId, 'user')
                onClick()
            }}
            disabled={disabled}
            aria-label={active ? t.slideActiveAriaLabel : t.slideInactiveAriaLabel}
        >
            <div className={`react-riyils__card ${active ? 'active' : ''}`}>
                {active && hasError ? (
                    <div className="react-riyils__error-container">
                        <AlertCircle size={32} />
                        <button
                            type="button"
                            className="react-riyils__retry-button"
                            onClick={(e) => {
                                e.stopPropagation()
                                observer.retry(videoId)
                                onRetry()
                            }}
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                ) : (
                    children
                )}

                {active && !hasError && (
                    <div className="react-riyils__cta-container">
                        <span className="react-riyils__cta-button">
                            <Play size={14} fill="currentColor" />
                            {t.ctaButton}
                        </span>
                    </div>
                )}
            </div>
        </button>
    )
})