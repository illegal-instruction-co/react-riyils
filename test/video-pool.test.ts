import { VideoElementPool } from '../src/video-pool';

describe('VideoElementPool', () => {
    it('should create and return a video element', () => {
        const video = VideoElementPool.get('test-1');
        expect(video).toBeInstanceOf(HTMLVideoElement);
        expect(video.muted).toBe(true);
        expect(video.loop).toBe(true);
    });

    it('should return existing video element for same id', () => {
        const video1 = VideoElementPool.get('test-2');
        const video2 = VideoElementPool.get('test-2');
        expect(video1).toBe(video2);
    });

    it('should move video to container and set className', () => {
        const container = document.createElement('div');
        const video = VideoElementPool.move('test-3', container, 'test-class');

        expect(container.contains(video)).toBe(true);
        expect(video.className).toBe('test-class');
    });

    it('should return early if video already in container with same class', () => {
        const container = document.createElement('div');
        const video1 = VideoElementPool.move('test-4', container, 'test-class');

        const appendSpy = jest.spyOn(container, 'appendChild');
        const video2 = VideoElementPool.move('test-4', container, 'test-class');

        expect(video1).toBe(video2);
        expect(appendSpy).not.toHaveBeenCalled();
    });
});
