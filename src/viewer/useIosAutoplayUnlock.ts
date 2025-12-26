import { useEffect, useRef } from 'react'

let unlocked = false

function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
    return isIOS && isSafari
}

export function useIosAutoplayUnlock(containerRef: React.RefObject<HTMLElement | null>) {
    const armedRef = useRef(false)

    useEffect(() => {
        if (unlocked || !isIosSafari() || !containerRef.current) return

        const el = containerRef.current

        const unlock = () => {
            if (unlocked) return
            unlocked = true
            armedRef.current = false
            cleanup()
        }

        const cleanup = () => {
            el.removeEventListener('touchstart', unlock)
            el.removeEventListener('mousedown', unlock)
            el.removeEventListener('click', unlock)
        }

        if (!armedRef.current) {
            armedRef.current = true
            el.addEventListener('touchstart', unlock, { passive: true })
            el.addEventListener('mousedown', unlock)
            el.addEventListener('click', unlock)
        }

        return cleanup
    }, [containerRef])
}

export function isIosAutoplayUnlocked(): boolean {
    return unlocked
}
