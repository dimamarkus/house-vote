import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@turbodima/ui/core/ThemeProvider';
import { Toaster } from '@turbodima/ui/shadcn/sonner';
import { ClerkProvider } from '@clerk/nextjs';
import { Header } from '/src/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HouseVote',
  description: 'Collaborative house hunting trip planning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col bg-background">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster className="toaster group" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}