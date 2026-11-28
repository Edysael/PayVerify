import QRCode from 'qrcode';
import { APK_URL } from '../../lib/download';

// Página pública (sin login) para que el comercio instale la app lectora en su teléfono.

export const metadata = { title: 'Descargar PayVerify para Android' };

const steps: { title: string; body: string }[] = [
  { title: 'Descarga la app', body: 'Toca el botón «Descargar app» desde el teléfono que recibe los avisos del banco. Si estás en el computador, escanea el código QR con la cámara del teléfono.' },
  { title: 'Abre el archivo', body: 'Cuando termine la descarga, toca la notificación «payverify.apk» (o búscalo en la app Archivos, carpeta Descargas).' },
  { title: 'Permite la instalación', body: 'Si Android dice que no puede instalar apps de esta fuente, toca «Configuración», activa «Permitir de esta fuente» y vuelve atrás. Solo se hace una vez.' },
  { title: 'Confirma que quieres instalarla', body: 'Si aparece un aviso de Play Protect, toca «Más detalles» y luego «Instalar de todas formas». Aparece porque PayVerify lee los avisos de pago del banco y no viene de Play Store.' },
  { title: 'Entra con tu cuenta', body: 'Abre PayVerify, escribe el mismo correo y contraseña del panel y toca tu comercio. El teléfono quedará conectado.' },
  { title: 'Activa «Recibir pagos»', body: 'Autoriza el remitente SMS o la app de tu banco, quita el ahorro de batería y activa «Recibir pagos». Desde ese momento puedes bloquear la pantalla.' },
];

export default async function DescargarPage() {
  const qrSvg = await QRCode.toString(APK_URL, { type: 'svg', margin: 1, width: 200, color: { dark: '#111b2c', light: '#ffffff' } });
  return (
    <main style={{ maxWidth: 720, margin: '6vh auto', padding: 24 }}>
      <p className="muted">PAYVERIFY PARA ANDROID</p>
      <h1 className="title">Instala el lector de pagos</h1>
      <p>La app se instala una sola vez en el teléfono donde llegan los avisos de tu banco. Después trabaja sola, aunque la pantalla esté bloqueada.</p>

      <section className="panel" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <a href={APK_URL} style={{ display: 'inline-block', padding: '16px 28px', background: '#111b2c', color: 'white', borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: 'none' }}>
            Descargar app
          </a>
          <p className="muted">Archivo «payverify.apk» · Android 8 o superior</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div aria-label="Código QR para descargar la app" role="img" style={{ width: 200, height: 200 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="muted">¿Estás en el computador? Escanéalo con el teléfono.</p>
        </div>
      </section>

      <section className="panel">
        <h2>Cómo instalarla</h2>
        <ol style={{ paddingLeft: 20, display: 'grid', gap: 14 }}>
          {steps.map((s) => (
            <li key={s.title}><strong>{s.title}.</strong> <span>{s.body}</span></li>
          ))}
        </ol>
      </section>

      <p className="muted">PayVerify no lee claves, PIN ni códigos de seguridad: solo los avisos de pago del remitente que tú autorizas, y nunca guarda el texto del mensaje.</p>
      <p><a href="/sign-in">Volver al panel</a></p>
    </main>
  );
}
