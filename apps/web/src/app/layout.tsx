import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThinkIT | Personal AI Document Workspace",
  description: "Upload your documents and chat with your personal AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-gradient-premium text-foreground relative overflow-x-hidden">
        {/* Background Blobs for Visual Effect */}
        <div className="animated-blob bg-brand-600/20 w-96 h-96 rounded-full top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <div className="animated-blob bg-blue-600/20 w-96 h-96 rounded-full bottom-0 right-0 translate-x-1/2 translate-y-1/2" style={{ animationDelay: '2s' }} />
        
        <main className="flex-1 relative z-10 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
