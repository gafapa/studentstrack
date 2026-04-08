# StudentsTrack

StudentsTrack is a browser-based classroom attention monitor built with React, TypeScript, and Vite. It uses the webcam plus MediaPipe face landmark detection to estimate student attention states locally in the browser.

## Highlights

- Stable per-face tracking IDs to reduce flicker and misclassification when MediaPipe changes detection order.
- Relaxed face-detection thresholds plus short-lived track retention so faces are less likely to disappear when students look down at a book.
- Explicit camera lifecycle management with cleanup on reset, stop, and unmount.
- Welcome-screen language selection for Spanish, Galician, English, French, German, Portuguese, Catalan, and Basque.
- Sleepy-student tracking in the live summary, timeline, and session export.
- Installable PWA setup with manifest, service worker, standalone display, and app icons.
- Session export with consistent sample naming and production-ready static asset paths.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- MediaPipe Tasks Vision

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The Vite build is configured with the `/studentstrack/` base path so the generated production assets resolve correctly when the application is deployed under that route.

## Installable App

The project ships a web app manifest, app icons, and a service worker so compatible browsers can install it as a standalone application under `/studentstrack/`.
