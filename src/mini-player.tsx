import React, { useEffect, useRef, useState } from 'react'
import { X, Maximize2 } from 'lucide-react'

type MiniPlayerProps = {
    videoEl: HTMLVideoElement
    onClose: () => void
    onMaximize: () => void
}

export function MiniPlayer({ videoEl, onClose, onMaximize }: Readonly<MiniPlayerProps>) {
    const rootRef = useRef<HTMLDivElement>(null)
    const videoHostRef = useRef<HTMLDivElement>(null)

    const [pos, setPos] = useState({ x: -20, y: -80 })
    const dragStart = useRef<{ x: number; y: number } | null>(null)
    const initialPos = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const host = videoHostRef.current
        if (!host) return

        const originalParent = videoEl.parentElement

        videoEl.dataset.pip = 'true'

        host.replaceChildren(videoEl)

        videoEl.muted = false
        videoEl.controls = false
        videoEl.style.width = '100%'
        videoEl.style.height = '100%'
        videoEl.style.objectFit = 'cover'
        videoEl.style.display = 'block'

        videoEl.play().catch(() => { })

        return () => {
            delete videoEl.dataset.pip
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

    const style: React.CSSProperties = {
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        right: 'calc(20px + env(safe-area-inset-right))',
        width: '120px',
        height: '213px',
        zIndex: 99999,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        touchAction: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000',
        cursor: 'grab',
    }

    return (
        <div
            ref={rootRef}
            className="mini-player-overlay"
            style={style}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
        >
            <div ref={videoHostRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />

            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '4px',
                    gap: '4px',
                    pointerEvents: 'auto'
                }}
            >
                <button
                    type="button"
                    aria-label="Maximize"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation()
                        onMaximize()
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <Maximize2 size={14} />
                </button>
                <button
                    type="button"
                    aria-label="Close"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <X size={14} />
                </button>
            </div>

        </div>
    )
}
