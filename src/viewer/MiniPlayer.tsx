import React, { useEffect, useRef, useState } from 'react'
import { X, Maximize2 } from 'lucide-react'

type MiniPlayerProps = {
    videoEl: HTMLVideoElement
    onClose: () => void
    onMaximize: () => void
}

export function MiniPlayer({ videoEl, onClose, onMaximize }: Readonly<MiniPlayerProps>) {
    const rootRef = useRef<HTMLDialogElement>(null)
    const videoHostRef = useRef<HTMLDivElement>(null)

    const [pos, setPos] = useState({ x: 0, y: 0 })
    const dragStart = useRef<{ x: number; y: number } | null>(null)
    const initialPos = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const host = videoHostRef.current
        if (!host) return

        const originalParent = videoEl.parentElement

        const origWidth = videoEl.style.width
        const origHeight = videoEl.style.height
        const origObjectFit = videoEl.style.objectFit
        const origDisplay = videoEl.style.display
        const origPointerEvents = videoEl.style.pointerEvents

        videoEl.dataset.pip = 'true'

        host.replaceChildren(videoEl)

        videoEl.muted = false
        videoEl.controls = false
        videoEl.style.width = '100%'
        videoEl.style.height = '100%'
        videoEl.style.objectFit = 'contain'
        videoEl.style.display = 'block'
        videoEl.style.pointerEvents = 'none'

        videoEl.play().catch(() => { })

        return () => {
            delete videoEl.dataset.pip

            videoEl.style.width = origWidth
            videoEl.style.height = origHeight
            videoEl.style.objectFit = origObjectFit
            videoEl.style.display = origDisplay
            videoEl.style.pointerEvents = origPointerEvents

            if (host.contains(videoEl) && originalParent) {
                originalParent.appendChild(videoEl)
            }
        }
    }, [videoEl])

    const onDown = (e: React.PointerEvent) => {
        if (!rootRef.current) return
        e.preventDefault()
        dragStart.current = { x: e.clientX, y: e.clientY }
        initialPos.current = { ...pos }
        rootRef.current.setPointerCapture(e.pointerId)
        rootRef.current.style.transition = 'none'
    }

    const onMove = (e: React.PointerEvent) => {
        if (!dragStart.current || !rootRef.current) return

        const dx = e.clientX - dragStart.current.x
        const dy = e.clientY - dragStart.current.y

        setPos({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy
        })
    }

    const onUp = (e: React.PointerEvent) => {
        dragStart.current = null
        if (rootRef.current) {
            rootRef.current.releasePointerCapture(e.pointerId)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onMaximize()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
        }
    }

    return (
        <dialog
            ref={rootRef}
            className="react-riyils-mini-player"
            style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label="Mini Player"
            tabIndex={0}
            open
            onKeyDown={handleKeyDown}
        >
            <div ref={videoHostRef} className="react-riyils-mini-player__host" />

            <div className="react-riyils-mini-player__overlay">
                <button
                    type="button"
                    className="react-riyils-mini-player__button"
                    aria-label="Maximize"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation()
                        onMaximize()
                    }}
                >
                    <Maximize2 size={14} />
                </button>
                <button
                    type="button"
                    className="react-riyils-mini-player__button"
                    aria-label="Close"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                >
                    <X size={14} />
                </button>
            </div>
        </dialog>
    )
}
