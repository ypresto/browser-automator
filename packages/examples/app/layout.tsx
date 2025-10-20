import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Browser Automator Examples',
  description: 'AI-powered browser automation with Vercel AI SDK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
