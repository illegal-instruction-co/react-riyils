

const CACHE_NAME = 'riyils-media-v1'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function cacheVideo(url: string): Promise<void> {
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
        if (keys.length > 50) {
            for (let i = 0; i < keys.length - 50; i++) {
                await cache.delete(keys[i])
            }
        }
    } catch { }
}
