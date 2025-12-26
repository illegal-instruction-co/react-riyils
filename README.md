# React Riyils

A small, focused React library for building vertical video carousels and fullscreen viewers.

React Riyils exists because we could not find a simple, well-behaved solution for Instagram/TikTok-style video experiences on the web that handled real browser constraints correctly.

Live demo: [https://illegal-instruction-co.github.io/react-riyils](https://illegal-instruction-co.github.io/react-riyils)

---

## Why this exists

Modern web video is harder than it looks.

Autoplay restrictions, mobile gesture handling, network variability, and performance constraints often turn simple video feeds into fragile implementations. We tried several existing approaches and ended up building a minimal system that focuses on correctness first, visuals second.

This project is the result of that exploration.

---

## What it provides

React Riyils is intentionally limited in scope. It does not try to be a full media framework.

It provides:

* Vertical swipe navigation based on Swiper
* A fullscreen viewer with gesture-based controls
* Deterministic video playback handling
* Adaptive video source loading
* Careful resource management for multiple videos

---

## Features

### Interaction

* Vertical swipe navigation
* Tap, double-tap, and long-press gestures
* Keyboard controls for desktop environments

### Playback

* Explicit handling of browser autoplay policies
* Automatic muted fallback when required
* Cancellation of outdated playback attempts
* Predictable play / pause behavior

### Video loading

* Optional adaptive quality selection
* Optional HLS (.m3u8) support via hls.js
* Controlled preloading around the active index
* Cleanup on unmount to avoid leaks

### Performance

* Virtualized slides
* Limited number of mounted video elements
* No global state or heavy contexts

---

## Installation

```bash
npm install react-riyils
```

---

## Basic usage

### Carousel

```tsx
import { ReactRiyils } from 'react-riyils'

const videos = [
  {
    id: '1',
    videoUrl: '/video.mp4'
  }
]

<ReactRiyils
  videos={videos}
  onVideoClick={(index) => console.log(index)}
  onVideoChange={(index) => console.log(index)}
/>
```

The carousel is intended for preview-style usage:

* Muted playback
* Looping videos
* Lightweight interaction

---

### Fullscreen viewer

```tsx
import { RiyilsViewer } from 'react-riyils'

<RiyilsViewer
  videos={videos}
  initialIndex={0}
  onClose={() => setOpen(false)}
/>
```

The viewer is designed for focused consumption with gesture and keyboard support.

---

## Video object

Both components use the same Video shape:

```ts
export interface Video {
  id: string
  videoUrl: string | VideoQualityVariants
  thumbnailUrl?: string
  captionUrl?: string
}
```

While the shape is shared, the runtime behavior differs depending on where it is used. These differences are handled internally and do not require separate configuration.

---

## Adaptive sources (optional)

A single URL is sufficient in most cases:

```ts
{ id: '1', videoUrl: '/video.mp4' }
```

If multiple qualities are available, they can be provided:

```ts
{
  id: '1',
  videoUrl: {
    low: '/video_360.mp4',
    mid: '/video_720.mp4',
    high: '/video_1080.mp4'
  }
}
```

Source selection is based on basic signals such as screen size and network conditions. This is optional and can be ignored.

---

## Notes on autoplay

Browsers impose strict autoplay rules, especially on mobile.

React Riyils does not try to bypass these rules. Instead, it detects failures, retries safely, and falls back to muted playback when necessary. The goal is to behave predictably rather than force playback.

---

## Non-goals

* Advanced animations or transitions
* Video editing or timelines
* Opinionated styling systems
* Social platform abstractions

---

## Mobile & iOS Safari Notes

Mobile browsers, especially iOS Safari, apply stricter rules to video playback than desktop browsers.

As a result, you may observe behaviors such as:
- Autoplay starting muted
- Playback pausing when the page is backgrounded or orientation changes
- Playback requiring a user interaction on first use

These behaviors are platform constraints rather than configuration issues.

React Riyils is designed to handle these cases automatically.  
No additional setup or platform-specific code is required.

---

## License

MIT

---

This project is shared as-is. It reflects one possible approach to handling vertical video on the web and may be useful as a reference or a starting point.
