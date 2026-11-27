// Íconos de trazo (24x24) dibujados a mano para no depender de librerías externas.
import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{children}</svg>;
}

export const IconHome = (p: IconProps) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></Svg>;
export const IconOrders = (p: IconProps) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></Svg>;
export const IconPayments = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></Svg>;
export const IconStatements = (p: IconProps) => <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></Svg>;
export const IconDevice = (p: IconProps) => <Svg {...p}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></Svg>;
export const IconSenders = (p: IconProps) => <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12Z" /><path d="M8.5 11h7M8.5 14h4" /></Svg>;
export const IconKey = (p: IconProps) => <Svg {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l2 2M15 8l2 2" /></Svg>;
export const IconOrganizations = (p: IconProps) => <Svg {...p}><rect x="3" y="9" width="7" height="12" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" /><path d="M6 13h1M6 17h1M17 7h1M17 11h1M17 15h1" /></Svg>;
export const IconUsers = (p: IconProps) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Svg>;
export const IconBank = (p: IconProps) => <Svg {...p}><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" /></Svg>;
export const IconSettings = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>;
export const IconLogout = (p: IconProps) => <Svg {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></Svg>;
export const IconSearch = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const IconBell = (p: IconProps) => <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></Svg>;
export const IconHelp = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2h.01" /></Svg>;
export const IconChevronDown = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IconArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const IconArrowUp = (p: IconProps) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const IconArrowDown = (p: IconProps) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
export const IconStore = (p: IconProps) => <Svg {...p}><path d="M4 10v10h16V10" /><path d="M3 4h18l-1.5 6a2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0Z" /><path d="M10 20v-5h4v5" /></Svg>;
export const IconBuilding = (p: IconProps) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10.5 21v-3h3v3" /></Svg>;
export const IconLayers = (p: IconProps) => <Svg {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></Svg>;
export const IconClock = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconCheckCircle = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></Svg>;
export const IconCheck = (p: IconProps) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconCopy = (p: IconProps) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Svg>;
export const IconAlert = (p: IconProps) => <Svg {...p}><path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></Svg>;
export const IconChart = (p: IconProps) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></Svg>;
export const IconUploadCloud = (p: IconProps) => <Svg {...p}><path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.6 1.5A3.8 3.8 0 0 1 17.5 18" /><path d="M12 12v8M9 15l3-3 3 3" /></Svg>;
export const IconPlus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconBolt = (p: IconProps) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></Svg>;
export const IconMenu = (p: IconProps) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconX = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconTrash = (p: IconProps) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Svg>;

/** Marca PayVerify: escudo morado con check. */
export function LogoMark({ size = 44 }: { size?: number }) {
  // id único: si hay dos logos (barra móvil oculta + menú), un id repetido deja el escudo sin color.
  const gid = `pv-logo-${useId().replace(/:/g, "")}`;
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
    <path d="M24 3c6 4 12 5 18 5v13c0 11-7.5 18.5-18 24C13.5 39.5 6 32 6 21V8c6 0 12-1 18-5Z" fill={`url(#${gid})`} />
    <path d="m14 24 7.5 7.5L42 9" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
