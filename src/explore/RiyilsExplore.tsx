import React, { useState, useMemo, useRef, useEffect } from 'react'
import { RiyilsViewer, type Video, type RiyilsViewerProps } from '../viewer/RiyilsViewer'
import './explore.css'

export interface ExploreItem {
    id: string
    thumbnailUrl?: string
    videoUrl?: string
    videos: Video[]
}

export interface RiyilsExploreProps {
    readonly items: readonly ExploreItem[]
    readonly viewerProps?: Omit<RiyilsViewerProps, 'videos' | 'onClose'>
    readonly onItemClick?: (item: ExploreItem) => void
}

function ExploreTile({
    item,
    shouldAutoPlay,
    onClick,
}: Readonly<{
    item: ExploreItem
    shouldAutoPlay: boolean
    onClick: () => void
}>) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    const isPlaying = shouldAutoPlay || isHovered

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            const p = video.play()
            if (p !== undefined) {
                p.catch(() => { })
            }
        } else {
            video.pause()
        }
    }, [isPlaying])

    const videoSrc = item.videoUrl || (typeof item.videos[0]?.videoUrl === 'string' ? item.videos[0].videoUrl : undefined)

    const renderContent = () => {
        if (videoSrc) {
            return (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    poster={item.thumbnailUrl}
                    preload="metadata"
                    muted
                    playsInline
                    loop
                    style={{ pointerEvents: 'none', objectFit: 'cover', width: '100%', height: '100%' }}
                    aria-hidden="true"
                    tabIndex={-1}
                />
            )
        }
        if (item.thumbnailUrl) {
            return <img src={item.thumbnailUrl} alt="" loading="lazy" />
        }
        return null
    }

    return (
        <button
            type="button"
            className="riyils-explore-item"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="View explore item"
        >
            {renderContent()}
        </button>
    )
}

export function RiyilsExplore({ items, viewerProps, onItemClick }: RiyilsExploreProps) {
    const [activeItem, setActiveItem] = useState<ExploreItem | null>(null)

    const autoPlayIndices = useMemo(() => {
        const indices = new Set<number>()
        const count = items.length
        const numToPlay = Math.max(1, Math.floor(count * 0.2))

        while (indices.size < numToPlay) {
            indices.add(Math.floor(Math.random() * count))
        }
        return indices
    }, [items.length])

    const handleItemClick = (item: ExploreItem) => {
        setActiveItem(item)
        onItemClick?.(item)
    }

    return (
        <>
            <div className="riyils-explore-grid">
                {items.map((item, index) => (
                    <ExploreTile
                        key={item.id}
                        item={item}
                        shouldAutoPlay={autoPlayIndices.has(index)}
                        onClick={() => handleItemClick(item)}
                    />
                ))}
            </div>

            {activeItem && (
                <RiyilsViewer
                    videos={activeItem.videos}
                    onClose={() => setActiveItem(null)}
                    initialIndex={0}
                    enableAutoAdvance
                    {...viewerProps}
                />
            )}
        </>
    )
}
