// device-heartbeat: solo el dueño de un dispositivo aprobado puede reportar latidos.
import assert from 'node:assert/strict';
import {db} from './supabase-stub.mjs';
let handler;
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k]}};
await import('./device-heartbeat.ts');
const ORG='11111111-1111-4111-8111-111111111111';
const D=n=>`aaaaaaa${n}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
db.pv_devices=[
  {id:D(1),organization_id:ORG,user_id:'u1',device_status:'active'},
  {id:D(2),organization_id:ORG,user_id:'u1',device_status:'pending'},
  {id:D(3),organization_id:ORG,user_id:'u1',device_status:'revoked'},
  {id:D(4),organization_id:ORG,user_id:'otro',device_status:'active'},
];
const call=async b=>{const r=await handler(new Request('http://x',{method:'POST',headers:{Authorization:'Bearer t'},body:typeof b==='string'?b:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
let r=await call({organizationId:ORG,deviceId:D(1),captureActive:true,appVersion:'0.3.0',batteryUnrestricted:true});
assert.equal(r.status,200); assert.equal(r.json.ok,true);
assert.equal(db.pv_devices[0].capture_active,true); assert.ok(db.pv_devices[0].last_heartbeat_at); assert.equal(db.pv_devices[0].app_version,'0.3.0');
r=await call({organizationId:ORG,deviceId:D(1),captureActive:false,appVersion:'<script>'});
assert.equal(r.status,200); assert.equal(db.pv_devices[0].capture_active,false); assert.equal(db.pv_devices[0].app_version,null);
assert.equal((await call({organizationId:ORG,deviceId:D(2),captureActive:true})).status,425);
assert.equal((await call({organizationId:ORG,deviceId:D(3),captureActive:true})).status,403);
assert.equal((await call({organizationId:ORG,deviceId:D(4),captureActive:true})).status,403,'dispositivo de otro usuario');
assert.equal((await call({organizationId:ORG,deviceId:D(1)})).status,400,'falta captureActive');
assert.equal((await call('null')).status,400);
db.pv_organization_members[0].role='viewer';
assert.equal((await call({organizationId:ORG,deviceId:D(1),captureActive:true})).status,403,'viewer no opera');
db.pv_organization_members[0].role='owner';
console.log('OK   device-heartbeat valida dueño, estado y datos');
