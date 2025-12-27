export type RiyilsScope = 'carousel' | 'viewer'
export type RiyilsLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

export interface RiyilsMetadata {
    ts: number
    level: RiyilsLogLevel
    connection?: {
        effectiveType?: string
        type?: string
    }
}

export type RiyilsEvent = (
    | {
        type: 'play'
        level: 'info'
        videoId: string
        reason: 'user' | 'auto' | 'resume'
    }
    | {
        type: 'pause'
        level: 'info'
        videoId: string
        reason: 'user' | 'auto' | 'visibility' | 'error'
    }
    | {
        type: 'mute'
        level: 'info'
        videoId: string
        muted: boolean
        reason: 'user' | 'autoplay'
    }
    | {
        type: 'ended'
        level: 'info'
        videoId: string
        autoAdvance: boolean
    }
    | {
        type: 'error'
        level: 'error'
        videoId: string
        error: 'network' | 'decode' | 'autoplay-blocked' | 'unknown'
    }
    | {
        type: 'retry'
        level: 'warn'
        videoId: string
    }
    | {
        type: 'seek'
        level: 'info'
        videoId: string
        delta: number
        method: 'gesture' | 'keyboard'
    }
    | {
        type: 'heartbeat'
        level: 'debug'
        videoId: string
        position: number
        duration: number
    }
    | {
        type: 'waiting'
        level: 'debug'
        videoId: string
    }
    | {
        type: 'playing'
        level: 'debug'
        videoId: string
    }
) & RiyilsMetadata & { scope: RiyilsScope }

export type RiyilsEventInput =
    | { type: 'play'; videoId: string; reason: 'user' | 'auto' | 'resume' }
    | { type: 'pause'; videoId: string; reason: 'user' | 'auto' | 'visibility' | 'error' }
    | { type: 'mute'; videoId: string; muted: boolean; reason: 'user' | 'autoplay' }
    | { type: 'ended'; videoId: string; autoAdvance: boolean }
    | { type: 'error'; videoId: string; error: 'network' | 'decode' | 'autoplay-blocked' | 'unknown' }
    | { type: 'retry'; videoId: string }
    | { type: 'seek'; videoId: string; delta: number; method: 'gesture' | 'keyboard' }
    | { type: 'heartbeat'; videoId: string; position: number; duration: number }
    | { type: 'waiting'; videoId: string }
    | { type: 'playing'; videoId: string }


