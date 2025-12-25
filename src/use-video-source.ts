import { useEffect, useMemo, RefObject } from 'react';
import Hls from 'hls.js';

export interface VideoQualityVariants {
    low?: string;
    mid?: string;
    high?: string;
}

function selectOptimalSource(variants: VideoQualityVariants): string | undefined {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isSlowConnection = connection ? (connection.saveData === true || ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) : false;
    const isSmallScreen = typeof globalThis.window === 'object' ? globalThis.window.innerWidth < 768 : false;

    if (isSlowConnection || isSmallScreen) {
        return variants.low || variants.mid || variants.high;
    }

    return variants.high || variants.mid || variants.low;
}

export function useVideoSource(
    videoRef: RefObject<HTMLVideoElement>,
    src: string | VideoQualityVariants | undefined,
    shouldLoad: boolean
) {
    const finalUrl = useMemo(() => {
        if (!src) return undefined;
        if (typeof src === 'string') return src;
        return selectOptimalSource(src);
    }, [src]);

    useEffect(() => {
        const video = videoRef.current;

        if (!video || !finalUrl || !shouldLoad) return;

        let hls: Hls | null = null;
        const isHlsSource = finalUrl.includes('.m3u8');

        if (isHlsSource && Hls.isSupported()) {
            hls = new Hls({
                autoStartLoad: true,
                capLevelToPlayerSize: true,
            });

            hls.loadSource(finalUrl);
            hls.attachMedia(video);
        }
        else if (isHlsSource && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = finalUrl;
        }
        else {
            video.src = finalUrl;
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [finalUrl, shouldLoad, videoRef]);
}
