// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';

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
    <html lang="en" className="h-full">
      {/* 
        Applied h-full and theme colors to body to prevent white flashes 
        during theme switching and ensure full app height.
      */}
      <body className={`${inter.className} h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200`}>
        <ThemeProvider>
          {/* 
            Flex Column Structure:
            Ensures Header stays at the top and Main fills the remaining space.
          */}
          <div className="flex flex-col h-full">
            <Header />
            
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}