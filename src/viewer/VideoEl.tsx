import React, { useEffect, useRef, useState } from 'react'
import { useVideoSource } from '../use-video-source'
import { type PlaybackState } from './useRiyilsPlayback'
import { type SlideHandlers, type Video } from './RiyilsViewer'

export function VideoEl({
    video,
    index,
    active,
    activeIndex,
    shouldLoad,
    playback,
    activeAriaLabel,
    handlers,
}: Readonly<{
    video: Video
    index: number
    active: boolean
    activeIndex: number
    shouldLoad: boolean
    playback: PlaybackState
    activeAriaLabel?: string
    handlers: SlideHandlers
}>) {
    const containerRef = useRef<HTMLDivElement>(null)
    const className = `react-riyils-viewer__video ${active ? 'active' : 'react-riyils-viewer__video-buffer'}`
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const v = videoRef.current
        if (!v || active) return
        v.pause()
    }, [active])

    useEffect(() => {
        setIsReady(false)
    }, [video.id, activeIndex, index])

    useEffect(() => {
        const container = containerRef.current
        if (!container || !shouldLoad) return

        const videoEl = document.createElement('video')
        videoEl.className = className
        videoEl.setAttribute('playsinline', '')
        videoEl.setAttribute('webkit-playsinline', '')
        videoEl.dataset.riyilsIndex = String(index)
        videoEl.preload = 'metadata'

        if (video.thumbnailUrl) {
            videoEl.poster = video.thumbnailUrl
        }

        let mounted = true
        const markReady = () => {
            if (!mounted) return
            if (videoEl.readyState >= 2) {
                setIsReady(true)
            }
        }

        const markError = () => {
            if (!mounted) return
            setIsReady(false)
        }

        videoEl.addEventListener('loadeddata', markReady)
        videoEl.addEventListener('canplay', markReady)
        videoEl.addEventListener('error', markError)

        container.appendChild(videoEl)
        videoRef.current = videoEl
        markReady()

        return () => {
            mounted = false
            videoEl.removeEventListener('loadeddata', markReady)
            videoEl.removeEventListener('canplay', markReady)
            videoEl.removeEventListener('error', markError)
            try { videoEl.pause() } catch { }
            videoEl.removeAttribute('src')
            try { videoEl.load() } catch { }
            if (container.contains(videoEl)) {
                videoEl.remove()
            }
            videoRef.current = null
        }
    }, [video.id, className, shouldLoad, index, video.thumbnailUrl])

    useVideoSource(videoRef, 'viewer', video.id, video.videoUrl, shouldLoad)

    useEffect(() => {
        if (videoRef.current) {
            handlers.registerVideo(index)(videoRef.current)
        }
    }, [handlers, index])

    useEffect(() => {
        const v = videoRef.current
        if (!v || !active) return

        v.loop = !playback.enableAutoAdvance
        v.muted = playback.isMuted
        v.volume = playback.isMuted ? 0 : 1
        if (video.thumbnailUrl) v.poster = video.thumbnailUrl

        const onTimeUpdate = handlers.onTimeUpdate
        const onEnded = handlers.onEnded
        const onError = handlers.onError
        const handleEnterPip = () => handlers.onPipChange(true)
        const handleLeavePip = () => handlers.onPipChange(false)

        const onCtx = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
        }

        v.addEventListener('timeupdate', onTimeUpdate)
        v.addEventListener('ended', onEnded)
        v.addEventListener('error', onError)
        v.addEventListener('contextmenu', onCtx)
        v.addEventListener('enterpictureinpicture', handleEnterPip)
        v.addEventListener('leavepictureinpicture', handleLeavePip)

        return () => {
            v.removeEventListener('timeupdate', onTimeUpdate)
            v.removeEventListener('ended', onEnded)
            v.removeEventListener('error', onError)
            v.removeEventListener('contextmenu', onCtx)
            v.removeEventListener('enterpictureinpicture', handleEnterPip)
            v.removeEventListener('leavepictureinpicture', handleLeavePip)
        }
    }, [active, handlers, playback.enableAutoAdvance, playback.isMuted, video.thumbnailUrl])

    const v = videoRef.current
    const showLoading = active && !playback.hasError && (!v || v.readyState < 2 || !isReady)

    return (
        <div className="react-riyils-viewer__video-wrapper">
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%' }}
                aria-label={active ? activeAriaLabel : undefined}
                aria-hidden={!active}
            />
            {showLoading && (
                <div className="react-riyils-viewer__loading">
                    <div className="react-riyils-viewer__spinner" />
                </div>
            )}
        </div>
    )
}
