

const CACHE_NAME = 'riyils-media-v1'


function isMobile(): boolean {
    if (typeof navigator === 'undefined') return false
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export async function cacheVideo(url: string): Promise<void> {
    const nav = navigator as any
    if (nav.connection?.saveData) return
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return

    try {
        const cache = await caches.open(CACHE_NAME)
        const match = await cache.match(url)
        if (match) return

        const response = await fetch(url, { mode: 'cors' })
        if (response.ok) {
            await cache.put(url, response)
            void cleanupCache()
        }
    } catch { }
}

export async function getCachedVideoUrl(url: string): Promise<string | null> {
    const nav = navigator as any
    if (nav.connection?.saveData) return null
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return null

    try {
        const cache = await caches.open(CACHE_NAME)
        const response = await cache.match(url)
        if (response) {
            const blob = await response.blob()
            if (!blob.type || blob.type === 'application/octet-stream') {
                const newBlob = blob.slice(0, blob.size, 'video/mp4')
                return URL.createObjectURL(newBlob)
            }
            return URL.createObjectURL(blob)
        }
    } catch { }
    return null
}

export async function cleanupCache(): Promise<void> {
    try {
        const cache = await caches.open(CACHE_NAME)
        const keys = await cache.keys()
        const limit = isMobile() ? 10 : 50
        if (keys.length > limit) {
            for (let i = 0; i < keys.length - limit; i++) {
                await cache.delete(keys[i])
            }
        }
    } catch { }
}
