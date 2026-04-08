# StudentsTrack

StudentsTrack is a browser-based classroom attention monitor built with React, TypeScript, and Vite. It uses the webcam plus MediaPipe face landmark detection to estimate student attention states locally in the browser.

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
