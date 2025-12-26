import { useEffect, useMemo, type RefObject } from 'react';
import Hls from 'hls.js';

export interface VideoQualityVariants {
    low?: string;
    mid?: string;
    high?: string;
}

type ConnectionInfo = {
    saveData?: boolean;
    effectiveType?: string;
};

function getConnection(): ConnectionInfo | null {
    const nav = navigator as unknown as { connection?: unknown };
    if (!nav.connection || typeof nav.connection !== 'object') return null;
    return nav.connection as ConnectionInfo;
}

function isSlowConnection(connection: ConnectionInfo | null): boolean {
    const effectiveType = connection?.effectiveType ?? '';
    return connection?.saveData === true || ['slow-2g', '2g', '3g'].includes(effectiveType);
}

function isSmallScreen(): boolean {
    return typeof globalThis.window === 'object' && window.innerWidth < 768;
}

function selectOptimalSource(variants: VideoQualityVariants): string | undefined {
    const connection = getConnection();
    const preferLow = isSlowConnection(connection) || isSmallScreen();
    if (preferLow) return variants.low || variants.mid || variants.high;
    return variants.high || variants.mid || variants.low;
}

function resolveFinalUrl(src: string | VideoQualityVariants | undefined): string | undefined {
    if (!src) return undefined;
    if (typeof src === 'string') return src;
    return selectOptimalSource(src);
}

function isHlsUrl(url: string): boolean {
    return url.includes('.m3u8');
}

async function sleep(ms: number): Promise<void> {
    await new Promise<void>((r) => globalThis.window.setTimeout(r, ms));
}

async function verifyProgressByTime(video: HTMLVideoElement, ms: number): Promise<boolean> {
    const start = video.currentTime;
    await sleep(ms);
    return video.currentTime > start;
}

type FrameCallbackVideo = HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, metadata: unknown) => void) => number;
    cancelVideoFrameCallback?: (id: number) => void;
};

async function verifyProgressByFrames(video: FrameCallbackVideo, timeoutMs: number): Promise<boolean> {
    if (!video.requestVideoFrameCallback) return false;

    return await new Promise<boolean>((resolve) => {
        let settled = false;
        let rafId: number | null = null;

        const done = (v: boolean) => {
            if (settled) return;
            settled = true;
            if (rafId !== null && video.cancelVideoFrameCallback) {
                video.cancelVideoFrameCallback(rafId);
            }
            resolve(v);
        };

        const start = video.currentTime;

        rafId = video.requestVideoFrameCallback(() => {
            done(video.currentTime > start);
        });

        globalThis.window.setTimeout(() => done(false), timeoutMs);
    });
}

type AttemptResult = 'ok' | 'not-allowed' | 'failed';

async function attemptPlay(video: HTMLVideoElement): Promise<AttemptResult> {
    try {
        await video.play();
        return 'ok';
    } catch (e) {
        const err = e as { name?: string };
        if (err?.name === 'NotAllowedError') return 'not-allowed';
        return 'failed';
    }
}

export type DeterministicPlayResult = 'playing' | 'blocked' | 'failed';

export type DeterministicPlayOptions = {
    muted: boolean;
    playbackRate: number;
    allowAutoMute: boolean;
    verifyMs: number;
};

async function verifyProgress(video: HTMLVideoElement, verifyMs: number): Promise<boolean> {
    const v = video as FrameCallbackVideo;
    if (typeof v.requestVideoFrameCallback === 'function') {
        const byFrames = await verifyProgressByFrames(v, verifyMs);
        if (byFrames) return true;
    }

    const fast = await verifyProgressByTime(video, Math.max(150, Math.floor(verifyMs * 0.6)));
    if (fast) return true;

    const slow = await verifyProgressByTime(video, verifyMs);
    return slow;
}

export async function playDeterministic(
    video: HTMLVideoElement,
    opts: DeterministicPlayOptions
): Promise<DeterministicPlayResult> {
    video.muted = opts.muted;
    video.playbackRate = opts.playbackRate;

    const first = await attemptPlay(video);
    if (first === 'ok') {
        const ok = await verifyProgress(video, opts.verifyMs);
        if (ok) return 'playing';
        video.pause();
        return 'failed';
    }

    if (first === 'not-allowed') {
        if (!opts.allowAutoMute) return 'blocked';

        video.muted = true;
        const second = await attemptPlay(video);
        if (second !== 'ok') return 'blocked';

        const ok = await verifyProgress(video, opts.verifyMs);
        if (ok) return 'playing';

        video.pause();
        return 'failed';
    }

    return 'failed';
}

export function detachMedia(video: HTMLVideoElement): void {
    if (video.src) {
        video.src = '';
    }
    video.load();
}

type Entry = {
    url: string;
    hls: Hls | null;
    refCount: number;
};

class VideoSourceManager {
    private readonly cache = new Map<string, Entry>();

    private ensureEntry(key: string, src?: string | VideoQualityVariants): Entry | null {
        if (!src) return null;

        const url = resolveFinalUrl(src);
        if (!url) return null;

        const existing = this.cache.get(key);
        if (existing?.url === url) return existing;

        if (existing) {
            existing.hls?.destroy();
            this.cache.delete(key);
        }

        let hls: Hls | null = null;
        if (isHlsUrl(url) && Hls.isSupported()) {
            hls = new Hls({ autoStartLoad: true, capLevelToPlayerSize: true });
            hls.loadSource(url);
        }

        const entry: Entry = { url, hls, refCount: 0 };
        this.cache.set(key, entry);
        return entry;
    }

    preload(key: string, src?: string | VideoQualityVariants): void {
        this.ensureEntry(key, src);
    }

    attach(video: HTMLVideoElement, key: string, src?: string | VideoQualityVariants): void {
        const entry = this.ensureEntry(key, src);
        if (!entry) return;

        entry.refCount += 1;

        if (entry.hls) {
            entry.hls.attachMedia(video);
            return;
        }

        if (video.src !== entry.url) {
            video.src = entry.url;
        }
    }

    detach(key: string, video?: HTMLVideoElement): void {
        const entry = this.cache.get(key);
        if (!entry) {
            if (video) detachMedia(video);
            return;
        }

        entry.refCount -= 1;

        if (entry.refCount <= 0) {
            entry.hls?.destroy();
            this.cache.delete(key);
        }

        if (video) detachMedia(video);
    }

    reset(key: string): void {
        const entry = this.cache.get(key);
        if (!entry) return;

        entry.hls?.destroy();
        this.cache.delete(key);
    }
}

export const videoSourceManager = new VideoSourceManager();

export type VideoSourceScope = 'viewer' | 'carousel';

function buildKey(scope: VideoSourceScope, id: string): string {
    return `${scope}:${id}`;
}

export function useVideoSource(
    videoRef: RefObject<HTMLVideoElement>,
    scope: VideoSourceScope,
    id: string,
    src: string | VideoQualityVariants | undefined,
    shouldLoad: boolean
): string | undefined {
    const finalUrl = useMemo(() => resolveFinalUrl(src), [src]);
    const key = useMemo(() => buildKey(scope, id), [scope, id]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (!shouldLoad || !src) {
            videoSourceManager.detach(key, video);
            return;
        }

        videoSourceManager.attach(video, key, src);

        return () => {
            videoSourceManager.detach(key, video);
        };
    }, [key, shouldLoad, src, videoRef]);

    return finalUrl;
}

export function preloadVideoSource(scope: VideoSourceScope, id: string, src?: string | VideoQualityVariants): void {
    if (!src) return;
    videoSourceManager.preload(buildKey(scope, id), src);
}

export function resetVideoSource(scope: VideoSourceScope, id: string): void {
    videoSourceManager.reset(buildKey(scope, id));
}
