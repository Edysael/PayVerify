// order-create/status/update: un cuerpo JSON null/array/escalar debe dar 400, nunca una excepción (500).
import assert from 'node:assert/strict';
let handler; globalThis.Deno = { serve: h => { handler = h; } };
const fn = process.argv[2];
await import(`./functions/${fn}/index.ts`);
for (const raw of ['null', '[]', '5', '"x"']) {
  const r = await handler(new Request('http://x', { method: 'POST', body: raw }));
  assert.equal(r.status, 400, `${fn} con cuerpo ${raw} devolvió ${r.status}`);
}
console.log('OK  ', fn, 'rechaza cuerpos no-objeto con 400');
