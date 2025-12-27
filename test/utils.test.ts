import { isIosSafari, triggerHaptic, throttle, debounce } from '../src/utils';

describe('utils', () => {
    describe('isIosSafari', () => {
        const originalUserAgent = navigator.userAgent;

        afterEach(() => {
            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                configurable: true
            });
        });

        it('should return true for iPhone', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                configurable: true
            });
            expect(isIosSafari()).toBe(true);
        });

        it('should return false for Android', () => {
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36',
                configurable: true
            });
            expect(isIosSafari()).toBe(false);
        });

        it('should return false when navigator is undefined', () => {
            const originalNavigator = globalThis.navigator;
            // @ts-ignore
            delete globalThis.navigator;
            expect(isIosSafari()).toBe(false);
            // @ts-ignore
            globalThis.navigator = originalNavigator;
        });
    });

    describe('triggerHaptic', () => {
        it('should call navigator.vibrate if available', () => {
            const mockVibrate = jest.fn();
            const originalVibrate = navigator.vibrate;
            navigator.vibrate = mockVibrate;

            triggerHaptic();

            expect(mockVibrate).toHaveBeenCalledWith(10);
            navigator.vibrate = originalVibrate;
        });

        it('should not throw if navigator.vibrate is unavailable', () => {
            const originalVibrate = navigator.vibrate;
            // @ts-ignore
            delete navigator.vibrate;

            expect(() => triggerHaptic()).not.toThrow();
            navigator.vibrate = originalVibrate;
        });
    });

    describe('throttle', () => {
        jest.useFakeTimers();

        it('should throttle function calls', () => {
            const func = jest.fn();
            const throttled = throttle(func, 100);

            throttled();
            throttled();
            throttled();

            expect(func).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(100);
            throttled();

            expect(func).toHaveBeenCalledTimes(2);
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        it('should debounce function calls', () => {
            const func = jest.fn();
            const debounced = debounce(func, 100);

            debounced();
            debounced();
            debounced();

            expect(func).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);

            expect(func).toHaveBeenCalledTimes(1);
        });
    });
});
