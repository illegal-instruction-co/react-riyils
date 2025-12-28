# Ad Injection (Monetization) Guide

React Riyils provides a flexible Ad Injection system that allows you to seamlessly insert advertisements into the video feed without modifying the core library.

## Quick Start (Interval Based)

To inject an ad every fixed number of videos (e.g., every 5 videos):

```tsx
import { RiyilsViewer } from 'react-riyils'

<RiyilsViewer
  videos={myVideos}
  adConfig={{
    interval: 5,
    getAd: (index) => ({
      id: `ad-${index}`,
      videoUrl: 'https://example.com/ad.mp4',
      caption: 'Sponsored Content',
      // Add any other standard Video props
    })
  }}
/>
```

## Advanced Logic (Conditional Injection)

For more complex scenarios (e.g., "Insert ad if user is on WiFi AND index is divisible by 3"), use `shouldInject`:

```tsx
<RiyilsViewer
  videos={myVideos}
  adConfig={{
    shouldInject: (index) => {
      // Custom logic
      if (index === 0) return false // Don't show ad at start
      if (isUserPremium()) return false // No ads for premium
      return index % 3 === 0
    },
    getAd: (index) => fetchAdForIndex(index)
  }}
/>
```

## API Reference

### `AdConfig` Interface

| Property | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number` | (Optional) Inject ad every N videos. Ignored if `shouldInject` is provided. |
| `shouldInject` | `(index: number) => boolean` | (Optional) Callback to determine if an ad should be injected at the current **original** video index. |
| `getAd` | `(index: number) => Video` | **Required.** Callback that returns the Ad Video object to be inserted. |

## Notes

- **Zero UI Impact:** Ads are rendered exactly like normal videos. You can customize their appearance by providing a custom overlay if needed, or by identifying them via their ID in your own UI components.
- **Performance:** Injected ads take full advantage of the Core Engine features (Persistent Caching, Network Awareness, Preloading).
