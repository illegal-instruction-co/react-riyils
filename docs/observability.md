# Observability & Analytics

React Riyils provides a professional telemetry infrastructure for monitoring playback performance and user engagement.

## RiyilsObserverProvider

The `RiyilsObserverProvider` is the central hub for global event listening. It supports a `logLevel` prop to filter events by severity.

### Usage

```tsx
import { RiyilsObserverProvider } from 'react-riyils'

const App = () => (
  <RiyilsObserverProvider 
    onEvent={event => trackEvent(event)}
    logLevel="info"
  >
    <MyComponents />
  </RiyilsObserverProvider>
)
```

### Log Levels

Events are filtered based on the following hierarchy (most specific to least):
- `debug`: Detailed technical events (heartbeats, buffering transitions).
- `info`: Primary user actions and state changes (play, pause, mute).
- `warn`: Non-critical issues or retries.
- `error`: Critical playback failures.
- `none`: Disables all telemetry.

## Event Schema

Every event emitted by the library includes standardized metadata.

### Metadata Properties
- `ts`: High-resolution timestamp.
- `level`: Event severity (`debug` | `info` | `warn` | `error`).
- `connection`: Network state metadata (`effectiveType`, `type`).
- `scope`: Event source (`carousel` | `viewer`).
- `position`: Current media timestamp at the moment of emission.

## Custom Instrumentation

Developers can participate in the telemetry flow by using the `useRiyilsObserver` hook.

```tsx
import { useRiyilsObserver } from 'react-riyils'

const CustomComponent = () => {
  const observer = useRiyilsObserver('viewer')

  const onAction = () => {
    observer.play('id', 'user')
  }

  return <button onClick={onAction}>Invoke</button>
}
```
