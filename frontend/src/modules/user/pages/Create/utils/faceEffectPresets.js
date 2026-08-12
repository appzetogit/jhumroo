import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { uniqueIndices, regionCenterAndRadius, radialWarp, vectorWarp } from './faceWarp';

const LEFT_EYE_IDX = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_IDX = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const LIPS_IDX = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

// Canonical single-point MediaPipe Face Mesh landmark indices (stable across releases,
// standard reference points - not hand-picked guesses).
const NOSE_TIP = 1;
const CHIN = 152;
const FOREHEAD = 10;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const LEFT_MOUTH_CORNER = 61;
const RIGHT_MOUTH_CORNER = 291;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;

function point(landmarks, idx, w, h) {
  const p = landmarks[idx];
  return { cx: p.x * w, cy: p.y * h };
}

function faceWidthPx(landmarks, w) {
  return Math.abs(landmarks[RIGHT_CHEEK].x - landmarks[LEFT_CHEEK].x) * w;
}

// +1 if the point sits to the right of the nose, -1 if to the left - lets a symmetric pair of
// points (e.g. both cheeks) push "outward" or "inward" without caring which one is anatomically
// left/right in the underlying landmark indices.
function outwardSignX(landmarks, idx) {
  return landmarks[idx].x >= landmarks[NOSE_TIP].x ? 1 : -1;
}

function eyeRegion(landmarks, indices, w, h) {
  const { cx, cy, radius } = regionCenterAndRadius(landmarks, indices, w, h);
  return { cx, cy, radius: radius * 1.8 };
}

export const FACE_EFFECT_PRESETS = [
  {
    id: 'slimFace',
    label: 'Slim Face',
    icon: '🤏',
    image: '/effects/slimFace.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_CHEEK, RIGHT_CHEEK].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        radialWarp(ctx, cx, cy, fw * 0.42, -0.65);
      });
    },
  },
  {
    id: 'chubbyFace',
    label: 'Chubby',
    icon: '🐹',
    image: '/effects/chubbyFace.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_CHEEK, RIGHT_CHEEK].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        radialWarp(ctx, cx, cy, fw * 0.45, 0.7);
      });
    },
  },
  {
    id: 'bigEyes',
    label: 'Big Eyes',
    icon: '👀',
    image: '/effects/bigEyes.png',
    apply: (ctx, landmarks, w, h) => {
      [LEFT_EYE_IDX, RIGHT_EYE_IDX].forEach((idx) => {
        const { cx, cy, radius } = eyeRegion(landmarks, idx, w, h);
        radialWarp(ctx, cx, cy, radius * 1.6, 0.85);
      });
    },
  },
  {
    id: 'smallEyes',
    label: 'Small Eyes',
    icon: '😑',
    image: '/effects/smallEyes.png',
    apply: (ctx, landmarks, w, h) => {
      [LEFT_EYE_IDX, RIGHT_EYE_IDX].forEach((idx) => {
        const { cx, cy, radius } = eyeRegion(landmarks, idx, w, h);
        radialWarp(ctx, cx, cy, radius * 1.5, -0.7);
      });
    },
  },
  {
    id: 'bugEyes',
    label: 'Bug Eyes',
    icon: '🐸',
    image: '/effects/bugEyes.png',
    apply: (ctx, landmarks, w, h) => {
      [LEFT_EYE_IDX, RIGHT_EYE_IDX].forEach((idx) => {
        const { cx, cy, radius } = eyeRegion(landmarks, idx, w, h);
        radialWarp(ctx, cx, cy, radius * 2.4, 1.35);
      });
    },
  },
  {
    id: 'bigNose',
    label: 'Big Nose',
    icon: '🐽',
    image: '/effects/bigNose.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const { cx, cy } = point(landmarks, NOSE_TIP, w, h);
      radialWarp(ctx, cx, cy, fw * 0.32, 0.95);
    },
  },
  {
    id: 'slimNose',
    label: 'Slim Nose',
    icon: '👃',
    image: '/effects/slimNose.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const { cx, cy } = point(landmarks, NOSE_TIP, w, h);
      radialWarp(ctx, cx, cy, fw * 0.28, -0.65);
    },
  },
  {
    id: 'bigMouth',
    label: 'Big Mouth',
    icon: '👄',
    image: '/effects/bigMouth.png',
    apply: (ctx, landmarks, w, h) => {
      const { cx, cy, radius } = regionCenterAndRadius(landmarks, LIPS_IDX, w, h);
      radialWarp(ctx, cx, cy, radius * 2.4, 0.9);
    },
  },
  {
    id: 'smallMouth',
    label: 'Small Mouth',
    icon: '🤐',
    image: '/effects/smallMouth.png',
    apply: (ctx, landmarks, w, h) => {
      const { cx, cy, radius } = regionCenterAndRadius(landmarks, LIPS_IDX, w, h);
      radialWarp(ctx, cx, cy, radius * 2.2, -0.75);
    },
  },
  {
    id: 'bigHead',
    label: 'Big Head',
    icon: '🙃',
    image: '/effects/bigHead.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const left = point(landmarks, LEFT_CHEEK, w, h);
      const right = point(landmarks, RIGHT_CHEEK, w, h);
      const top = point(landmarks, FOREHEAD, w, h);
      const bottom = point(landmarks, CHIN, w, h);
      const cx = (left.cx + right.cx + top.cx + bottom.cx) / 4;
      const cy = (left.cy + right.cy + top.cy + bottom.cy) / 4;
      radialWarp(ctx, cx, cy, fw * 0.75, 0.3);
    },
  },
  {
    id: 'smallHead',
    label: 'Small Head',
    icon: '🎈',
    image: '/effects/smallHead.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const left = point(landmarks, LEFT_CHEEK, w, h);
      const right = point(landmarks, RIGHT_CHEEK, w, h);
      const top = point(landmarks, FOREHEAD, w, h);
      const bottom = point(landmarks, CHIN, w, h);
      const cx = (left.cx + right.cx + top.cx + bottom.cx) / 4;
      const cy = (left.cy + right.cy + top.cy + bottom.cy) / 4;
      radialWarp(ctx, cx, cy, fw * 0.75, -0.28);
    },
  },
  {
    id: 'bigForehead',
    label: 'Forehead',
    icon: '🧠',
    image: '/effects/bigForehead.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const { cx, cy } = point(landmarks, FOREHEAD, w, h);
      radialWarp(ctx, cx, cy, fw * 0.28, 0.3);
    },
  },
  {
    id: 'longChin',
    label: 'Long Chin',
    icon: '🫡',
    image: '/effects/longChin.png',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const { cx, cy } = point(landmarks, CHIN, w, h);
      vectorWarp(ctx, cx, cy, fw * 0.22, 0, 1, 0.5);
    },
  },
  {
    id: 'shortChin',
    label: 'Short Chin',
    icon: '😏',
    image: '/effects/shortChin.svg',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      const { cx, cy } = point(landmarks, CHIN, w, h);
      vectorWarp(ctx, cx, cy, fw * 0.22, 0, -1, 0.4);
    },
  },
  {
    id: 'wideJaw',
    label: 'Wide Jaw',
    icon: '🦍',
    image: '/effects/wideJaw.svg',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_CHEEK, RIGHT_CHEEK].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        const sign = outwardSignX(landmarks, idx);
        vectorWarp(ctx, cx, cy, fw * 0.3, sign, 0, 0.35);
      });
    },
  },
  {
    id: 'vLineJaw',
    label: 'V-Line',
    icon: '💎',
    image: '/effects/vLineJaw.svg',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_CHEEK, RIGHT_CHEEK].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        const sign = outwardSignX(landmarks, idx);
        vectorWarp(ctx, cx, cy, fw * 0.3, -sign, 0, 0.35);
      });
    },
  },
  {
    id: 'smileBoost',
    label: 'Smile',
    icon: '😊',
    image: '/effects/smileBoost.svg',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_MOUTH_CORNER, RIGHT_MOUTH_CORNER].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        const sign = outwardSignX(landmarks, idx);
        vectorWarp(ctx, cx, cy, fw * 0.18, sign * 0.35, -1, 0.4);
      });
    },
  },
  {
    id: 'catEyes',
    label: 'Cat Eyes',
    icon: '🐱',
    image: '/effects/catEyes.svg',
    apply: (ctx, landmarks, w, h) => {
      const fw = faceWidthPx(landmarks, w);
      [LEFT_EYE_OUTER, RIGHT_EYE_OUTER].forEach((idx) => {
        const { cx, cy } = point(landmarks, idx, w, h);
        const sign = outwardSignX(landmarks, idx);
        vectorWarp(ctx, cx, cy, fw * 0.2, sign, -1, 0.5);
      });
    },
  },
];
