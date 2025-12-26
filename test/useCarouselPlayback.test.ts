
import { renderHook, act } from '@testing-library/react'
import { useCarouselPlayback } from '../src/carousel/useCarouselPlayback'

beforeAll(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
        configurable: true,
        writable: true,
        value: jest.fn().mockResolvedValue(undefined)
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
        configurable: true,
        writable: true,
        value: jest.fn()
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'load', {
        configurable: true,
        writable: true,
        value: jest.fn()
    })
})

describe('useCarouselPlayback', () => {
    let video: HTMLVideoElement
    let ref: { current: HTMLVideoElement | null }
    let observer: any

    beforeEach(() => {
        video = document.createElement('video')
        ref = { current: video }
        observer = {
            play: jest.fn(),
            pause: jest.fn(),
            error: jest.fn(),
            retry: jest.fn()
        }
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.clearAllTimers()
        jest.useRealTimers()
    })

    it('should play video when active', async () => {
        video.play = jest.fn().mockResolvedValue(undefined)
        const { result } = renderHook(() => useCarouselPlayback(ref, 'id', true, false, true, observer))
        await act(async () => {
            jest.runOnlyPendingTimers()
        })
        expect(video.play).toHaveBeenCalled()
        expect(observer.play).toHaveBeenCalledWith('id', 'auto')
    })


    it('should pause and reset video when not active', () => {
        video.pause = jest.fn()
        const { result } = renderHook(() => useCarouselPlayback(ref, 'id', false, false, true, observer))
        expect(video.pause).toHaveBeenCalled()
        expect(video.currentTime).toBe(0)
        expect(observer.pause).toHaveBeenCalledWith('id', 'auto')
    })

    it('should set error and call observer.error on error', () => {
        const { result } = renderHook(() => useCarouselPlayback(ref, 'id', true, false, true, observer))
        act(() => {
            result.current.onError()
        })
        expect(result.current.hasError).toBe(true)
        expect(observer.error).toHaveBeenCalledWith('id', 'decode')
    })

    it('should not play if shouldLoad is false', () => {
        video.play = jest.fn()
        renderHook(() => useCarouselPlayback(ref, 'id', true, false, false, observer))
        expect(video.play).not.toHaveBeenCalled()
    })


    it('should retry and call observer.retry', () => {
        video.load = jest.fn()
        const { result } = renderHook(() => useCarouselPlayback(ref, 'id', true, false, true, observer))
        act(() => {
            result.current.retry()
        })
        expect(result.current.hasError).toBe(false)
        expect(video.load).toHaveBeenCalled()
        expect(observer.retry).toHaveBeenCalledWith('id')
    })


    it('should cleanup timers on unmount', () => {
        video.play = jest.fn().mockResolvedValue(undefined)
        const { unmount } = renderHook(() => useCarouselPlayback(ref, 'id', true, false, true, observer))
        unmount()
        expect(jest.getTimerCount()).toBe(0)
    })
})
