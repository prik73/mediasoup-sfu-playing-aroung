import React, { useState, useRef, useEffect } from 'react';
import { Device } from 'mediasoup-client';

export default function MediaSoupControl() {
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [rtpCapabilities, setRtpCapabilities] = useState(null);
  const [transportId, setTransportId] = useState('');
  const [producerId, setProducerId] = useState('');
  const [consumer, setConsumer] = useState<any>(null);
  const [Device, setDevice] = useState<Device | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const sendJson = (obj: any) => ws.current?.send(JSON.stringify(obj));

  const recvHandlers = {
    rtpCapabilities: (data: any) => {
      setRtpCapabilities(data);
      const d = new Device();
      d.load({ routerRtpCapabilities: data }).then(() => setDevice(d));
    },
    webRtcTransportCreated: (data: any) => setTransportId(data.id),
    produced: (data: any) => setProducerId(data.id),
    consumed: async (data: any) => {
      if (!device) return;
      const consumer = await Device.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters
      });

      // Play the consumer track
      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      const audioElement = document.createElement('audio');
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      audioElement.controls = true;
      document.body.appendChild(audioElement);

      setConsumer(consumer);
    }
  };

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:3000');
    ws.current.onopen = () => setWsStatus('Connected');
    ws.current.onclose = () => setWsStatus('Disconnected');
    ws.current.onerror = () => setWsStatus('Error');

    ws.current.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      const handler = recvHandlers[msg.action];
      if (handler) handler(msg.data);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  async function handleGetRtpCapabilities() {
    sendJson({ action: 'getRtpCapabilities' });
  }

  async function handleCreateTransport() {
    sendJson({ action: 'createWebRtcTransport' });
  }

  async function handleConnectTransport() {
    if (!device) return alert('Device not initialized');
    // For simplicity, get local DTLS params from device to send to server
    // (In real apps, transport params come from backend, and you connect accordingly)
    // Here, fake DTLS param structure:
    sendJson({
      action: 'connectTransport',
      data: {
        dtlsParameters: {
          role: 'client',
          fingerprints: []
        }
      }
    });
  }

  async function handleProduceAudio() {
    if (!device) return alert('Device not initialized');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];

      // Create send transport here - simplification: we reuse transportId directly
      // Normally you’d call device.createSendTransport() and handle events

      // For demo, send produce request with rtpParameters of the track
      sendJson({
        action: 'produce',
        data: {
          kind: 'audio',
          rtpParameters: {} // In real code, get from sendTransport.produce()
        }
      });
    } catch (e) {
      alert('Failed to get audio: ' + e);
    }
  }

  async function handleConsume() {
    if (!device) return alert('Device not initialized');
    sendJson({
      action: 'consume',
      data: {
        rtpCapabilities
      }
    });
  }

  return (
    <div>
      <h2>Mediasoup Client Control</h2>
      <p>Status: {wsStatus}</p>

      <button onClick={handleGetRtpCapabilities}>Get RTP Capabilities</button>
      <button onClick={handleCreateTransport}>Create Transport</button>
      <button onClick={handleConnectTransport}>Connect Transport</button>
      <button onClick={handleProduceAudio}>Produce Audio</button>
      <button onClick={handleConsume}>Consume</button>

      <p>Transport ID: {transportId}</p>
      <p>RTP Capabilities: {rtpCapabilities ? 'Received' : 'Not received'}</p>
      <p>Producer ID: {producerId}</p>
    </div>
  );
}
