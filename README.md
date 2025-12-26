# React Riyils

A React component for vertical video feeds (Reels/Stories style) with a carousel + fullscreen viewer, built on Swiper.
Includes MP4 quality selection and optional HLS playback via hls.js.

Live demo: [https://illegal-instruction-co.github.io/react-riyils](https://illegal-instruction-co.github.io/react-riyils)

## Why this exists

I couldn’t find a small, open-source, React-first vertical video swiper that:

* works on mobile and desktop,
* supports both MP4 and HLS,
* and handles real-world constraints like preloading, cleanup, and safe playback attempts.

React Riyils is a pragmatic component, not a full video SDK.

## Features

* Vertical swipe viewer and a coverflow-style carousel
* MP4 or HLS (.m3u8) sources
* MP4 quality variants (low/mid/high) selected from device + network hints
* Virtualized slides for performance
* Keyboard support (carousel + viewer)
* Retry UI on playback errors
* TypeScript types and translation hooks

## Non-goals

This project does not aim to be:

* a DRM solution,
* a fully featured video analytics platform,
* a replacement for native mobile video SDKs.

Autoplay behavior is browser-dependent. Some platforms require user interaction to start playback with sound, and some may block playback entirely under certain conditions.

## Installation

```bash
npm install react-riyils
```

## Basic usage

Import the components and the stylesheet.

```tsx
import { useState } from 'react'
import { ReactRiyils, RiyilsViewer, type Video } from 'react-riyils'
import 'react-riyils/dist/index.css'

const videos: Video[] = [
  { id: '1', videoUrl: 'https://example.com/video.mp4' },
  { id: '2', videoUrl: 'https://example.com/stream.m3u8' },
]

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <>
      <ReactRiyils
        videos={videos}
        currentIndex={currentIndex}
        onVideoClick={() => setOpen(true)}
        onVideoChange={setCurrentIndex}
      />

      {open && (
        <RiyilsViewer
          videos={videos}
          initialIndex={currentIndex}
          onClose={() => setOpen(false)}
          onVideoChange={setCurrentIndex}
        />
      )}
    </>
  )
}
```

## Video source format

`videoUrl` supports:

* a direct URL string (MP4 or .m3u8)
* a quality-variant object for MP4

```ts
export type VideoQualityVariants = {
  low?: string
  mid?: string
  high?: string
}

export type Video = {
  id: string
  videoUrl: string | VideoQualityVariants
  thumbnailUrl?: string
  captionUrl?: string
}
```

### MP4 quality variants

If you provide multiple MP4 qualities, React Riyils chooses a source using network/device hints.

```tsx
const videos: Video[] = [
  {
    id: '3',
    videoUrl: {
      low: 'https://example.com/video_360p.mp4',
      mid: 'https://example.com/video_720p.mp4',
      high: 'https://example.com/video_1080p.mp4',
    },
  },
]
```

Notes:

* This is a selection step, not adaptive bitrate streaming.
* If you need true ABR, use HLS.

## Components

### ReactRiyils (carousel)

A horizontally scrollable carousel with preview playback for the active slide.

Props:

* `videos: Video[]`
* `currentIndex?: number`
* `onVideoClick: (index: number) => void`
* `onVideoChange: (index: number) => void`
* `translations?: Partial<ReactRiyilsTranslations>`
* `containerHeightMobile?: number`
* `containerHeightDesktop?: number`
* `enableAutoAdvance?: boolean`

Translations:

```ts
export type ReactRiyilsTranslations = {
  ctaButton: string
  carouselAriaLabel: string
  slideActiveAriaLabel: string
  slideInactiveAriaLabel: string
}
```

### RiyilsViewer (fullscreen)

A fullscreen vertical swiper with gestures and progress UI.

Props:

* `videos: Video[]`
* `initialIndex?: number`
* `onClose: () => void`
* `onVideoChange?: (index: number) => void`
* `translations?: Partial<RiyilsTranslations>`
* `progressBarColor?: string`
* `enableAutoAdvance?: boolean`

Translations:

```ts
export type RiyilsTranslations = {
  close: string
  speedIndicator: string
  forward: string
  rewind: string
}
```

## Playback behavior

* Playback is attempted for the active slide only.
* Autoplay is attempted with muted fallback when allowed by the browser.
* If playback fails, the component may surface a paused state or an error overlay depending on the error path.
* HLS is supported via hls.js when the environment supports it.

Important: A strict “100% deterministic autoplay” guarantee is not possible on the web across browsers due to platform autoplay policies and power-saving/network conditions. The goal here is predictable best-effort behavior with safe fallback states.

## Styling

The package ships with default styles.

You can override CSS classes (examples):

* `.react-riyils__container`
* `.react-riyils__card`
* `.react-riyils-viewer`
* `.react-riyils-viewer__video`

## Roadmap

* Buffering / waiting UI state surfaced as a first-class state
* Optional telemetry hooks (play failures, first-frame time, stalls)
* More caption controls (label, language, default enable)
* Public API contract section with explicit guarantees and undefined behavior

## License

MIT

## Credits

* React + Swiper
* hls.js for HLS playback
