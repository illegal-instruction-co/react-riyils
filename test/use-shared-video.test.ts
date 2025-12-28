import { renderHook } from '@testing-library/react';
import { useSharedVideo } from '../src/use-shared-video';
import { VideoElementPool } from '../src/video-pool';

jest.mock('../src/video-pool', () => ({
    VideoElementPool: {
        move: jest.fn()
    }
}));

describe('useSharedVideo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should move video into container when shouldLoad is true', () => {
        const container = document.createElement('div');
        const containerRef = { current: container };
        const video = document.createElement('video');
        (VideoElementPool.move as jest.Mock).mockReturnValue(video);

        renderHook(() => useSharedVideo(containerRef, 'vid-1', 'class-1', true));

        expect(VideoElementPool.move).toHaveBeenCalledWith('vid-1', container, 'class-1', undefined);
    });

    it('should not move video when shouldLoad is false', () => {
        const container = document.createElement('div');
        const containerRef = { current: container };

        renderHook(() => useSharedVideo(containerRef, 'vid-1', 'class-1', false));

        expect(VideoElementPool.move).not.toHaveBeenCalled();
    });

    it('should remove video on cleanup', () => {
        const container = document.createElement('div');
        const containerRef = { current: container };
        const video = document.createElement('video');
        container.appendChild(video);
        (VideoElementPool.move as jest.Mock).mockReturnValue(video);

        const { unmount } = renderHook(() => useSharedVideo(containerRef, 'vid-1', 'class-1', true));

        unmount();

        expect(container.contains(video)).toBe(false);
    });

    it('should return early if container is missing', () => {
        const containerRef = { current: null };
        renderHook(() => useSharedVideo(containerRef, 'vid-1', 'class-1', true));
        expect(VideoElementPool.move).not.toHaveBeenCalled();
    });
});
