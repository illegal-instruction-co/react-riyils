import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { RiyilsObserverProvider, useGlobalRiyilsObserver } from '../src/observe/RiyilsObserverContext';
import { useRiyilsObserver } from '../src/observe/useRiyilsObserver';

describe('Observability', () => {
    describe('RiyilsObserverProvider', () => {
        it('should filter events based on logLevel', () => {
            const onEvent = jest.fn();
            const { result } = renderHook(() => useGlobalRiyilsObserver(), {
                wrapper: ({ children }) => (
                    <RiyilsObserverProvider onEvent={onEvent} logLevel="warn">
                        {children}
                    </RiyilsObserverProvider>
                )
            });

            act(() => {
                // @ts-ignore
                result.current.onEvent({ type: 'play', level: 'info' });
                // @ts-ignore
                result.current.onEvent({ type: 'error', level: 'error' });
            });

            expect(onEvent).toHaveBeenCalledTimes(1);
            expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
        });

        it('should handle missing onEvent', () => {
            const { result } = renderHook(() => useGlobalRiyilsObserver(), {
                wrapper: ({ children }) => (
                    <RiyilsObserverProvider logLevel="info">
                        {children}
                    </RiyilsObserverProvider>
                )
            });
            expect(result.current.onEvent).toBeUndefined();
        });
    });

    describe('useRiyilsObserver', () => {
        it('should emit events with metadata', () => {
            const onEvent = jest.fn();
            const { result } = renderHook(() => useRiyilsObserver('viewer', onEvent));

            act(() => {
                result.current.play('vid-1', 'user');
            });

            expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'play',
                videoId: 'vid-1',
                reason: 'user',
                scope: 'viewer',
                ts: expect.any(Number)
            }));
        });

        it('should call global observer', () => {
            const globalOnEvent = jest.fn();
            const { result } = renderHook(() => useRiyilsObserver('carousel'), {
                wrapper: ({ children }) => (
                    <RiyilsObserverProvider onEvent={globalOnEvent}>
                        {children}
                    </RiyilsObserverProvider>
                )
            });

            act(() => {
                result.current.pause('vid-2', 'auto');
            });

            expect(globalOnEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'pause',
                videoId: 'vid-2'
            }));
        });

        it('should handle connection info if available', () => {
            const originalConnection = (navigator as any).connection;
            Object.defineProperty(navigator, 'connection', {
                value: { effectiveType: '4g', type: 'wifi' },
                configurable: true
            });

            const onEvent = jest.fn();
            const { result } = renderHook(() => useRiyilsObserver('viewer', onEvent));

            act(() => {
                result.current.playing('vid-3');
            });

            expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
                connection: { effectiveType: '4g', type: 'wifi' }
            }));

            Object.defineProperty(navigator, 'connection', { value: originalConnection, configurable: true });
        });

        it('should support all event types', () => {
            const onEvent = jest.fn();
            const { result } = renderHook(() => useRiyilsObserver('viewer', onEvent));

            act(() => {
                result.current.mute('v', true, 'user');
                result.current.seek('v', 10, 'gesture');
                result.current.ended('v', true);
                result.current.error('v', 'network');
                result.current.retry('v');
                result.current.heartbeat('v', 10, 100);
                result.current.waiting('v');
            });

            expect(onEvent).toHaveBeenCalledTimes(7);
        });
    });
});
