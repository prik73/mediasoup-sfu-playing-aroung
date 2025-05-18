
const ws = new WebSocket('ws://localhost:4000');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};

export default ws;
