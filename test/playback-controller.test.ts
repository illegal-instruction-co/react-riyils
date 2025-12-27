import { PlaybackController } from '../src/playback-controller';
import { playDeterministic } from '../src/use-video-source';

jest.mock('../src/use-video-source', () => ({
    playDeterministic: jest.fn(),
}));

describe('PlaybackController', () => {
    let controller: PlaybackController;
    let mockVideo: any;

    beforeEach(() => {
        controller = new PlaybackController();
        mockVideo = {
            pause: jest.fn(),
            muted: true,
        };
        jest.clearAllMocks();
    });

    it('should initialize with muted true', () => {
        expect(controller.isMuted()).toBe(true);
    });

    it('should set and get muted state', () => {
        controller.setMuted(false);
        expect(controller.isMuted()).toBe(false);
        controller.setMuted(true);
        expect(controller.isMuted()).toBe(true);
    });

    it('should play video successfully', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        const req: any = {
            scope: 'viewer',
            id: '1',
            video: mockVideo,
            options: {}
        };
        const result = await controller.play(req);
        expect(result).toBe('playing');
        expect(playDeterministic).toHaveBeenCalled();
    });

    it('should update muted state if scope is viewer', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        mockVideo.muted = false;
        const req: any = {
            scope: 'viewer',
            id: '1',
            video: mockVideo,
            options: {}
        };
        await controller.play(req);
        expect(controller.isMuted()).toBe(false);
    });

    it('should return cancelled if token mismatch', async () => {
        let resolveReq1: (val: any) => void = () => { };
        (playDeterministic as jest.Mock)
            .mockImplementationOnce(() => new Promise(resolve => {
                resolveReq1 = resolve;
            }))
            .mockResolvedValueOnce('playing');

        const req1: any = { scope: 'viewer', id: '1', video: mockVideo, options: {} };
        const playPromise = controller.play(req1);

        const req2: any = { scope: 'viewer', id: '1', video: mockVideo, options: {} };
        await controller.play(req2);

        resolveReq1('playing');
        const result = await playPromise;

        expect(result).toBe('cancelled');
        expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should return cancelled if session is removed during play', async () => {
        let resolvePlay: (val: any) => void = () => { };
        (playDeterministic as jest.Mock).mockImplementationOnce(() => new Promise(resolve => {
            resolvePlay = resolve;
        }));

        const req: any = { scope: 'viewer', id: '1', video: mockVideo, options: {} };
        const playPromise = controller.play(req);
        controller.reset('viewer', '1');

        resolvePlay('playing');
        const result = await playPromise;

        expect(result).toBe('cancelled');
    });

    it('should return blocked and reset muted state if blocked', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('blocked');
        controller.setMuted(false);
        const req: any = { scope: 'viewer', id: '1', video: mockVideo, options: {} };

        const result = await controller.play(req);

        expect(result).toBe('blocked');
        expect(controller.isMuted()).toBe(true);
    });

    it('should return result if failed', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('failed');
        const req: any = { scope: 'viewer', id: '1', video: mockVideo, options: {} };

        const result = await controller.play(req);
        expect(result).toBe('failed');
    });

    it('should cancel all other sessions except current', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        const mockVideo2 = { pause: jest.fn(), muted: true };

        await controller.play({ scope: 'carousel', id: '1', video: mockVideo, options: {} } as any);
        await controller.play({ scope: 'carousel', id: '2', video: mockVideo2, options: {} } as any);

        expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should reset specific session', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        await controller.play({ scope: 'carousel', id: '1', video: mockVideo, options: {} } as any);

        controller.reset('carousel', '1');
        expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should reset all sessions', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        const mockVideo2 = { pause: jest.fn(), muted: true };

        await controller.play({ scope: 'carousel', id: '1', video: mockVideo, options: {} } as any);
        await controller.play({ scope: 'carousel', id: '2', video: mockVideo2, options: {} } as any);

        controller.resetAll();
        expect(mockVideo.pause).toHaveBeenCalled();
        expect(mockVideo2.pause).toHaveBeenCalled();
    });

    it('should handle pause error in safePause', async () => {
        (playDeterministic as jest.Mock).mockResolvedValue('playing');
        mockVideo.pause = jest.fn(() => { throw new Error('pause error'); });

        await controller.play({ scope: 'carousel', id: '1', video: mockVideo, options: {} } as any);

        expect(() => controller.reset('carousel', '1')).not.toThrow();
    });
});
