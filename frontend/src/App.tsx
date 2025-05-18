import React, { useEffect, useRef, useState } from 'react';

function App() {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [transportId, setTransportId] = useState<string | null>(null);
  const [rtpCapabilities, setRtpCapabilities] = useState<any>(null);
  const [producerId, setProducerId] = useState<string | null>(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:3000');

    ws.current.onopen = () => {
      setConnected(true);
      addMessage('WebSocket connected');
    };

    ws.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        addMessage(`Received: ${JSON.stringify(data)}`);

        if (data.action === 'rtpCapabilities') {
          setRtpCapabilities(data.data);
          addMessage('RTP Capabilities received and stored');
        } else if (data.action === 'webRtcTransportCreated') {
          setTransportId(data.data.id);
          addMessage(`Transport created with ID: ${data.data.id}`);
        } else if (data.action === 'produced') {
          setProducerId(data.data.id);
          addMessage(`Producer created with ID: ${data.data.id}`);
        }
      } catch (err) {
        addMessage('Error parsing message');
        console.error('Message parse error:', err);
      }
    };

    ws.current.onerror = (error) => {
      addMessage('WebSocket error');
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      setConnected(false);
      addMessage('WebSocket closed');
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  function addMessage(msg: string) {
    setMessages((prev) => [...prev, msg]);
  }

  function sendAction(action: string, data?: any) {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = data ? { action, data } : { action };
      ws.current.send(JSON.stringify(message));
      addMessage(`Sent: ${JSON.stringify(message)}`);
    } else {
      addMessage('WebSocket not connected');
    }
  }

  const mockDtlsParameters = {
    role: 'client',
    fingerprints: [
      {
        algorithm: 'sha-256',
        value:
          '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF',
      },
    ],
  };

  const mockRtpParameters = {
    mid: '0',
    codecs: [
      {
        mimeType: 'audio/opus',
        payloadType: 111,
        clockRate: 48000,
        channels: 2,
        parameters: {
          minptime: 10,
          useinbandfec: 1,
        },
      },
    ],
    headerExtensions: [
      {
        uri: 'urn:ietf:params:rtp-hdrext:sdes:mid',
        id: 1,
      },
      {
        uri: 'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
        id: 10,
      },
    ],
    encodings: [
      {
        ssrc: 11111111,
      },
    ],
    rtcp: {
      cname: 'mock-cname',
      reducedSize: true,
    },
  };

  function handleGetRtpCapabilities() {
    sendAction('getRtpCapabilities');
  }

  function handleCreateTransport() {
    sendAction('createWebRtcTransport');
  }

  function handleConnectTransport() {
    if (!transportId) {
      addMessage('Cannot connect: Transport not created yet');
      return;
    }
    sendAction('connectTransport', { dtlsParameters: mockDtlsParameters });
  }

  function handleProduce() {
    if (!transportId) {
      addMessage('Cannot produce: Transport not created or connected');
      return;
    }
    sendAction('produce', {
      kind: 'audio',
      rtpParameters: mockRtpParameters,
    });
  }

  function handleConsume() {
    if (!transportId || !producerId || !rtpCapabilities) {
      addMessage('Cannot consume: Missing required information');
      return;
    }
    sendAction('consume', { rtpCapabilities });
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Mediasoup Client Control</h1>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={handleGetRtpCapabilities}
          disabled={!connected}
          style={{ margin: '0.25rem' }}
        >
          1. Get RTP Capabilities
        </button>

        <button
          onClick={handleCreateTransport}
          disabled={!connected}
          style={{ margin: '0.25rem' }}
        >
          2. Create Transport
        </button>

        <button
          onClick={handleConnectTransport}
          disabled={!transportId || !connected}
          style={{ margin: '0.25rem' }}
        >
          3. Connect Transport
        </button>

        <button
          onClick={handleProduce}
          disabled={!transportId || !connected}
          style={{ margin: '0.25rem' }}
        >
          4. Produce Audio
        </button>

        <button
          onClick={handleConsume}
          disabled={!producerId || !transportId || !rtpCapabilities || !connected}
          style={{ margin: '0.25rem' }}
        >
          5. Consume
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p>
          <strong>Connection Status:</strong>
        </p>
        <ul>
          <li>Transport ID: {transportId || 'Not created yet'}</li>
          <li>RTP Capabilities: {rtpCapabilities ? 'Received' : 'Not received'}</li>
          <li>Producer ID: {producerId || 'Not created yet'}</li>
        </ul>
      </div>

      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '0.5rem',
          marginTop: '1rem',
          backgroundColor: '#f5f5f5',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <strong>Log Messages:</strong>
        </div>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '0.25rem' }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
