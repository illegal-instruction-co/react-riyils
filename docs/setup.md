# Setup and Installation

## Installation

Install the package via npm or yarn:

```bash
npm install react-riyils
yarn add react-riyils
```

## CSS Integration

React Riyils requires its base styles to function correctly. Import the CSS file at the entry point of your application (usually `App.tsx` or `main.tsx`):

```tsx
import 'react-riyils/dist/index.css'
```

## Playback Controller Provider

To manage synchronized video playback and ensure that only one video plays at a time, you must wrap components that use the viewer or explore grid with the `PlaybackControllerProvider`.

> [!IMPORTANT]
> The `RiyilsViewer` and `RiyilsExplore` components will throw an error if they are not rendered inside a `PlaybackControllerProvider`.

### Basic Usage

```tsx
import { PlaybackControllerProvider } from 'react-riyils'

function App() {
  return (
    <PlaybackControllerProvider>
      {children}
    </PlaybackControllerProvider>
  )
}
```

## Internationalization

React Riyils supports internationalization through translation props. See the [Components Reference](./components.md#internationalization-i18n) for detailed information on customizing UI labels and accessibility text.

### TypeScript Support

When you install `react-riyils`, TypeScript types are automatically included. You can import translation interfaces:

```tsx
import {
  RiyilsViewer,
  RiyilsCarousel,
  type RiyilsTranslations,
  type ReactRiyilsTranslations
} from 'react-riyils'
```
