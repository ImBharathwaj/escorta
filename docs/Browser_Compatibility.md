# Browser & Device Compatibility — Video Call & Live Stream

## Supported Browsers

### Desktop

| Browser         | Version | Video Call | Live Stream (Viewer) | Live Stream (Broadcaster) | Notes                                |
|----------------|---------|------------|----------------------|---------------------------|--------------------------------------|
| Chrome          | 90+     | ✅          | ✅                    | ✅                         | Best experience; supports all features |
| Firefox         | 95+     | ✅          | ✅                    | ✅                         | Full support                         |
| Safari          | 15+     | ✅          | ✅                    | ✅                         | Requires user gesture for audio/mic  |
| Edge (Chromium) | 90+     | ✅          | ✅                    | ✅                         | Chromium-based, same as Chrome       |

### Mobile

| Browser              | OS      | Video Call | Live Stream (Viewer) | Live Stream (Broadcaster) | Notes                                              |
|---------------------|---------|------------|----------------------|---------------------------|----------------------------------------------------|
| Chrome               | Android | ✅          | ✅                    | ✅                         | Full support                                       |
| Firefox              | Android | ✅          | ✅                    | ✅                         | Full support                                       |
| Samsung Internet     | Android | ✅          | ✅                    | ✅                         | Chromium-based                                     |
| Safari               | iOS 15+ | ✅          | ✅                    | ✅                         | Requires user gesture; fullscreen uses `webkitEnterFullscreen` |
| Chrome               | iOS     | ✅          | ✅                    | ✅                         | Uses WebKit engine on iOS                          |
| Firefox              | iOS     | ✅          | ✅                    | ✅                         | Uses WebKit engine on iOS                          |

## Known Limitations

### iOS Safari / All iOS Browsers

- **User gesture required**: Camera, microphone, and audio playback all require a direct user tap. The app shows an "Enable camera & mic" button for this reason.
- **Fullscreen**: Only `<video>` elements can enter true fullscreen via `webkitEnterFullscreen()`. The container fullscreen API is not available. The app falls back to video-element fullscreen automatically.
- **Picture-in-Picture**: Not available on iOS Safari for incoming WebRTC streams.
- **Background tabs**: iOS aggressively suspends WebRTC connections when the browser is backgrounded. Users may need to rejoin after switching apps.

### HTTP / Mixed Content

- **HTTPS required**: `getUserMedia()` (camera/mic) is only available in secure contexts. The app must be served over HTTPS with a trusted certificate. `localhost` is an exception.
- **VOD streaming**: VOD playback from MinIO uses a same-origin proxy (`/api/vods/[id]/stream`) to avoid mixed-content issues when the app is served over HTTPS but MinIO is on HTTP.

### Firefox

- **`captureStream()`**: The `mozCaptureStream()` variant is used for VOD-to-live broadcasting. This is a non-standard API and may behave differently than Chrome's `captureStream()`.
- **Adaptive bitrate**: WebRTC simulcast is well supported but may use slightly different quality layers than Chrome.

### Older Browsers

- **IE 11**: Not supported (no WebRTC, no ES modules).
- **Safari < 15**: Partial WebRTC support; getUserMedia may fail silently. Upgrade recommended.
- **Chrome < 70**: Missing key WebRTC features. Not supported.

## HTTPS Certificate Requirements

For development and testing on local network devices (e.g., mobile phone on the same WiFi):

```bash
npx next dev -H 192.168.x.x --experimental-https
```

This generates a self-signed certificate. On mobile, you may need to accept the certificate warning.

For production, use a trusted TLS certificate (e.g., via Let's Encrypt / Cloudflare / AWS ACM).

## Reconnection Behavior

LiveKit's client SDK has built-in reconnection. The app layers additional handling:

- **Reconnecting state**: A "Reconnecting…" banner appears during network interruptions.
- **Reconnected**: The banner clears and the stream continues.
- **Permanent disconnect**: If reconnection fails (server-side room deletion, participant removal), the session is ended gracefully.
- **`beforeunload`**: When the user closes the tab, a `keepalive` fetch fires to call the end/leave API.

## Timer / Clock Drift

Server APIs include `serverNow` in responses. The client computes a clock offset:

```
clockOffset = serverNow - clientNow
```

All countdown timers use `Date.now() + clockOffset` as the effective "now", keeping expiry timers accurate even if the client clock is off by several seconds.
