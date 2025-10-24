// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '../components/Header'; // Import the Header

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blockchain LMS',
  description: 'A new generation learning management system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header /> {/* Add the Header here */}
        <main className="container mx-auto px-6 py-8">
          {children} {/* Page content will be rendered here */}
        </main>
      </body>
    </html>
  );
}