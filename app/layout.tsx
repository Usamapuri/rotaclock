import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'

export const metadata: Metadata = {
  title: 'RotaCloud - Employee Management System',
  description: 'Complete employee shift management and time tracking solution',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ImpersonationBanner />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
