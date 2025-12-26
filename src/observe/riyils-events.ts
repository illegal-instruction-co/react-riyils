export type RiyilsScope = 'carousel' | 'viewer'

export type RiyilsEvent =
    | {
        type: 'play'
        scope: RiyilsScope
        videoId: string
        reason: 'user' | 'auto' | 'resume'
    }
    | {
        type: 'pause'
        scope: RiyilsScope
        videoId: string
        reason: 'user' | 'auto' | 'visibility' | 'error'
    }
    | {
        type: 'mute'
        scope: RiyilsScope
        videoId: string
        muted: boolean
        reason: 'user' | 'autoplay'
    }
    | {
        type: 'ended'
        scope: RiyilsScope
        videoId: string
        autoAdvance: boolean
    }
    | {
        type: 'error'
        scope: RiyilsScope
        videoId: string
        error: 'network' | 'decode' | 'autoplay-blocked' | 'unknown'
    }
    | {
        type: 'retry'
        scope: RiyilsScope
        videoId: string
    }
    | {
        type: 'seek'
        scope: RiyilsScope
        videoId: string
        delta: number
        method: 'gesture' | 'keyboard'
    }

export type RiyilsEventInput =
    | Omit<Extract<RiyilsEvent, { type: 'play' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'pause' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'mute' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'ended' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'error' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'retry' }>, 'scope'>
    | Omit<Extract<RiyilsEvent, { type: 'seek' }>, 'scope'>