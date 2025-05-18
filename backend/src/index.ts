import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import * as mediasoup from 'mediasoup';

const app = express();
const server = http.createServer(app);
const ws = new WebSocket.Server({ noServer: true }); // We'll attach it after mediasoup setup

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

async function createMediasoupWorker() {
  worker = await mediasoup.createWorker();
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {},
      },
    ],
  });
  console.log('Mediasoup Worker and Router started');
}

async function startServer() {
  await createMediasoupWorker();

  const ws = new WebSocket.Server({ server });

  ws.on('connection', (ws) => {
    console.log('WebSocket client connected');

    let transport: mediasoup.types.WebRtcTransport | null = null;
    let producer: mediasoup.types.Producer | null = null;

    ws.on('message', async (message) => {
      console.log('Received message:', message.toString());

      try {
        const msg = JSON.parse(message.toString());
        const { action, data } = msg;

        if (action === 'createWebRtcTransport') {
          transport = await router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: undefined }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
          });

          ws.send(
            JSON.stringify({
              action: 'webRtcTransportCreated',
              data: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
              },
            }),
          );
        } else if (action === 'connectTransport') {
          if (!transport) throw new Error('Transport not created');
          await transport.connect({ dtlsParameters: data.dtlsParameters });
          ws.send(JSON.stringify({ action: 'transportConnected' }));
        } else if (action === 'produce') {
          if (!transport) throw new Error('Transport not created');
          producer = await transport.produce({
            kind: data.kind,
            rtpParameters: data.rtpParameters,
          });

          ws.send(JSON.stringify({ action: 'produced', data: { id: producer.id } }));
        } else if (action === 'getRtpCapabilities') {
          const routerRtpCapabilities = router.rtpCapabilities;
          ws.send(JSON.stringify({ action: 'rtpCapabilities', data: routerRtpCapabilities }));
        } else if (action === 'consume') {
          if (!transport) throw new Error('Transport not created');
          if (!producer) throw new Error('Producer not available');

          const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities: data.rtpCapabilities,
            paused: false,
          });

          ws.send(
            JSON.stringify({
              action: 'consumed',
              data: {
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              },
            }),
          );
        }
      } catch (err: unknown) {
        console.error('Error handling WS message:', err);
        if (err instanceof Error) {
          ws.send(JSON.stringify({ action: 'error', data: err.message }));
        } else {
          ws.send(JSON.stringify({ action: 'error', data: String(err) }));
        }
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      if (producer) producer.close();
      if (transport) transport.close();
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer().catch(console.error);