import Link from "next/link";
import { IconBank, IconDevice, IconKey, IconOrganizations, IconSenders, IconUsers } from "../../../components/ui/Icons";

const TILES = [
  { href: "/settings/senders", title: "Remitentes (SMS y apps)", text: "Qué remitentes bancarios se aceptan como notificación de pago.", Icon: IconSenders },
  { href: "/settings/api-keys", title: "Llaves de API", text: "Conecta tu checkout para crear órdenes y consultar su estado.", Icon: IconKey },
  { href: "/settings/bank-accounts", title: "Cuentas bancarias", text: "Cuentas donde recibes los pagos.", Icon: IconBank },
  { href: "/settings/members", title: "Usuarios y roles", text: "Quién tiene acceso y con qué permisos.", Icon: IconUsers },
  { href: "/devices", title: "Dispositivos", text: "Teléfonos autorizados para leer las notificaciones del banco.", Icon: IconDevice },
  { href: "/organizations", title: "Organizaciones", text: "Cambia de organización o crea una nueva.", Icon: IconOrganizations },
];

export default function SettingsPage() {
  return <main className="main">
    <p className="muted">Administración</p><h1 className="title">Configuración</h1>
    <div className="cards-grid" style={{ marginTop: 0 }}>
      {TILES.map(({ href, title, text, Icon }) => <Link key={href} href={href} className="tile">
        <span className="t-ic"><Icon size={22} /></span><span><b>{title}</b><span>{text}</span></span>
      </Link>)}
    </div>
  </main>;
}
