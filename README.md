# StudentsTrack

StudentsTrack is a browser-based classroom attention monitor built with React, TypeScript, and Vite. It uses the webcam plus MediaPipe face landmark detection to estimate student attention states locally in the browser.

## Highlights

- Stable per-face tracking IDs to reduce flicker and misclassification when MediaPipe changes detection order.
- Explicit camera lifecycle management with cleanup on reset, stop, and unmount.
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
