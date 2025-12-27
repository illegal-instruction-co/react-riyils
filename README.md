# React Riyils

A React library for building high-performance vertical video experiences with Instagram/TikTok-style swiping, explore grids, and adaptive playback.

React Riyils handles the heavy lifting of browser autoplay policies, resource management, and mobile gesture interactions, allowing you to focus on your UI.

[Live Demo](https://illegal-instruction-co.github.io/react-riyils)

---

## Core Documentation

Browse the detailed guides below for integration and API reference:

- [**Quick Start & Setup**](./docs/setup.md) - Installation, CSS imports, and the mandatory Playback Provider.
- [**Components Reference**](./docs/components.md) - Detailed props and types for `RiyilsViewer`, `RiyilsCarousel`, and `RiyilsExplore`.
- [**Interaction & Gestures**](./docs/interaction.md) - Mobile gestures, keyboard shortcuts, and haptic feedback.

---

## Quick Example

```tsx
import { PlaybackControllerProvider, RiyilsCarousel } from 'react-riyils'
import 'react-riyils/dist/index.css'

const MyVideoApp = () => (
  <PlaybackControllerProvider>
    <RiyilsCarousel
      videos={[{ id: '1', videoUrl: 'video.mp4' }]}
      onVideoClick={(i) => console.log(i)}
      onVideoChange={(i) => console.log(i)}
    />
  </PlaybackControllerProvider>
)
```

---

## Key Features

- **Deterministic Playback**: Strict enforcement of browser autoplay rules with automatic muted fallbacks.
- **Adaptive Quality**: Built-in support for multiple quality variants and HLS (`.m3u8`) via `hls.js`.
- **Resource Management**: Only one video plays at a time; inactive videos are attached/detached dynamically to save memory.
- **Draggable MiniPlayer**: A custom implementation of Picture-in-Picture that works consistently across all browsers.
- **Premium UI**: Smooth spring animations, glassmorphism effects, and native-feeling swiping.

## License

MIT © [illegal-instruction-co](https://github.com/illegal-instruction-co)
