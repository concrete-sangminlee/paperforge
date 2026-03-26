import type { Metadata } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/shared/command-palette";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "PaperForge — Open-Source Collaborative LaTeX Editor",
    template: "%s | PaperForge",
  },
  description:
    "Write, collaborate, and publish LaTeX documents in your browser. Real-time co-authoring, instant PDF preview, Git integration, and unlimited collaborators — free and open-source.",
  keywords: [
    "LaTeX editor",
    "collaborative LaTeX",
    "online LaTeX editor",
    "Overleaf alternative",
    "open source LaTeX",
    "academic writing",
    "research collaboration",
    "PDF preview",
    "real-time collaboration",
    "self-hosted LaTeX",
    "LaTeX compiler online",
    "scientific writing tool",
  ],
  authors: [{ name: "PaperForge Team" }],
  creator: "PaperForge",
  publisher: "PaperForge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PaperForge",
    title: "PaperForge — Open-Source Collaborative LaTeX Editor",
    description:
      "Write, collaborate, and publish LaTeX documents in your browser. Free, open-source Overleaf alternative with unlimited collaborators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PaperForge — Open-Source Collaborative LaTeX Editor",
    description:
      "Free, open-source Overleaf alternative. Real-time collaboration, Git integration, instant PDF preview.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider basePath="/api/v1/auth">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <CommandPalette />
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
