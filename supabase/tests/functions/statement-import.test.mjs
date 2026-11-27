import assert from 'node:assert/strict';
import {db} from './supabase-stub.mjs';
let handler;
globalThis.Deno={serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k]}};
await import('./si.ts');
const ORG='11111111-1111-4111-8111-111111111111', ACC='22222222-2222-4222-8222-222222222222';
const call=async b=>{const r=await handler(new Request('http://x',{method:'POST',headers:{Authorization:'Bearer t'},body:JSON.stringify(b)}));return {status:r.status,json:await r.json()}};
const row=(ref,amt=100,d='2026-11-01T10:00:00Z')=>({transactionDate:d,amount:amt,currency:'VES',reference:ref,description:'pago'});
const hash=c=>c.repeat(64);
let pass=0; const t=(n,f)=>f().then(()=>{pass++;console.log('OK  ',n)},e=>{console.log('FAIL',n,'\n',e.message);process.exitCode=1});

await t('importa 3 filas con 2 idénticas sin fallar (antes: violación de unicidad)',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('a'),sourceLabel:'x',rows:[row('R1'),row('R1'),row('R2')]});
  assert.equal(r.status,201); assert.equal(r.json.imported,3); assert.equal(r.json.skipped,0);
});
await t('mismo archivo otra vez => duplicate:true con la misma forma de respuesta',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('a'),sourceLabel:'x',rows:[row('R1')]});
  assert.equal(r.status,200); assert.equal(r.json.duplicate,true); assert.deepEqual(Object.keys(r.json.batch).sort(),['id','imported_count','row_count','status']);
});
await t('extracto solapado: omite lo ya importado en vez de fallar',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('b'),sourceLabel:'y',rows:[row('R1'),row('R3')]});
  assert.equal(r.status,201); assert.equal(r.json.imported,1); assert.equal(r.json.skipped,1);
});
await t('lote fallido no bloquea el reintento y se limpia',async()=>{
  db.pv_statement_import_batches.push({id:'old',organization_id:ORG,file_sha256:hash('c'),status:'failed',row_count:1,imported_count:0,created_at:new Date().toISOString()});
  const r=await call({organizationId:ORG,fileHash:hash('c'),sourceLabel:'z',rows:[row('R9')]});
  assert.equal(r.status,201); assert.equal(r.json.imported,1);
  assert.equal(db.pv_statement_import_batches.filter(b=>b.id==='old').length,0);
});
await t('pending_review reciente SÍ cuenta como duplicado (import en curso)',async()=>{
  db.pv_statement_import_batches.push({id:'p',organization_id:ORG,file_sha256:hash('d'),status:'pending_review',row_count:1,imported_count:0,created_at:new Date().toISOString()});
  const r=await call({organizationId:ORG,fileHash:hash('d'),sourceLabel:'z',rows:[row('R9')]});
  assert.equal(r.json.duplicate,true);
});
await t('pending_review abandonado (>10 min) permite reintentar',async()=>{
  db.pv_statement_import_batches.push({id:'q',organization_id:ORG,file_sha256:hash('e'),status:'pending_review',row_count:1,imported_count:0,created_at:new Date(Date.now()-11*60e3).toISOString()});
  const r=await call({organizationId:ORG,fileHash:hash('e'),sourceLabel:'z',rows:[row('R10')]});
  assert.equal(r.status,201);
});
await t('lote fallido con líneas conciliadas NO se borra (el CASCADE las eliminaría)',async()=>{
  db.pv_statement_import_batches.push({id:'keep',organization_id:ORG,file_sha256:hash('9'),status:'failed',row_count:1,imported_count:1,created_at:new Date().toISOString()});
  db.pv_statement_lines.push({id:'m1',organization_id:ORG,batch_id:'keep',line_fingerprint:'x'.repeat(64),reconciliation_status:'matched'});
  const r=await call({organizationId:ORG,fileHash:hash('9'),sourceLabel:'z',rows:[row('R20')]});
  assert.equal(r.status,200); assert.equal(r.json.duplicate,true);
  assert.equal(db.pv_statement_import_batches.filter(b=>b.id==='keep').length,1);
  assert.equal(db.pv_statement_lines.filter(l=>l.id==='m1').length,1);
});
await t('bankAccountId válido se guarda en las líneas',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('f'),sourceLabel:'z',bankAccountId:ACC,rows:[row('R11')]});
  assert.equal(r.status,201); assert.ok(db.pv_statement_lines.some(l=>l.reference==='R11'&&l.bank_account_id===ACC));
});
await t('bankAccountId de otra organización o inexistente => 400',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('1'),sourceLabel:'z',bankAccountId:'33333333-3333-4333-8333-333333333333',rows:[row('R12')]});
  assert.equal(r.status,400); assert.equal(r.json.error,'bank_account_not_found');
  const r2=await call({organizationId:ORG,fileHash:hash('2'),sourceLabel:'z',bankAccountId:'no-uuid',rows:[row('R12')]});
  assert.equal(r2.status,400);
});
await t('payload inválido sigue devolviendo 400',async()=>{
  const r=await call({organizationId:ORG,fileHash:hash('3'),sourceLabel:'z',rows:[{transactionDate:'x',amount:5,currency:'VES'}]});
  assert.equal(r.status,400); assert.equal(r.json.error,'invalid_row');
});
console.log(pass+' pruebas OK');
