import { useEffect, useMemo, type RefObject } from 'react';
import Hls from 'hls.js';

export interface VideoQualityVariants {
    low?: string;
    mid?: string;
    high?: string;
}

function getConnection(): {
    saveData?: boolean;
    effectiveType?: string;
} | null {
    const nav = navigator as unknown as { connection?: unknown };
    if (!nav.connection || typeof nav.connection !== 'object') {
        return null;
    }
    return nav.connection as { saveData?: boolean; effectiveType?: string };
}

function isSlowConnection(connection: { saveData?: boolean; effectiveType?: string } | null): boolean {
    const effectiveType = connection?.effectiveType ?? '';
    return connection?.saveData === true || ['slow-2g', '2g', '3g'].includes(effectiveType);
}

function isSmallScreen(): boolean {
    return typeof globalThis.window === 'object' && window.innerWidth < 768;
}

function selectOptimalSource(variants: VideoQualityVariants): string | undefined {
    const connection = getConnection();
    const preferLow = isSlowConnection(connection) || isSmallScreen();
    if (preferLow) {
        return variants.low || variants.mid || variants.high;
    }
    return variants.high || variants.mid || variants.low;
}

function resolveFinalUrl(src: string | VideoQualityVariants | undefined): string | undefined {
    if (!src) return undefined;
    if (typeof src === 'string') return src;
    return selectOptimalSource(src);
}

type Entry = {
    url: string;
    hls: Hls | null;
    refCount: number;
};

class VideoSourceManager {
    private readonly cache = new Map<number, Entry>();

    preload(index: number, src?: string | VideoQualityVariants) {
        if (index < 0) return;
        if (!src) return;

        const existing = this.cache.get(index);
        if (existing) return;

        const url = resolveFinalUrl(src);
        if (!url) return;

        let hls: Hls | null = null;

        if (url.includes('.m3u8') && Hls.isSupported()) {
            hls = new Hls({ autoStartLoad: true, capLevelToPlayerSize: true });
            hls.loadSource(url);
        }

        this.cache.set(index, { url, hls, refCount: 0 });
    }

    attach(video: HTMLVideoElement, index: number, src?: string | VideoQualityVariants) {
        if (index < 0) return;

        if (!this.cache.has(index) && src) {
            this.preload(index, src);
        }

        const entry = this.cache.get(index);
        if (!entry) return;

        entry.refCount += 1;

        if (entry.hls) {
            entry.hls.attachMedia(video);
        } else if (video.src !== entry.url) {
            video.src = entry.url;
        }
    }

    detach(index: number) {
        const entry = this.cache.get(index);
        if (!entry) return;

        entry.refCount -= 1;

        if (entry.refCount <= 0) {
            entry.hls?.destroy();
            this.cache.delete(index);
        }
    }

    reset(index: number) {
        const entry = this.cache.get(index);
        if (!entry) return;

        entry.hls?.destroy();
        this.cache.delete(index);
    }
}

export const videoSourceManager = new VideoSourceManager();

export function useVideoSource(
    videoRef: RefObject<HTMLVideoElement>,
    src: string | VideoQualityVariants | undefined,
    shouldLoad: boolean
) {
    const finalUrl = useMemo(() => resolveFinalUrl(src), [src]);

    useEffect(() => {
        const video = videoRef.current;

        if (!video || !finalUrl || !shouldLoad) {
            return;
        }

        let hls: Hls | null = null;
        const isHlsSource = finalUrl.includes('.m3u8');

        if (isHlsSource && Hls.isSupported()) {
            hls = new Hls({ autoStartLoad: true, capLevelToPlayerSize: true });
            hls.loadSource(finalUrl);
            hls.attachMedia(video);
        } else if (video.src !== finalUrl) {
            video.src = finalUrl;
        }

        return () => {
            hls?.destroy();
        };
    }, [finalUrl, shouldLoad, videoRef]);
}
