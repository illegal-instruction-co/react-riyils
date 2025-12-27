

## Table of Contents

- [Why this exists](#why-this-exists)
- [What it provides](#what-it-provides)
- [Features](#features)
- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Video object](#video-object)
- [Adaptive sources](#adaptive-sources-optional)
- [Notes on autoplay](#notes-on-autoplay)
- [Carousel vs Viewer](#carousel-vs-viewer)
- [Non-goals](#non-goals)
- [Mental Model](#mental-model)


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

### Observing (Optional)

React Riyils provides a passive event stream that allows playback behavior
to be observed without affecting it.

Events may include:
- play / pause
- mute / unmute
- seek (gesture or keyboard)
- errors and retries
- video completion

Observing is optional and has no impact on playback if unused.

```
useRiyilsObserver('viewer', (e) => setState(e))
```

!!! Do not bind observer events directly to React state updates:

#### Usage

```ts
import { useRiyilsObserver } from 'react-riyils'

// This hook is typically called inside the viewer or carousel surface.
useRiyilsObserver('viewer', (event) => {
  console.log(event)
})
```

Each event includes a type, scope (carousel or viewer), and videoId,
with additional context depending on the action.

Notes

The observing system is read-only by design.
It is intended for analytics, logging, and debugging,
not for controlling playback behavior.

## Installation

```bash
npm install react-riyils
```

---

## Basic usage



### PlaybackControllerProvider

The `PlaybackControllerProvider` component can be used to wrap both the Carousel (`ReactRiyils`) and Viewer (`RiyilsViewer`) components. This provider manages video playback control and synchronization. It is typically used as a top-level container:

```tsx
import { PlaybackControllerProvider, ReactRiyils, RiyilsViewer } from 'react-riyils'

<PlaybackControllerProvider>
  <ReactRiyils ... />
  {/* or */}
  <RiyilsViewer ... />
</PlaybackControllerProvider>
```

Basic functionality works without this provider, but it is recommended when using multiple video components or when advanced playback control is needed.

---

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


### Adding Custom Controls to the Viewer

You can add your own custom control buttons (such as like, share, etc.) to the viewer by passing a `controls` prop to the `RiyilsViewer` component. Each control is an object with properties like `id`, `icon`, `ariaLabel`, `onClick`, and optional `active` or `className`.

Example:

```tsx
import { RiyilsViewer } from 'react-riyils'
import { useState } from 'react'

const [liked, setLiked] = useState(false)

const viewerControls = [
  {
    id: 'like',
    icon: (
      <i
        className={`fa-${liked ? 'solid' : 'regular'} fa-heart`}
        style={{ fontSize: 20, color: liked ? '#ef4444' : 'white' }}
      />
    ),
    ariaLabel: liked ? 'Unlike' : 'Like',
    onClick: () => setLiked(v => !v),
    active: () => liked,
    className: 'react-riyils-viewer__btn-like',
  },
]

<RiyilsViewer
  videos={videos}
  initialIndex={0}
  onClose={() => setOpen(false)}
  controls={viewerControls}
/>
```

This allows you to add interactive buttons to the viewer's control panel. You can use any React element as the icon, and manage state as needed.

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

## Carousel vs Viewer

React Riyils exposes two video surfaces:

### Carousel
- Preview-oriented
- Always muted
- Short-lived playback
- Optimized for multiple videos on screen

### Viewer
- Fullscreen, immersive
- Gesture-driven
- Deterministic playback
- One active video at a time

Both surfaces share the same media engine,
but apply different playback rules.

---

## Non-goals

* Advanced animations or transitions
* Video editing or timelines
* Opinionated styling systems
* Social platform abstractions

---

## Mental Model

React Riyils is built around a simple idea:

> At any moment, only one video is allowed to truly play.

Everything else exists to enforce this rule across browsers,
gestures, autoplay policies, and multiple video surfaces.

To achieve this, the library is split into two distinct layers:

1. Media lifecycle (loading, attaching, detaching sources)
2. Playback control (who is allowed to play, and when)

Most of the complexity exists to keep this invariant true.

This invariant is enforced internally by a playback controller
that prevents overlapping or outdated play attempts.

--- 

## Internal Architecture (Optional Reading)

Hooks are grouped by responsibility:

### Media & Source Management
- useVideoSource
- useRiyilsPreload
- useCarouselPreload

### Playback & State
- useRiyilsPlayback
- useCarouselPlayback
- PlaybackController

### Platform Guards
- useIosSafariGuard
- useIosAutoplayUnlock

Most users do not need to interact with these directly.

---

## Design Constraints

React Riyils intentionally avoids:

- animation-heavy abstractions
- CSS-in-JS
- hidden global state
- browser-specific hacks without fallback

The goal is correctness first, visuals second.

---

## Who is this for?

React Riyils is intended for developers who need
a reliable vertical video experience without building
a full media system from scratch.

It is especially useful when:
- browser autoplay behavior matters
- mobile gesture handling is required
- multiple videos must coexist safely

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

## Contributions

This project is intentionally small.
Improvements around edge cases, browser behavior,
or documentation are welcome.

--- 

## License

MIT

---

This project is shared as-is. It reflects one possible approach to handling vertical video on the web and may be useful as a reference or a starting point.
