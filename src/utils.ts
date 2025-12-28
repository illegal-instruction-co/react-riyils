export function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) && !/MSStream/.test(ua)
}

let lastHaptic = 0
export function triggerHaptic() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        const now = Date.now()
        if (now - lastHaptic > 50) {
            navigator.vibrate(10)
            lastHaptic = now
        }
    }
}
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    return function (this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args)
            inThrottle = true
            globalThis.window.setTimeout(() => (inThrottle = false), limit)
        }
    }
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null
    return function (this: any, ...args: Parameters<T>) {
        if (timeout !== null) {
            globalThis.window.clearTimeout(timeout)
        }
        timeout = globalThis.window.setTimeout(() => {
            func.apply(this, args)
        }, wait)
    }
}
