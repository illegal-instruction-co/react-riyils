import { useEffect } from 'react'

function isTextInput(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    )
}

export function useRiyilsKeyboard(
    onClose: () => void,
    onTogglePlay: () => void,
    onToggleMute: () => void
) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.isComposing || e.defaultPrevented) return
            if (isTextInput(e.target)) return

            switch (e.code) {
                case 'Escape':
                    e.preventDefault()
                    onClose()
                    break
                case 'Space':
                case 'k':
                case 'K':
                    e.preventDefault()
                    onTogglePlay()
                    break
                case 'KeyM':
                    e.preventDefault()
                    onToggleMute()
                    break
            }
        }

        globalThis.window.addEventListener('keydown', onKey)
        return () => globalThis.window.removeEventListener('keydown', onKey)
    }, [onClose, onToggleMute, onTogglePlay])
}