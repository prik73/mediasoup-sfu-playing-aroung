---

## 🛠 Development Phases

### Phase 1: Foundation — Basic WebRTC Connection
- Setup Socket.IO client signaling
- Initialize MediasoupClient for device & transport setup
- Create StreamPage capturing and producing local media
- Validate basic connection and media transmission

### Phase 2: Multi-Participant Support
- Implement consumer logic for receiving others’ streams
- Build VideoGrid to display participant videos dynamically
- Manage participants (join/leave) notifications
- Add StreamControls for mute, camera toggle, and leaving

### Phase 3: HLS Passive Streaming
- Create WatchPage with HLSPlayer component (using hls.js)
- Connect to backend HLS stream URL and handle playback events
- Provide user controls for volume, fullscreen, buffering

### Phase 4: UI/UX Polish and Error Handling
- Responsive design for mobile and desktop
- ErrorBoundary for graceful error handling
- Loading states and retry mechanisms
- Performance optimization (lazy loading, memoization, cleanup)

---

