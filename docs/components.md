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

---

## RiyilsExplore

A masonry grid layout with "hover-to-play" previews.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `items` | `ExploreItem[]` | (Required) | Grid items containing preview and full video lists. |
| `viewerProps` | `Omit<RiyilsViewerProps, 'videos' | 'onClose'>` | `undefined` | Props to pass down to the internal `RiyilsViewer` when a tile is clicked. |
| `onItemClick` | `(item: ExploreItem) => void` | `undefined` | Callback fired when a tile is clicked. |
