import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import './globals.css';

// Self-hosted via next/font, exposed as CSS variables that
// tailwind.config.ts's fontFamily.sans/mono fall back through to the
// literal families tokens.css names — see that file's comment.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BuildBridge',
  description: 'AI-powered designer-to-developer handoff assistant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
