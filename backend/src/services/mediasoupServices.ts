import * as mediasoup from 'mediasoup';

export class MediasoupService {
  private worker: mediasoup.types.Worker | null = null;
  private router: mediasoup.types.Router | null = null;
  private producers: Map<string, mediasoup.types.Producer> = new Map();

  async initialize() {
    // Create worker
    this.worker = await mediasoup.createWorker({
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    });

    this.worker.on('died', (error) => {
      console.error('Mediasoup Worker died:', error);
      setTimeout(() => process.exit(1), 2000);
    });

    // Create router with media codecs
    const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
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
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
        },
      },
    ];

    this.router = await this.worker.createRouter({ mediaCodecs });
    console.log('Mediasoup Router created');
  }

  getRouterCapabilities() {
    if (!this.router) {
      throw new Error('Router not initialized');
    }
    return this.router.rtpCapabilities;
  }

  getRouter() {
    if (!this.router) {
      throw new Error('Router not initialized');
    }
    return this.router;
  }

  async createWebRtcTransport() {
    if (!this.router) {
      throw new Error('Router not initialized');
    }

    const transport = await this.router.createWebRtcTransport({
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1', // For local development
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    });

    return transport;
  }

  async createPlainTransport() {
    if (!this.router) {
      throw new Error('Router not initialized');
    }

    const transport = await this.router.createPlainTransport({
      listenIp: { ip: '127.0.0.1', announcedIp: '127.0.0.1' },
      rtcpMux: false,
      comedia: false,
    });

    return transport;
  }

  addProducer(producer: mediasoup.types.Producer) {
    this.producers.set(producer.id, producer);
  }

  removeProducer(producerId: string) {
    this.producers.delete(producerId);
  }

  getAllProducers() {
    return Array.from(this.producers.values());
  }

  getProducer(producerId: string) {
    return this.producers.get(producerId);
  }

  async close() {
    if (this.worker) {
      this.worker.close();
    }
  }
}