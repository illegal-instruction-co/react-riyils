# React Riyils

**The most performant React component for Instagram-like reels, stories, and vertical video feeds.**

Check out the live demo here: **Demo**

React Riyils helps you add mobile-friendly, touch-enabled video carousels and fullscreen viewers to your web projects.
It goes beyond simple playback by offering **Smart Quality Selection** and **HLS Support** out of the box.

---

## Features

- **Mobile-first**  
  Fully responsive touch gestures (swipe, tap to pause, double tap to seek)

- **HLS Support**  
  Native support for `.m3u8` streaming via `hls.js`

- **Smart MP4 Selection**  
  Automatically serves low, mid, or high quality MP4s based on network speed and device

- **High Performance**  
  Virtualized slides, infinite scroll, and dynamic loading

- **Customizable**  
  TypeScript support, custom translations, and flexible styling

---

## Installation

```bash
npm install react-riyils
```

---

## Usage

### 1. Basic Usage

Import the components and styles.

```tsx
import { ReactRiyils, RiyilsViewer } from 'react-riyils';
import 'react-riyils/dist/index.css';
import { useState } from 'react';
```

```tsx
const videos = [
  { id: '1', videoUrl: 'https://example.com/video.mp4' },
  { id: '2', videoUrl: 'https://example.com/stream.m3u8' },
];

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  return (
    <>
      <ReactRiyils
        videos={videos}
        currentIndex={currentIndex}
        onVideoClick={() => setShowViewer(true)}
        onVideoChange={setCurrentIndex}
      />

      {showViewer && (
        <RiyilsViewer
          videos={videos}
          initialIndex={currentIndex}
          onClose={() => setShowViewer(false)}
          onVideoChange={setCurrentIndex}
        />
      )}
    </>
  );
}

export default App;
```

---

## Smart MP4 Quality Selection

If you do not use HLS but have multiple MP4 qualities, you can provide an object.
The component automatically selects the best quality based on network speed and device.

```tsx
const adaptiveVideos = [
  {
    id: '3',
    videoUrl: {
      low: 'https://example.com/video_360p.mp4',
      mid: 'https://example.com/video_720p.mp4',
      high: 'https://example.com/video_1080p.mp4',
    },
  },
];
```

---

## Video Source Format

You can pass either a string or a quality object.

| Type | Example | Description |
|------|--------|-------------|
| String | `https://.../video.mp4` | Standard MP4 playback |
| String (HLS) | `https://.../master.m3u8` | Adaptive streaming via HLS.js |
| Object | `{ low: '...', high: '...' }` | Smart selection based on device and network |

---

## Props

### `<ReactRiyils />` (Carousel)

| Prop | Type | Description |
|------|------|-------------|
| videos | array | List of video objects |
| currentIndex | number | Active video index |
| onVideoClick | function | Triggered on video click |
| onVideoChange | function | Triggered when active video changes |
| translations | object | Optional custom UI text |
| containerHeightMobile | number | Optional mobile height (px) |
| containerHeightDesktop | number | Optional desktop height (px) |

---

### `<RiyilsViewer />` (Fullscreen)

| Prop | Type | Description |
|------|------|-------------|
| videos | array | List of video objects |
| initialIndex | number | Starting index |
| onClose | function | Triggered on close |
| onVideoChange | function | Triggered when active video changes |
| translations | object | Optional custom UI text |
| enableAutoAdvance | boolean | Enable auto-advance to next video when current ends (default: false)

---

## Customization

- **Translations**  
  Pass a `translations` object to override default UI text

- **Styling**  
  Override CSS classes such as `.react-riyils__slide-button` for custom designs

---

## License

MIT

---

## Credits

- Built with React and Swiper
- HLS support powered by hls.js
