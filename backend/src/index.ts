
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import type { WebRtcTransport } from '../types/mediasoup';
import { MediasoupService } from './services/mediasoupServices';
import * as mediasoup from 'mediasoup';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const port = 3000;
const mediasoupService = new MediasoupService();



(async () => {
  await mediasoupService.initialize();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 1. Send router RTP capabilities
    socket.on('getRtpCapabilities', (callback: (response: any) => void) => {
      try {
        const rtpCapabilities = mediasoupService.getRouterCapabilities();
        callback({ rtpCapabilities });
      } catch (err: any) {
        console.error(err);
        callback({ error: err?.message || 'Unknown error' });
      }
    });

    // 2. Create WebRTC transport for sending/receiving media
    socket.on('createTransport', async (callback: (response: any) => void) => {
      try {
        const transport = await mediasoupService.createWebRtcTransport();

        transport.on('dtlsstatechange', (state: mediasoup.types.DtlsState) => {
          if (state === 'closed') transport.close();
        });

        transport.on('close' as any, () => {
          console.log('Transport closed');
        });

        // Initialize socket data if not exists
        if (!socket.data) {
          socket.data = {};
        }
        socket.data.transport = transport;

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err: any) {
        console.error(err);
        callback({ error: err?.message || 'Unknown error' });
      }
    });

    // 3. Connect WebRTC transport with DTLS parameters
    socket.on('connectTransport', async ({ dtlsParameters }: { dtlsParameters: mediasoup.types.DtlsParameters }, callback: (response: any) => void) => {
      try {
        const transport = socket.data?.transport;
        if (!transport) {
          throw new Error('Transport not found');
        }
        await transport.connect({ dtlsParameters });
        callback({ connected: true });
      } catch (err: any) {
        console.error(err);
        callback({ error: err?.message || 'Unknown error' });
      }
    });

    // 4. Produce media (audio/video)
    socket.on('produce', async ({ kind, rtpParameters }: { kind: mediasoup.types.MediaKind, rtpParameters: mediasoup.types.RtpParameters }, callback: (response: any) => void) => {
      try {
        const transport = socket.data?.transport;
        if (!transport) {
          throw new Error('Transport not found');
        }
        
        const producer = await transport.produce({ kind, rtpParameters });

        mediasoupService.addProducer(producer);

        producer.on('transportclose', () => {
          mediasoupService.removeProducer(producer.id);
        });

        callback({ id: producer.id });
      } catch (err: any) {
        console.error(err);
        callback({ error: err?.message || 'Unknown error' });
      }
    });

    // 5. Close transport and cleanup
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      const transport = socket.data?.transport;
      if (transport) {
        transport.close();
      }
    });
  });

  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})();