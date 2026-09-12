import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "ThinkIT | Personal AI Document Workspace",
    template: "%s | ThinkIT",
  },
  description: "Upload your PDF documents and chat with personal RAG-powered AI, interactive PDF viewer, and smart quiz generator.",
  keywords: ["AI Workspace", "Document Chat", "RAG", "PDF Viewer", "Quiz Generator", "Personal AI", "ThinkIT"],
  authors: [{ name: "ThinkIT Team" }],
  metadataBase: new URL("https://thinkitv2.cubix.codes"),
  openGraph: {
    title: "ThinkIT | Personal AI Document Workspace",
    description: "Upload your PDF documents and chat with personal RAG-powered AI, interactive PDF viewer, and smart quiz generator.",
    url: "https://thinkitv2.cubix.codes",
    siteName: "ThinkIT",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThinkIT | Personal AI Document Workspace",
    description: "Upload your PDF documents and chat with personal RAG-powered AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}>
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
