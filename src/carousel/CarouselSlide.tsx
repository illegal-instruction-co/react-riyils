import React from 'react'
import { Play, AlertCircle, RotateCcw } from 'lucide-react'
import type { ReactRiyilsTranslations } from '../index'

interface CarouselSlideProps {
    registerRef: (el: HTMLVideoElement | null) => void
    active: boolean
    shouldLoad: boolean
    hasError: boolean
    t: ReactRiyilsTranslations
    onClick: () => void
    onRetry: () => void
    onError: () => void
}

export function CarouselSlide({
    registerRef,
    active,
    shouldLoad,
    hasError,
    t,
    onClick,
    onRetry,
    onError,
}: Readonly<CarouselSlideProps>) {
    const disabled = active && hasError

    return (
        <button
            type="button"
            className="react-riyils__slide-button"
            onClick={onClick}
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
                                onRetry()
                            }}
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                ) : (
                    <video
                        ref={registerRef}
                        muted
                        playsInline
                        preload={shouldLoad ? 'auto' : 'metadata'}
                        className="react-riyils__video"
                        onError={onError}
                    />
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
}
