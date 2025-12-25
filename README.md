
[![npm version](https://img.shields.io/npm/v/react-riyils.svg)](https://www.npmjs.com/package/react-riyils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# React Riyils

Check out the live demo here: [Demo](https://illegal-instruction-co.github.io/react-riyils/)


React Riyils is a React component for building Instagram-style vertical video stories and reels. It helps you add mobile-friendly, touch-enabled video carousels and fullscreen viewers to your web projects with ease.

## Features

Features:

- Mobile-first and fully responsive
- Smooth, high-performance video playback
- Touch, mouse, and keyboard navigation
- Infinite scroll and dynamic loading
- TypeScript support
- Customizable UI and translations
- Lightweight and easy to integrate

## Demo

See the live demo: [Demo Page](./demo.html)

## Installation

```
npm install react-riyils
```

## Usage

```jsx
import { ReactRiyils, RiyilsViewer } from 'react-riyils';

const videos = [
  { id: '1', videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4' },
  { id: '2', videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4' },
  // ...more videos
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
```

## Props

### `<ReactRiyils />`

| Prop                | Type     | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `videos`            | array    | List of video objects `{ id, videoUrl }`         |
| `currentIndex`      | number   | Index of the currently active video              |
| `onVideoClick`      | func     | Called when a video is clicked                   |
| `onVideoChange`     | func     | Called when the active video changes             |
| `translations`      | object   | (Optional) Custom UI text                        |
| `containerHeightMobile` | number | (Optional) Height for mobile view                |
| `containerHeightDesktop` | number | (Optional) Height for desktop view              |

### `<RiyilsViewer />`

| Prop                | Type     | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `videos`            | array    | List of video objects `{ id, videoUrl }`         |
| `initialIndex`      | number   | Index to open the viewer at                      |
| `onClose`           | func     | Called when the viewer is closed                 |
| `onVideoChange`     | func     | Called when the active video changes             |
| `translations`      | object   | (Optional) Custom UI text                        |

## Customization

- **Translations:** Pass a `translations` object to override default UI text.
- **Styling:** Use your own CSS or extend the included styles for custom look.

## License

MIT

## Credits

- Built with [React](https://reactjs.org/)
- Video samples from [W3Schools](https://www.w3schools.com/), [Google Sample Videos](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/)

---

For more details, see the source code and demo.
