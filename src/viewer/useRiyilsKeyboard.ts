import { useEffect } from 'react'

function isTextInput(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    )
}

export function useRiyilsKeyboard(
    onClose: () => void,
    onTogglePlay: () => void,
    onToggleMute: () => void
) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isTextInput(e.target)) return

            if (e.code === 'Escape') {
                e.preventDefault()
                onClose()
            }

            if (e.code === 'Space') {
                e.preventDefault()
                onTogglePlay()
            }

            if (e.code === 'KeyM') {
                e.preventDefault()
                onToggleMute()
            }
        }

        globalThis.window.addEventListener('keydown', onKey)
        return () => globalThis.window.removeEventListener('keydown', onKey)
    }, [onClose, onToggleMute, onTogglePlay])
}
