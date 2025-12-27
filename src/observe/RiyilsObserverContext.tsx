import React, { createContext, useContext, useMemo } from 'react'
import type { RiyilsEvent, RiyilsLogLevel } from './riyils-events'

interface RiyilsObserverContextValue {
    onEvent?: (event: RiyilsEvent) => void
    logLevel: RiyilsLogLevel
}

const RiyilsObserverContext = createContext<RiyilsObserverContextValue>({
    logLevel: 'info'
})

const LEVEL_MAP: Record<RiyilsLogLevel, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'none': 4
}

export function RiyilsObserverProvider({
    children,
    onEvent,
    logLevel = 'info'
}: Readonly<{
    children: React.ReactNode
    onEvent?: (event: RiyilsEvent) => void
    logLevel?: RiyilsLogLevel
}>) {
    const value = useMemo(() => {
        const filteredHandler = (event: RiyilsEvent) => {
            if (LEVEL_MAP[event.level] >= LEVEL_MAP[logLevel]) {
                onEvent?.(event)
            }
        }
        return { onEvent: onEvent ? filteredHandler : undefined, logLevel }
    }, [onEvent, logLevel])

    return (
        <RiyilsObserverContext.Provider value={value}>
            {children}
        </RiyilsObserverContext.Provider>
    )
}

export function useGlobalRiyilsObserver() {
    return useContext(RiyilsObserverContext)
}

