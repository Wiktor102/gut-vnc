# VNC-Like Classroom Application - Implementation Plan

## Core Requirements Analysis

| Requirement | Consideration |
|-------------|---------------|
| Real-time screen sharing | Teacher → Many students (1:N broadcast) |
| Sharp text quality | Lossless/near-lossless encoding for text regions |
| Low-quality WiFi optimization | Adaptive bitrate, efficient compression |
| LAN-only | No cloud dependency, local discovery |
| Windows | Native or cross-platform with Windows support |
| Reactions/Hand raising | Low-latency bidirectional signaling |

---

## Recommended Technology Stack

### Core Framework: **Electron + Node.js**
- Cross-platform with excellent Windows support
- Native screen capture APIs
- Single codebase for both server (teacher) and client (student)

### Screen Capture & Encoding

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Capture | `electron.desktopCapturer` | Native, low-overhead screen capture |
| Encoding | **H.264 with CRF tuning** or **WebP for frames** | Hardware acceleration on most GPUs |
| Text optimization | Region-based encoding with PNG for text-heavy areas | Ensures sharpness |

### Networking

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Transport | **WebRTC DataChannels** | UDP-based, handles packet loss gracefully |
| Discovery | **mDNS/Bonjour** (`bonjour-service` npm) | Zero-config LAN discovery |
| Signaling | **WebSocket** (local server) | For connection setup and reactions |
| Protocol | Custom binary protocol over DataChannels | Minimal overhead |

### Adaptive Quality Strategy

```
┌─────────────────────────────────────────────────────┐
│           Adaptive Streaming Pipeline               │
├─────────────────────────────────────────────────────┤
│  1. Capture frame                                   │
│  2. Detect regions (text vs graphics)              │
│  3. Encode text regions: lossless/high quality     │
│  4. Encode other regions: adaptive quality         │
│  5. Monitor network RTT & packet loss              │
│  6. Adjust encoding parameters dynamically         │
└─────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        TEACHER (Server)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │   Screen    │  │   Encoder   │  │    WebRTC SFU-like       │ │
│  │   Capture   │→ │  Pipeline   │→ │    Broadcaster           │ │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
│                                              ↓                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Reactions/Hand Raise Display                   ││
│  │    [👋 Student A] [❓ Student B] [👍 Student C]             ││
│  └─────────────────────────────────────────────────────────────┘│
│                         ↑                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WebSocket  │  │   mDNS      │  │  Connection │              │
│  │  Signaling  │  │  Discovery  │  │  Manager    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────┘
                              │ LAN
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  STUDENT 1    │    │  STUDENT 2    │    │  STUDENT N    │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ WebRTC Client │    │ WebRTC Client │    │ WebRTC Client │
│ Video Decoder │    │ Video Decoder │    │ Video Decoder │
│ Reaction UI   │    │ Reaction UI   │    │ Reaction UI   │
│ [👋][❓][👍]  │    │ [👋][❓][👍]  │    │ [👋][❓][👍]  │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Detailed Component Design

### 1. Screen Capture Module

```
Technology: electron.desktopCapturer + native addon for performance

Features:
- Configurable frame rate (adaptive: 5-30 FPS based on content)
- Cursor capture with position streaming
- Monitor selection support
- Dirty rectangle detection (only encode changed regions)
```

### 2. Encoding Pipeline

**Hybrid encoding approach for text sharpness:**

| Content Type | Detection Method | Encoding |
|--------------|------------------|----------|
| Text/UI regions | Edge density analysis | PNG or lossless WebP |
| Video/Animation | Motion vectors | H.264 with higher QP |
| Static graphics | Frame diff threshold | JPEG-XL or WebP lossy |

**Implementation:**
- Use `sharp` or native FFmpeg bindings for encoding
- Hardware acceleration via NVENC (NVIDIA) or QuickSync (Intel)
- Fallback to software x264 with `--preset ultrafast --tune zerolatency`

### 3. Network Transport Layer

**WebRTC Configuration:**
```javascript
// Optimized for LAN, low-quality WiFi
{
  iceServers: [], // No STUN/TURN needed for LAN
  iceCandidatePoolSize: 0,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}
```

**Adaptive Bitrate Control:**
- Monitor `RTCStatsReport` for packet loss and RTT
- Implement bandwidth estimation using TWCC (Transport-Wide Congestion Control)
- Quality tiers: 
  - Excellent (< 1% loss): Full quality, 30 FPS
  - Good (1-5% loss): Reduced FPS, maintained sharpness
  - Poor (> 5% loss): Lower resolution, prioritize text clarity

### 4. Signaling & Discovery

**mDNS Service Advertisement (Teacher):**
```
Service Type: _classroom-vnc._tcp.local
TXT Records:
  - teacher_name=<name>
  - room_code=<optional>
  - version=<protocol_version>
```

**WebSocket Messages:**
```typescript
// Connection
{ type: 'join', studentName: string, studentId: string }
{ type: 'welcome', teacherName: string, streamConfig: StreamConfig }

// Reactions (Student → Teacher)
{ type: 'reaction', reaction: 'hand' | 'thumbsUp' | 'question' | 'confused' }
{ type: 'reaction-clear', studentId: string }

// Teacher Controls
{ type: 'mute-all' }
{ type: 'kick', studentId: string }
{ type: 'clear-reactions' }
```

### 5. Reactions & Hand Raising System

**Student UI:**
- Floating toolbar (always on top option)
- Quick reaction buttons: 👋 Hand, ❓ Question, 👍 Understood, 😕 Confused
- Reactions auto-clear after 30 seconds or teacher dismissal

**Teacher UI:**
- Notification panel showing active reactions
- Student list with status indicators
- Sound/visual alerts for new hands raised
- Batch clear reactions button

---

## Project Structure

```
classroom-vnc/
├── package.json
├── tsconfig.json
├── webpack.config.js             # Main webpack config
├── webpack.main.config.js        # Electron main process
├── webpack.renderer.config.js    # React renderer
├── .eslintrc.js                  # ESLint configuration
├── babel.config.js               # React compiler + babel
│
├── src/
│   ├── main/                     # Electron main process
│   │   ├── index.ts
│   │   ├── capture/
│   │   │   ├── screen-capture.ts
│   │   │   ├── region-detector.ts
│   │   │   └── cursor-tracker.ts
│   │   ├── encoding/
│   │   │   ├── encoder.ts
│   │   │   ├── text-encoder.ts
│   │   │   └── video-encoder.ts
│   │   ├── network/
│   │   │   ├── discovery.ts       # mDNS via bonjour-service
│   │   │   ├── signaling-server.ts
│   │   │   └── webrtc-broadcaster.ts
│   │   ├── teacher/
│   │   │   ├── annotation-overlay.ts
│   │   │   └── screen-control.ts  # Pause/blank
│   │   └── ipc/
│   │       └── handlers.ts
│   │
│   ├── renderer/                  # React + TypeScript
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── RoleSelect/
│   │   │   │   ├── RoleSelect.tsx
│   │   │   │   └── RoleSelect.scss
│   │   │   ├── TeacherDashboard/
│   │   │   │   ├── TeacherDashboard.tsx
│   │   │   │   └── TeacherDashboard.scss
│   │   │   └── StudentViewer/
│   │   │       ├── StudentViewer.tsx
│   │   │       └── StudentViewer.scss
│   │   │
│   │   ├── components/
│   │   │   ├── ScreenViewer/
│   │   │   │   ├── ScreenViewer.tsx
│   │   │   │   └── ScreenViewer.scss
│   │   │   ├── ReactionBar/
│   │   │   │   ├── ReactionBar.tsx
│   │   │   │   └── ReactionBar.scss
│   │   │   ├── ReactionDisplay/    # Shows everyone's reactions
│   │   │   │   ├── ReactionDisplay.tsx
│   │   │   │   └── ReactionDisplay.scss
│   │   │   ├── StudentList/
│   │   │   │   ├── StudentList.tsx
│   │   │   │   └── StudentList.scss
│   │   │   ├── AnnotationCanvas/
│   │   │   │   ├── AnnotationCanvas.tsx
│   │   │   │   └── AnnotationCanvas.scss
│   │   │   ├── ConnectionStatus/
│   │   │   │   ├── ConnectionStatus.tsx
│   │   │   │   └── ConnectionStatus.scss
│   │   │   └── TeacherControls/
│   │   │       ├── TeacherControls.tsx
│   │   │       └── TeacherControls.scss
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebRTC.ts
│   │   │   ├── useDiscovery.ts
│   │   │   ├── useReactions.ts
│   │   │   └── useAnnotations.ts
│   │   │
│   │   ├── context/
│   │   │   ├── ConnectionContext.tsx
│   │   │   └── ReactionsContext.tsx
│   │   │
│   │   └── styles/
│   │       ├── _variables.scss     # Color palette, spacing
│   │       ├── _mixins.scss        # Reusable SCSS mixins
│   │       ├── _reset.scss         # CSS reset
│   │       └── global.scss         # Global styles
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── protocol.ts
│   │   │   ├── reactions.ts
│   │   │   └── annotations.ts
│   │   ├── constants.ts
│   │   └── utils/
│   │       └── network-utils.ts
│   │
│   └── preload/
│       └── index.ts
│
├── assets/
│   ├── icons/
│   └── sounds/
│       └── notification.mp3       # Hand raise alert
│
└── dist/                          # Build output
```

---

## Development Environment Setup

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-compiler'  // React compiler lint rules
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react-compiler/react-compiler': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  settings: {
    react: { version: 'detect' }
  }
};
```

### Babel + React Compiler Setup

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { electron: '28' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  plugins: [
    ['babel-plugin-react-compiler', {
      // React compiler options for auto-memoization
      runtimeModule: 'react-compiler-runtime'
    }]
  ]
};
```

### Webpack Configuration (Renderer)

```javascript
// webpack.renderer.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  devtool: isDev ? 'eval-source-map' : 'source-map',
  
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].[contenthash].js'
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: isDev ? ['react-refresh/babel'] : []
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html'
    }),
    !isDev && new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    isDev && new ReactRefreshWebpackPlugin()
  ].filter(Boolean),
  
  devServer: {
    hot: true,
    port: 3000
  }
};
```

---

## Enhanced Feature Design

### Annotation System

```
┌─────────────────────────────────────────────────────────┐
│                   Annotation Layer                       │
├─────────────────────────────────────────────────────────┤
│  Tools:                                                 │
│  • Pointer (laser dot that follows cursor)             │
│  • Freehand draw (multiple colors)                     │
│  • Arrow/Line                                          │
│  • Rectangle highlight                                │
│  • Text label                                          │
│  • Clear all                                           │
│                                                         │
│  Transmission:                                          │
│  • Annotations sent as vector data (not pixels)        │
│  • Minimal bandwidth impact                            │
│  • Rendered client-side on canvas overlay              │
└─────────────────────────────────────────────────────────┘
```

### Pause/Blank Screen Feature

```typescript
// Teacher controls
interface ScreenControl {
  mode: 'live' | 'paused' | 'blank';
  pausedFrame?: ImageData;      // Frozen frame when paused
  blankMessage?: string;        // "Class break" etc.
}
```

### Reactions Protocol (Broadcast to All)

```typescript
// Reaction message broadcast to all connected clients
interface ReactionBroadcast {
  type: 'reaction-update';
  reactions: {
    [studentId: string]: {
      name: string;
      reaction: 'hand' | 'thumbsUp' | 'question' | 'confused' | null;
      timestamp: number;
    }
  }
}
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "bonjour-service": "^1.2.0",
    "ws": "^8.16.0",
    "wrtc": "^0.4.7"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "webpack-dev-server": "^4.15.0",
    "@pmmmwh/react-refresh-webpack-plugin": "^0.5.11",
    "react-refresh": "^0.14.0",
    "babel-loader": "^9.1.0",
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/preset-react": "^7.23.0",
    "@babel/preset-typescript": "^7.23.0",
    "babel-plugin-react-compiler": "latest",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-compiler": "latest",
    "sass": "^1.69.0",
    "sass-loader": "^13.3.0",
    "css-loader": "^6.8.0",
    "style-loader": "^3.3.0",
    "mini-css-extract-plugin": "^2.7.0",
    "html-webpack-plugin": "^5.6.0",
    "electron-builder": "^24.9.0"
  }
}
```

---

## Updated Technical Decisions

| Decision | Choice | Impact |
|----------|--------|--------|
| Class size | Small (< 15) | Direct WebRTC mesh - simpler architecture |
| Reactions | Visible to everyone | Broadcast reactions via WebSocket to all clients |
| Teacher controls | Full suite | Pause, annotations, pointer included |
| UI Framework | React + TypeScript + Webpack | No Tailwind, pure SCSS |

---

## Final Implementation Checklist

| # | Task | Est. Time | Status |
|---|------|-----------|--------|
| 1 | Project scaffolding (Electron + Webpack + React + SCSS) | 4h | pending |
| 2 | ESLint + React Compiler setup | 2h | pending |
| 3 | Role selection UI | 2h | pending |
| 4 | Screen capture module | 4h | pending |
| 5 | Basic H.264 encoding | 6h | pending |
| 6 | WebRTC broadcaster (teacher) | 6h | pending |
| 7 | WebRTC receiver (student) | 4h | pending |
| 8 | mDNS discovery | 3h | pending |
| 9 | WebSocket signaling | 3h | pending |
| 10 | Text region detection + lossless encoding | 8h | pending |
| 11 | Adaptive bitrate control | 6h | pending |
| 12 | Reaction system (UI + broadcast) | 4h | pending |
| 13 | Annotation canvas (teacher) | 6h | pending |
| 14 | Annotation rendering (student) | 3h | pending |
| 15 | Pause/blank screen controls | 2h | pending |
| 16 | Connection resilience (auto-reconnect) | 3h | pending |
| 17 | Windows installer build | 2h | pending |
| 18 | Testing & bug fixes | 8h | pending |

**Total estimated: ~75 hours**

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
| Task | Priority |
|------|----------|
| Project setup (Electron + React + TypeScript) | High |
| Basic screen capture implementation | High |
| Simple WebSocket signaling server | High |
| Role selection UI (Teacher/Student) | High |

### Phase 2: Core Streaming (Week 2-3)
| Task | Priority |
|------|----------|
| WebRTC peer connection setup | High |
| Basic H.264 encoding pipeline | High |
| Student viewer with video display | High |
| mDNS discovery implementation | Medium |

### Phase 3: Quality Optimization (Week 3-4)
| Task | Priority |
|------|----------|
| Text region detection algorithm | High |
| Hybrid encoding (text lossless + video lossy) | High |
| Adaptive bitrate based on network conditions | High |
| Dirty rectangle optimization | Medium |

### Phase 4: Reactions System (Week 4-5)
| Task | Priority |
|------|----------|
| Reaction UI components | High |
| WebSocket reaction messaging | High |
| Teacher notification panel | High |
| Sound/visual alerts | Medium |

### Phase 5: Polish & Testing (Week 5-6)
| Task | Priority |
|------|----------|
| Windows installer (electron-builder) | High |
| Connection resilience (auto-reconnect) | High |
| Performance profiling | Medium |
| Multi-monitor support | Medium |
| UI/UX refinements | Medium |

---

## Architecture Notes

### Why WebRTC Over Other Solutions?

- **WebRTC**: UDP-based, handles packet loss gracefully, low latency, perfect for LAN
- **RTMP**: TCP-based, not ideal for packet loss, more overhead
- **MJPEG**: Simple but inefficient, no adaptive bitrate
- **Custom UDP**: Reinventing the wheel, WebRTC already optimized

### Why Not Cloud-Based?

- LAN-only requirement = zero external dependencies
- No reliance on internet connectivity
- Better privacy (data never leaves the classroom)
- Lower latency for reactions and annotations

### Text Quality Strategy

The key to sharp text is **regional encoding**:
1. Detect high-edge-density areas (text/UI)
2. Encode these as lossless PNG or WebP
3. Encode other regions with lossy H.264
4. This maintains sharpness while keeping bandwidth low

### Bandwidth Optimization

- **Dirty rectangles**: Only encode screen regions that changed
- **Frame rate adaptation**: 5-30 FPS based on motion
- **Resolution scaling**: Reduce resolution on poor networks, maintain aspect ratio
- **Reaction compression**: Reactions are just JSON, minimal overhead (~100 bytes each)

---

## No Mistakes Principles

1. **Type Safety**: Full TypeScript with strict mode enabled
2. **Error Handling**: Comprehensive try-catch blocks and graceful degradation
3. **Testing**: Unit tests for critical paths (encoding, network, reactions)
4. **Logging**: Structured logging for debugging network issues
5. **Version Control**: Semantic versioning, clear commit messages
6. **Documentation**: Inline comments for complex algorithms
7. **Performance**: Regular profiling to catch bottlenecks early
8. **Security**: No private data logged, input validation on all user inputs

---

End of Implementation Plan
