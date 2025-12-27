import { useEffect, useMemo, type RefObject } from 'react'
import Hls, { type HlsConfig } from 'hls.js'

export interface VideoQualityVariants {
    low?: string
    mid?: string
    high?: string
}

type ConnectionInfo = {
    saveData?: boolean
    effectiveType?: string
    downlink?: number
    rtt?: number
}

function getConnection(): ConnectionInfo | null {
    const nav = navigator as unknown as { connection?: unknown }
    if (!nav.connection || typeof nav.connection !== 'object') return null
    return nav.connection as ConnectionInfo
}

function getInitialBandwidthEstimate(): number {
    const connection = getConnection()
    if (!connection) return 1000000

    if (connection.saveData) return 200000

    const downlink = connection.downlink || 1.5
    return Math.floor(downlink * 1000000 * 0.8)
}

function isSmallScreen(): boolean {
    return typeof globalThis.window === 'object' && window.innerWidth < 768
}

function selectOptimalSource(variants: VideoQualityVariants): string | undefined {
    const bandwidth = getInitialBandwidthEstimate()
    const isMobile = isSmallScreen()

    if (bandwidth < 500000 || isMobile) return variants.low || variants.mid || variants.high
    if (bandwidth < 2000000) return variants.mid || variants.high || variants.low
    return variants.high || variants.mid || variants.low
}

function resolveFinalUrl(src: string | VideoQualityVariants | undefined): string | undefined {
    if (!src) return undefined
    if (typeof src === 'string') return src
    return selectOptimalSource(src)
}

function isHlsUrl(url: string): boolean {
    return url.includes('.m3u8')
}

function getHlsConfig(): Partial<HlsConfig> {
    const initialBw = getInitialBandwidthEstimate()

    return {
        autoStartLoad: true,
        capLevelToPlayerSize: true,
        enableWorker: true,

        abrEwmaDefaultEstimate: initialBw,
        startLevel: -1,

        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferHole: 0.5,

        fragLoadingTimeOut: 10000,
        manifestLoadingTimeOut: 10000,

        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.7,

        liveSyncDurationCount: 3,
    }
}

async function sleep(ms: number): Promise<void> {
    await new Promise<void>((r) => globalThis.window.setTimeout(r, ms))
}

async function verifyProgressByTime(video: HTMLVideoElement, ms: number): Promise<boolean> {
    const start = video.currentTime
    await sleep(ms)
    return video.currentTime > start
}

type FrameCallbackVideo = HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, metadata: unknown) => void) => number
    cancelVideoFrameCallback?: (id: number) => void
}

async function verifyProgressByFrames(video: FrameCallbackVideo, timeoutMs: number): Promise<boolean> {
    if (!video.requestVideoFrameCallback) return false

    return await new Promise<boolean>((resolve) => {
        let settled = false
        let rafId: number | null = null

        const done = (v: boolean) => {
            if (settled) return
            settled = true
            if (rafId !== null && video.cancelVideoFrameCallback) {
                video.cancelVideoFrameCallback(rafId)
            }
            resolve(v)
        }

        const start = video.currentTime

        rafId = video.requestVideoFrameCallback(() => {
            done(video.currentTime > start)
        })

        globalThis.window.setTimeout(() => done(false), timeoutMs)
    })
}

type AttemptResult = 'ok' | 'not-allowed' | 'failed'

async function attemptPlay(video: HTMLVideoElement): Promise<AttemptResult> {
    try {
        await video.play()
        return 'ok'
    } catch (e) {
        const err = e as { name?: string }
        if (err?.name === 'NotAllowedError') return 'not-allowed'
        return 'failed'
    }
}

export type DeterministicPlayResult = 'playing' | 'blocked' | 'failed'

export type DeterministicPlayOptions = {
    muted: boolean
    playbackRate: number
    allowAutoMute: boolean
    verifyMs: number
}

async function verifyProgress(video: HTMLVideoElement, verifyMs: number): Promise<boolean> {
    const v = video as FrameCallbackVideo
    if (typeof v.requestVideoFrameCallback === 'function') {
        const byFrames = await verifyProgressByFrames(v, verifyMs)
        if (byFrames) return true
    }

    const fast = await verifyProgressByTime(video, Math.max(150, Math.floor(verifyMs * 0.6)))
    if (fast) return true

    const slow = await verifyProgressByTime(video, verifyMs)
    return slow
}

export async function playDeterministic(
    video: HTMLVideoElement,
    opts: DeterministicPlayOptions
): Promise<DeterministicPlayResult> {
    video.muted = opts.muted
    video.playbackRate = opts.playbackRate

    const first = await attemptPlay(video)
    if (first === 'ok') {
        const ok = await verifyProgress(video, opts.verifyMs)
        if (ok) return 'playing'
        video.pause()
        return 'failed'
    }

    if (first === 'not-allowed') {
        if (!opts.allowAutoMute) return 'blocked'

        video.muted = true
        const second = await attemptPlay(video)
        if (second !== 'ok') return 'blocked'

        const ok = await verifyProgress(video, opts.verifyMs)
        if (ok) return 'playing'

        video.pause()
        return 'failed'
    }

    return 'failed'
}

export function detachMedia(video: HTMLVideoElement): void {
    try {
        video.pause()
        video.removeAttribute('src')
        video.load()
    } catch { }
}

type Entry = {
    url: string
    hls: Hls | null
    refCount: number
}

const CACHE_LIMIT = 50
const DISPOSE_DELAY_MS = 30000

class VideoSourceManager {
    private readonly cache = new Map<string, Entry>()
    private readonly disposeTimeouts = new Map<string, number>()

    private cleanupCacheIfNeeded() {
        if (this.cache.size >= CACHE_LIMIT) {
            for (const [oldKey, entry] of this.cache) {
                if (entry.refCount === 0 && !this.disposeTimeouts.has(oldKey)) {
                    entry.hls?.destroy()
                    this.cache.delete(oldKey)
                    if (this.cache.size < CACHE_LIMIT) break
                }
            }
        }
    }

    private cancelPendingDispose(key: string) {
        if (this.disposeTimeouts.has(key)) {
            globalThis.window.clearTimeout(this.disposeTimeouts.get(key))
            this.disposeTimeouts.delete(key)
        }
    }

    private ensureEntry(key: string, src?: string | VideoQualityVariants): Entry | null {
        if (!src) return null

        const url = resolveFinalUrl(src)
        if (!url) return null

        this.cancelPendingDispose(key)

        const existing = this.cache.get(key)
        if (existing?.url === url) {
            return existing
        }

        if (existing) {
            existing.hls?.destroy()
            this.cache.delete(key)
        }

        this.cleanupCacheIfNeeded()

        let hls: Hls | null = null
        if (isHlsUrl(url) && Hls.isSupported()) {
            hls = new Hls(getHlsConfig())
            hls.loadSource(url)
        }

        const entry: Entry = { url, hls, refCount: 0 }
        this.cache.set(key, entry)
        return entry
    }

    preload(key: string, src?: string | VideoQualityVariants): void {
        const entry = this.ensureEntry(key, src)
        if (entry) {
            this.cancelPendingDispose(key)
            const timeoutId = globalThis.window.setTimeout(() => {
                if (entry.refCount === 0) {
                    entry.hls?.destroy()
                    this.cache.delete(key)
                }
                this.disposeTimeouts.delete(key)
            }, DISPOSE_DELAY_MS)
            this.disposeTimeouts.set(key, timeoutId)
        }
    }

    attach(video: HTMLVideoElement, key: string, src?: string | VideoQualityVariants): void {
        const entry = this.ensureEntry(key, src)
        if (!entry) return

        entry.refCount += 1

        if (entry.hls) {
            entry.hls.attachMedia(video)
            return
        }

        if (video.src !== entry.url) {
            video.src = entry.url
        }
    }

    detach(key: string, video?: HTMLVideoElement, scope?: VideoSourceScope): void {
        const entry = this.cache.get(key)
        if (!entry) {
            return
        }

        entry.refCount = Math.max(0, entry.refCount - 1)

        if (entry.refCount <= 0) {
            this.cancelPendingDispose(key)
            const timeoutId = globalThis.window.setTimeout(() => {
                if (this.cache.has(key)) {
                    const currentEntry = this.cache.get(key)
                    if (currentEntry && currentEntry.refCount <= 0) {
                        currentEntry.hls?.destroy()
                        this.cache.delete(key)
                    }
                }
                this.disposeTimeouts.delete(key)
            }, DISPOSE_DELAY_MS)

            this.disposeTimeouts.set(key, timeoutId)
        }

        if (scope === 'viewer' && video) detachMedia(video)
    }

    reset(key: string): void {
        this.cancelPendingDispose(key)
        const entry = this.cache.get(key)
        if (!entry) return

        entry.hls?.destroy()
        this.cache.delete(key)
    }
}

export const videoSourceManager = new VideoSourceManager()

export type VideoSourceScope = 'viewer' | 'carousel'

function buildKey(scope: VideoSourceScope, id: string): string {
    return `${scope}:${id}`
}

export function useVideoSource(
    videoRef: RefObject<HTMLVideoElement>,
    scope: VideoSourceScope,
    id: string,
    src: string | VideoQualityVariants | undefined,
    shouldLoad: boolean
): string | undefined {
    const finalUrl = useMemo(() => resolveFinalUrl(src), [src])
    const key = useMemo(() => {
        return buildKey(scope, id)
    }, [scope, id])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const delay = 0

        const timer = globalThis.window.setTimeout(() => {
            videoSourceManager.attach(video, key, src)
        }, delay)

        return () => {
            globalThis.window.clearTimeout(timer)
        }
    }, [key, scope, shouldLoad, src, videoRef])

    return finalUrl
}

export function preloadVideoSource(scope: VideoSourceScope, id: string, src?: string | VideoQualityVariants): void {
    if (!src) return
    videoSourceManager.preload(buildKey(scope, id), src)
}

export function resetVideoSource(scope: VideoSourceScope, id: string): void {
    videoSourceManager.reset(buildKey(scope, id))
}
