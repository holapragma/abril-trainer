import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abril Trainer',
  description: 'Gestión de alumnos, planificación y clases.',
  manifest: '/manifest.json',
  // Sin esto el navegador pide /favicon.ico y se lleva un 404 en cada carga.
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Abril Trainer' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin maximumScale: bloquear el zoom es una barrera de accesibilidad y ya no
  // hace falta. El zoom automático de iOS al enfocar un campo lo evitan los
  // 16px de font-size en los inputs (globals.css), no un viewport cerrado.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#12130f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
          Aplica el tema guardado antes del primer pintado. Sin esto hay un
          parpadeo blanco al cargar en modo oscuro.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
