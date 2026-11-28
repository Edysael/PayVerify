"use client";
import { usePathname, useRouter } from "next/navigation";
import { IconChevronDown } from "../ui/Icons";

export default function RangeSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  return <span className="select-sm">
    <select aria-label="Periodo del gráfico" value={value} onChange={(e) => router.push(`${pathname}?range=${e.target.value}`, { scroll: false })}>
      <option value={7}>Últimos 7 días</option>
      <option value={14}>Últimos 14 días</option>
      <option value={30}>Últimos 30 días</option>
    </select>
    <IconChevronDown size={16} />
  </span>;
}
