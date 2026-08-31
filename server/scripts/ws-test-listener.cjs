const WebSocket = require('ws');

const token = process.argv[2];
const durationMs = Number(process.argv[3] || 8000);

const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
const events = [];

ws.on('open', () => console.error('[listener] connected'));
ws.on('message', (data) => {
  const parsed = JSON.parse(data.toString());
  events.push(parsed);
  console.error('[listener] event:', parsed.event);
});
ws.on('error', (err) => console.error('[listener] error', err.message));

setTimeout(() => {
  ws.close();
  console.log(JSON.stringify(events, null, 2));
  process.exit(0);
}, durationMs);
