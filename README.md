# React Riyils

React Riyils is a library for building high-performance vertical video experiences with Instagram/TikTok-style swiping, explore grids, and adaptive playback.

React Riyils handles browser autoplay policies, resource management, and mobile gesture interactions.

---

## Core Documentation

- [**Quick Start & Setup**](./docs/setup.md) - Installation, CSS imports, and the mandatory Playback Provider.
- [**Components Reference**](./docs/components.md) - Detailed props and types for `RiyilsViewer`, `RiyilsCarousel`, and `RiyilsExplore`.
- [**Interaction & Gestures**](./docs/interaction.md) - [Monetization / Ad Injection](docs/monetization.md)
- [Keyboard Shortcuts](docs/keyboard-shortcuts.md), and haptic feedback.
- [**Observability & Analytics**](./docs/observability.md) - Telemetry infrastructure, log levels, and custom instrumentation.

---

## Key Features

- **Deterministic Playback**: Enforcement of browser autoplay rules with automatic muted fallbacks.
- **Adaptive Quality**: Support for multiple quality variants and HLS via `hls.js`.
- **Resource Management**: Dynamic attachment/detachment of media elements to save memory.
- **Draggable MiniPlayer**: Picture-in-Picture implementation consistent across browsers.
- **Professional Telemetry**: Standardized event tracking with severity filtering and rich metadata.

---

## Quick Example

```tsx
import { 
  PlaybackControllerProvider, 
  RiyilsObserverProvider, 
  RiyilsCarousel,
  RiyilsViewer,
  RiyilsExplore
} from 'react-riyils'
import 'react-riyils/dist/index.css'

const MyVideoApp = () => (
  <RiyilsObserverProvider onEvent={console.log} logLevel="info">
    <PlaybackControllerProvider>
      <RiyilsCarousel
        videos={videos}
        onVideoChange={index => console.log('Active index:', index)}
      />

      <RiyilsViewer
        videos={videos}
        initialIndex={0}
        onClose={() => {}}
      />

      <RiyilsExplore items={exploreItems} />
    </PlaybackControllerProvider>
  </RiyilsObserverProvider>
)
```

---

## License

MIT © [illegal-instruction-co](https://github.com/illegal-instruction-co)
