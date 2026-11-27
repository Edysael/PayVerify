import { niceScale, type TrendPoint } from "../../lib/dashboard";

// Gráfico de líneas en SVG puro (se dibuja en el servidor, sin librerías).
const W = 760, H = 270, L = 44, R = 14, T = 16, B = 34;

export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(0, ...points.map((p) => Math.max(p.registered, p.reconciled)));
  const scale = niceScale(max);
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (points.length <= 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v: number) => T + ih - (v / scale.max) * ih;
  const line = (k: "registered" | "reconciled") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = (k: "registered" | "reconciled") => `${line(k)} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks: number[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) ticks.push(v);
  // Con muchos días se rotula uno de cada N para que las fechas no se encimen.
  const every = points.length > 16 ? Math.ceil(points.length / 15) : 1;
  const total = points.reduce((s, p) => s + p.registered, 0);

  return <figure style={{ margin: 0 }}>
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Pagos registrados y conciliados por día. Total registrados en el periodo: ${total}.`}>
      <defs>
        <linearGradient id="pv-g-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity=".55" /><stop offset="1" stopColor="#22c55e" stopOpacity=".08" /></linearGradient>
        <linearGradient id="pv-g-purple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".18" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
      </defs>
      {ticks.map((v) => <g key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e8eaf2" strokeWidth="1" />
        <text x={L - 12} y={y(v) + 4} textAnchor="end">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
      </g>)}
      <path d={area("registered")} fill="url(#pv-g-purple)" />
      <path d={area("reconciled")} fill="url(#pv-g-green)" />
      <path d={line("registered")} fill="none" stroke="#6d28d9" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={line("reconciled")} fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinejoin="round" />
      {points.map((p, i) => <g key={p.key}>
        <circle cx={x(i)} cy={y(p.registered)} r="4.2" fill="#fff" stroke="#6d28d9" strokeWidth="2.2"><title>{`${p.label}: ${p.registered} registrados`}</title></circle>
        <circle cx={x(i)} cy={y(p.reconciled)} r="4.2" fill="#fff" stroke="#22c55e" strokeWidth="2.2"><title>{`${p.label}: ${p.reconciled} conciliados`}</title></circle>
        {i % every === 0 || i === points.length - 1 ? <text x={x(i)} y={H - 10} textAnchor="middle">{p.label}</text> : null}
      </g>)}
    </svg>
    <figcaption className="legend">
      <span><i style={{ background: "#6d28d9" }} />Registrados</span>
      <span><i style={{ background: "#22c55e" }} />Conciliados</span>
    </figcaption>
  </figure>;
}
