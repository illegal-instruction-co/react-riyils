import type { Video } from '../viewer/RiyilsViewer'

export interface ReactRiyilsTranslations {
    ctaButton: string
    carouselAriaLabel: string
    slideActiveAriaLabel: string
    slideInactiveAriaLabel: string
}

export const defaultReactRiyilsTranslations: ReactRiyilsTranslations = {
    ctaButton: 'Watch Full Video',
    carouselAriaLabel: 'Video stories',
    slideActiveAriaLabel: 'Watch full video',
    slideInactiveAriaLabel: 'Go to slide',
}

export interface RiyilsCarouselProps {
    readonly videos: Video[]
    readonly currentIndex?: number
    readonly onVideoClick: (index: number) => void
    readonly onVideoChange: (index: number) => void
    readonly translations?: Partial<ReactRiyilsTranslations>
    readonly enableAutoAdvance?: boolean
}
