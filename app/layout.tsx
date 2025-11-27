// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header'; // Using the alias for consistency
import { ThemeProvider } from '@/contexts/ThemeContext'; // Import the ThemeProvider

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
        <ThemeProvider> {/* Wrap content with the ThemeProvider */}
          {/* Add a div to manage background and text colors based on the theme, ensuring min-h-screen */}
          <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
            <Header /> {/* Add the Header component */}
            {/* The layout in the first file included specific container/padding for main, 
                let's re-introduce a reasonable wrapper for the main content */}
            <main className="container mx-auto px-6 py-8"> 
              {children} {/* Page content will be rendered here */}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}