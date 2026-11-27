export const db={pv_organization_members:[{organization_id:'11111111-1111-4111-8111-111111111111',user_id:'u1',status:'active',role:'owner'}],
  pv_bank_accounts:[{id:'22222222-2222-4222-8222-222222222222',organization_id:'11111111-1111-4111-8111-111111111111'}],
  pv_statement_import_batches:[],pv_statement_lines:[],pv_audit_logs:[]};
let seq=0;
class Q{
  constructor(t){this.t=t;this.f=[];this.op='select';this.ret=false;}
  select(){this.ret=true;return this}
  insert(r){this.op='insert';this.rows=Array.isArray(r)?r:[r];return this}
  upsert(r,o){this.op='upsert';this.rows=r;this.o=o;return this}
  update(v){this.op='update';this.vals=v;return this}
  delete(){this.op='delete';return this}
  eq(k,v){this.f.push(r=>r[k]===v);return this}
  in(k,vs){this.f.push(r=>vs.includes(r[k]));return this}
  limit(){return this}
  match(r){return this.f.every(fn=>fn(r))}
  run(){
    const rows=db[this.t];
    if(this.op==='select') return {data:rows.filter(r=>this.match(r)),error:null};
    if(this.op==='insert'){
      const out=[];
      for(const r of this.rows){
        if(this.t==='pv_statement_import_batches'&&rows.some(x=>x.organization_id===r.organization_id&&x.file_sha256===r.file_sha256)) return {data:null,error:{code:'23505'}};
        const n={id:'b'+(++seq),created_at:new Date().toISOString(),...r};rows.push(n);out.push(n);
      }
      return {data:out,error:null};
    }
    if(this.op==='upsert'){
      const out=[];
      for(const r of this.rows){
        if(rows.some(x=>x.organization_id===r.organization_id&&x.line_fingerprint===r.line_fingerprint)) continue;
        const n={id:'l'+(++seq),...r};rows.push(n);out.push(n);
      }
      return {data:out,error:null};
    }
    if(this.op==='update'){rows.filter(r=>this.match(r)).forEach(r=>Object.assign(r,this.vals));return {data:null,error:null};}
    if(this.op==='delete'){
      const gone=rows.filter(r=>this.match(r));
      db[this.t]=rows.filter(r=>!gone.includes(r));
      if(this.t==='pv_statement_import_batches') db.pv_statement_lines=db.pv_statement_lines.filter(l=>!gone.some(g=>g.id===l.batch_id));
      return {data:null,error:null};
    }
  }
  maybeSingle(){const r=this.run();return Promise.resolve({data:r.data?.[0]??null,error:r.error})}
  single(){const r=this.run();return Promise.resolve({data:r.data?.[0]??null,error:r.error})}
  then(res,rej){return Promise.resolve(this.run()).then(res,rej)}
}
export const createClient=()=>({auth:{getUser:async()=>({data:{user:{id:'u1'}},error:null})},from:t=>new Q(t)});
