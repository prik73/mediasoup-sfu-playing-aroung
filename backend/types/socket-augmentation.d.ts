import 'socket.io';
import type { WebRtcTransport } from '../types/mediasoup'; // adjust the path if needed

declare module 'socket.io' {
  interface Socket {
    data: Record<string, any> & {
      transport?: WebRtcTransport;
    };
  }
}