import { useEffect, useRef } from 'react'

import { isIosSafari } from '../utils'

let unlocked = false

export function useIosAutoplayUnlock(containerRef: React.RefObject<HTMLElement | null>) {
    const armedRef = useRef(false)

    useEffect(() => {
        if (unlocked || !isIosSafari() || !containerRef.current) return

        const el = containerRef.current

        const unlock = () => {
            if (unlocked) return
            unlocked = true
            armedRef.current = false

            const audio = new Audio()
            audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAgZGF0YQQAAAAAAA=='
            audio.play().catch(() => { })

            cleanup()
        }

        const cleanup = () => {
            el.removeEventListener('touchstart', unlock, true)
            el.removeEventListener('click', unlock, true)
        }

        if (!armedRef.current) {
            armedRef.current = true
            el.addEventListener('touchstart', unlock, { passive: true, capture: true })
            el.addEventListener('click', unlock, { capture: true })
        }

        return cleanup
    }, [containerRef])
}

export function isIosAutoplayUnlocked(): boolean {
    return unlocked
}