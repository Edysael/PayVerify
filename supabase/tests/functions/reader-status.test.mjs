// reader-status: "en línea" solo con captura activa y latido reciente.
import assert from 'node:assert/strict';
let handler; globalThis.Deno = { serve: h => { handler = h; } };
await import('./functions/reader-status/index.ts');
const call = async () => { const r = await handler(new Request('http://x', { method: 'POST', body: '{}' })); return { status: r.status, json: await r.json() }; };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
globalThis.__devices = [];
let r = await call(); assert.equal(r.json.online, false); assert.equal(r.json.reason, 'no_devices');
globalThis.__devices = [{ device_name: 'Caja', capture_active: true, last_heartbeat_at: ago(1) }];
r = await call(); assert.equal(r.status, 200); assert.equal(r.json.online, true); assert.equal(r.json.onlineDevices, 1); assert.equal(r.json.reason, null);
globalThis.__devices = [{ device_name: 'Caja', capture_active: false, last_heartbeat_at: ago(1) }];
r = await call(); assert.equal(r.json.online, false); assert.equal(r.json.reason, 'capture_paused');
globalThis.__devices = [{ device_name: 'Caja', capture_active: true, last_heartbeat_at: ago(9) }, { device_name: 'Otro', capture_active: true, last_heartbeat_at: null }];
r = await call(); assert.equal(r.json.online, false); assert.equal(r.json.reason, 'no_recent_heartbeat'); assert.equal(r.json.totalDevices, 2);
assert.equal((await handler(new Request('http://x', { method: 'POST', body: 'null' }))).status, 400);
console.log('OK   reader-status calcula en línea / pausado / sin latido');
