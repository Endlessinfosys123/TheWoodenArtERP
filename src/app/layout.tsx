import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErpProvider } from '@/lib/store/ErpContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CNC Job Work ERP — Precision ERP System',
  description: 'Enterprise Resource Planning system for CNC job-work, raw material inward, engineering drawings, production tracking, quality control, dispatch challans & GST invoicing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground flex min-h-screen antialiased`}>
        <ErpProvider>
          <div className="flex w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-6 overflow-x-hidden">
                {children}
              </main>
            </div>
          </div>
        </ErpProvider>
      </body>
    </html>
  );
}
