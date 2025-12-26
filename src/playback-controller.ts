import { playDeterministic, type DeterministicPlayOptions } from './use-video-source'

export type PlaybackScope = 'viewer' | 'carousel'

type PlaybackSession = {
  token: number
  video: HTMLVideoElement
}

export type PlaybackRequest = {
  scope: PlaybackScope
  id: string
  video: HTMLVideoElement
  options: DeterministicPlayOptions
}

export type PlaybackResult = 'playing' | 'blocked' | 'failed' | 'cancelled'

function buildKey(scope: PlaybackScope, id: string): string {
  return `${scope}:${id}`
}

export class PlaybackController {
  private readonly sessions = new Map<string, PlaybackSession>()
  private globalToken = 0

  private nextToken(): number {
    this.globalToken += 1
    return this.globalToken
  }

  private cancelSession(key: string): void {
    const existing = this.sessions.get(key)
    if (!existing) return
    existing.video.pause()
    this.sessions.delete(key)
  }

  cancelAllExcept(key: string): void {
    Array.from(this.sessions.keys()).forEach((k) => {
      if (k !== key) this.cancelSession(k)
    })
  }

  async play(req: PlaybackRequest): Promise<PlaybackResult> {
    const key = buildKey(req.scope, req.id)
    this.cancelAllExcept(key)
    const token = this.nextToken()
    this.cancelSession(key)
    this.sessions.set(key, { token, video: req.video })
    const result = await playDeterministic(req.video, req.options)
    const current = this.sessions.get(key)
    if (current?.token !== token) {
      return 'cancelled'
    }
    if (result === 'playing') {
      return 'playing'
    }
    this.cancelSession(key)
    return result
  }

  reset(scope: PlaybackScope, id: string): void {
    this.cancelSession(buildKey(scope, id))
  }

  resetAll(): void {
    Array.from(this.sessions.keys()).forEach((k) => this.cancelSession(k))
  }
}
