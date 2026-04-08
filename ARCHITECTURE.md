# Architecture

## Overview

The application is a client-side React SPA. Camera access, face landmark detection, attention classification, and session statistics run in the browser without a backend service.

## Main Modules

- `src/App.tsx`: Main composition root and layout orchestration.
- `src/hooks/useWebcam.ts`: Webcam permission and stream lifecycle.
- `src/hooks/useFaceLandmarker.ts`: MediaPipe model loading, per-frame face detection, and stable ID assignment.
- `src/hooks/useAttentionSession.ts`: Session state, timeline, and aggregate metrics.
- `src/lib/attentionClassifier.ts`: Attention and emotion classification utilities.
- `src/lib/faceTracking.ts`: Bounding-box matching for stable local face identities.
- `src/lib/headPose.ts`: Head pose extraction and matrix validation.
- `src/lib/exportSession.ts`: Session export helpers.
- `src/components/*`: Presentation layer for classroom view, controls, summaries, timeline, and student list.

## Runtime Flow

1. The user starts the webcam from the welcome screen.
2. The app initializes the MediaPipe face landmarker model.
3. Video frames are processed with `requestAnimationFrame`.
4. Landmark data is converted into bounding boxes, matched to stable local track IDs, and classified into attention states.
5. Session hooks aggregate live metrics and feed the dashboard components.
6. Camera tracks and model loops are shut down explicitly when the user stops the camera or the app unmounts.

## Build And Delivery

- Development entry: `index.html` loads `src/main.tsx`.
- Production entry: Vite generates `dist/index.html` plus hashed assets under `dist/assets`.
- Asset base is set to `/studentstrack/` so production files resolve correctly when deployed under that route.
