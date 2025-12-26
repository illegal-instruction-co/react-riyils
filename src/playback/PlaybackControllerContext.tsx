import React, { createContext, useContext, useMemo } from 'react'
import { PlaybackController } from '../playback-controller'

const PlaybackControllerContext = createContext<PlaybackController | null>(null)

export function PlaybackControllerProvider({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const controller = useMemo(() => new PlaybackController(), [])
    return (
        <PlaybackControllerContext.Provider value={controller}>
            {children}
        </PlaybackControllerContext.Provider>
    )
}

export function usePlaybackController(): PlaybackController {
    const ctx = useContext(PlaybackControllerContext)
    if (!ctx) {
        throw new Error('usePlaybackController must be used within PlaybackControllerProvider')
    }
    return ctx
}
