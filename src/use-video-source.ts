import { useEffect, RefObject } from 'react';
import Hls from 'hls.js';

export function useVideoSource(
    videoRef: RefObject<HTMLVideoElement>,
    src: string | undefined,
    shouldLoad: boolean
) {
    useEffect(() => {
        const video = videoRef.current;

        if (!video || !src || !shouldLoad) return;

        let hls: Hls | null = null;
        const isHlsSource = src.includes('.m3u8');

        if (isHlsSource && Hls.isSupported()) {
            hls = new Hls({
                autoStartLoad: true,
                capLevelToPlayerSize: true,
            });

            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                // Auto-play can be handled here if needed
            });
        }

        else if (isHlsSource && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }
        else {
            video.src = src;
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src, shouldLoad, videoRef]);
}
