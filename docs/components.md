# Components Reference

## RiyilsViewer

A fullscreen, gesture-driven video swiper.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `videos` | `Video[]` | (Required) | Array of video objects to display. |
| `initialIndex` | `number` | `0` | The index of the video to start with. |
| `onClose` | `() => void` | (Required) | Callback when the viewer is closed. |
| `onVideoChange` | `(index: number) => void` | `undefined` | Callback fired when the active video changes. |
| `enableAutoAdvance`| `boolean` | `false` | If true, automatically swiper to the next video when the current one ends. |
| `progressBarColor` | `string` | `'#fff'` | Color of the progress bar at the top. |
| `translations` | `Partial<RiyilsTranslations>` | `defaultRiyilsTranslations` | Custom labels for UI elements. |
| `controls` | `RiyilsViewerControl[]` | `[]` | Custom control buttons to display in the bottom row. |

### Video Object Schema

```ts
interface Video {
  id: string;
  videoUrl: string | VideoQualityVariants;
  thumbnailUrl?: string;
  caption?: string;
}
```

---

## RiyilsCarousel

A horizontal preview strip for muted, looping video content.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `videos` | `Video[]` | (Required) | Array of videos to display. |
| `currentIndex` | `number` | `0` | Controlled index of the active slide. |
| `onVideoClick` | `(index: number) => void` | (Required) | Callback when a slide is clicked. |
| `onVideoChange` | `(index: number) => void` | (Required) | Callback when the slide changes via swipe. |
| `enableAutoAdvance`| `boolean` | `true` | Automatically move to the next slide when the current video ends. |
| `translations` | `Partial<ReactRiyilsTranslations>` | `defaultReactRiyilsTranslations` | Custom labels for UI elements. |

---

## RiyilsExplore

A masonry grid layout with "hover-to-play" previews.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `items` | `ExploreItem[]` | (Required) | Grid items containing preview and full video lists. |
| `viewerProps` | `Omit<RiyilsViewerProps, 'videos' | 'onClose'>` | `undefined` | Props to pass down to the internal `RiyilsViewer` when a tile is clicked. |
| `onItemClick` | `(item: ExploreItem) => void` | `undefined` | Callback fired when a tile is clicked. |

---

## Internationalization (i18n)

React Riyils supports internationalization through the `translations` prop on both `RiyilsViewer` and `RiyilsCarousel` components. This allows you to customize UI labels and accessibility text for different languages.

### RiyilsViewer Translations

The `RiyilsViewer` component accepts a `translations` prop of type `Partial<RiyilsTranslations>`:

```ts
interface RiyilsTranslations {
  close: string
  speedIndicator: string
  forward: string
  rewind: string
  play: string
  pause: string
  mute: string
  unmute: string
  videoPlayer: string
  more: string
  less: string
}
```

**Default translations:**
```ts
const defaultRiyilsTranslations = {
  close: 'Close',
  speedIndicator: '2x Speed',
  forward: '10s Forward',
  rewind: '10s Rewind',
  play: 'Play',
  pause: 'Pause',
  mute: 'Mute',
  unmute: 'Unmute',
  videoPlayer: 'Video player',
  more: 'more',
  less: 'less',
}
```

**Usage example:**
```tsx
import { RiyilsViewer, type RiyilsTranslations } from 'react-riyils'

const turkishTranslations: Partial<RiyilsTranslations> = {
  close: 'Kapat',
  play: 'Oynat',
  pause: 'Durdur',
  forward: '10sn İleri',
  rewind: '10sn Geri',
  mute: 'Sessiz',
  unmute: 'Ses Aç'
}

<RiyilsViewer
  videos={videos}
  onClose={handleClose}
  translations={turkishTranslations}
/>
```

### RiyilsCarousel Translations

The `RiyilsCarousel` component accepts a `translations` prop of type `Partial<ReactRiyilsTranslations>`:

```ts
interface ReactRiyilsTranslations {
  ctaButton: string
  carouselAriaLabel: string
  slideActiveAriaLabel: string
  slideInactiveAriaLabel: string
}
```

**Default translations:**
```ts
const defaultReactRiyilsTranslations = {
  ctaButton: 'Watch Full Video',
  carouselAriaLabel: 'Video stories',
  slideActiveAriaLabel: 'Watch full video',
  slideInactiveAriaLabel: 'Go to slide',
}
```

**Usage example:**
```tsx
import { RiyilsCarousel, type ReactRiyilsTranslations } from 'react-riyils'

const turkishTranslations: Partial<ReactRiyilsTranslations> = {
  ctaButton: 'Tam Videoyu İzle',
  carouselAriaLabel: 'Video hikayeleri',
  slideActiveAriaLabel: 'Tam videoyu izle',
  slideInactiveAriaLabel: 'Slayda git'
}

<RiyilsCarousel
  videos={videos}
  onVideoClick={handleVideoClick}
  translations={turkishTranslations}
/>
```

### Notes

- Translations are optional - if not provided, default English labels will be used
- You can provide only the translations you want to override
- All translation keys are used for accessibility attributes and UI labels
- The `translations` prop uses `Partial<T>` type, so you only need to provide the keys you want to customize
