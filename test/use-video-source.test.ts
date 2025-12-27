import { renderHook } from '@testing-library/react';
import { useVideoSource, playDeterministic, videoSourceManager, detachMedia } from '../src/use-video-source';
import Hls from 'hls.js';

jest.mock('hls.js', () => {
    return jest.fn().mockImplementation(() => ({
        loadSource: jest.fn(),
        attachMedia: jest.fn(),
        destroy: jest.fn(),
    }));
});
// @ts-ignore
Hls.isSupported = jest.fn(() => true);

HTMLMediaElement.prototype.pause = jest.fn();
HTMLMediaElement.prototype.load = jest.fn();
HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);

describe('use-video-source', () => {
    describe('playDeterministic', () => {
        let video: HTMLVideoElement;

        beforeEach(() => {
            video = document.createElement('video');
            video.play = jest.fn().mockResolvedValue(undefined);
            video.pause = jest.fn();
            Object.defineProperty(video, 'currentTime', { value: 0, writable: true });
        });

        it('should return playing on success', async () => {
            const playPromise = playDeterministic(video, {
                muted: true,
                playbackRate: 1,
                allowAutoMute: true,
                verifyMs: 10
            });

            setTimeout(() => { video.currentTime = 1; }, 5);

            const result = await playPromise;
            expect(result).toBe('playing');
        });

        it('should handle NotAllowedError and auto-mute', async () => {
            const err = new Error('NotAllowed');
            err.name = 'NotAllowedError';
            (video.play as jest.Mock)
                .mockRejectedValueOnce(err)
                .mockResolvedValueOnce(undefined);

            const playPromise = playDeterministic(video, {
                muted: false,
                playbackRate: 1,
                allowAutoMute: true,
                verifyMs: 10
            });

            setTimeout(() => { video.currentTime = 1; }, 5);

            const result = await playPromise;
            expect(result).toBe('playing');
            expect(video.muted).toBe(true);
        });
    });

    describe('VideoSourceManager', () => {
        it('should use Hls for .m3u8 urls', () => {
            const video = document.createElement('video');
            videoSourceManager.attach(video, 'test-hls', 'http://example.com/video.m3u8');
            expect(Hls).toHaveBeenCalled();
        });

        it('should use native for non-hls urls', () => {
            const video = document.createElement('video');
            // @ts-ignore
            Hls.mockClear();
            videoSourceManager.attach(video, 'test-native', 'http://example.com/video.mp4');
            expect(Hls).not.toHaveBeenCalled();
            expect(video.src).toBe('http://example.com/video.mp4');
        });

        it('should cleanup cache on limit', () => {
            for (let i = 0; i < 60; i++) {
                videoSourceManager.preload(`key-${i}`, `http://example.com/${i}.mp4`);
            }
        });
    });

    describe('detachMedia', () => {
        it('should handle errors gracefully', () => {
            const video = document.createElement('video');
            video.pause = jest.fn(() => { throw new Error('pause error'); });
            expect(() => detachMedia(video)).not.toThrow();
        });
    });

    describe('useVideoSource', () => {
        it('should attach and detach', () => {
            const video = document.createElement('video');
            const ref = { current: video };
            const { unmount } = renderHook(() => useVideoSource(ref, 'viewer', '1', 'src.mp4', true));
            unmount();
        });
    });
});
