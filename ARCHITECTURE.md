# Architecture

## Overview

The application is a client-side React SPA. Camera access, face landmark detection, attention classification, and session statistics run in the browser without a backend service.

## Main Modules

- `src/App.tsx`: Main composition root and layout orchestration.
- `src/lib/i18n.ts`: Locale catalog and copy interpolation for the supported languages.
- `src/hooks/useWebcam.ts`: Webcam permission and stream lifecycle.
- `src/hooks/useFaceLandmarker.ts`: MediaPipe model loading, per-frame face detection, and stable ID assignment.
- `src/hooks/useAttentionSession.ts`: Session state, attentive and sleepy timelines, and aggregate metrics.
- `src/lib/attentionClassifier.ts`: Attention and emotion classification utilities.
- `src/lib/faceTracking.ts`: Bounding-box matching for stable local face identities.
- `src/lib/headPose.ts`: Head pose extraction and matrix validation.
- `src/lib/exportSession.ts`: Session export helpers.
- `public/manifest.webmanifest`: PWA metadata and install configuration.
- `public/sw.js`: Service worker for app-shell caching and offline-friendly startup.
- `src/components/*`: Presentation layer for classroom view, controls, summaries, timeline, and student list.

## Runtime Flow

1. The user selects a language and starts the webcam from the welcome screen.
2. The app initializes the MediaPipe face landmarker model.
3. Video frames are processed with `requestAnimationFrame`.
4. Landmark data is converted into bounding boxes, matched to stable local track IDs, and classified into attention states.
5. Session hooks aggregate live attention and sleepy metrics and feed the dashboard components.
6. Camera tracks and model loops are shut down explicitly when the user stops the camera or the app unmounts.
7. A service worker caches the app shell so the site can be installed and reopened as a standalone web app.

## Build And Delivery

- Development entry: `index.html` loads `src/main.tsx`.
- Production entry: Vite generates `dist/index.html` plus hashed assets under `dist/assets`.
- Asset base is set to `/studentstrack/` so production files resolve correctly when deployed under that route.
