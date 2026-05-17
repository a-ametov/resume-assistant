import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ResumeGlobalStateProvider } from "./components/resume_global_state";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Assistant",
  description: "AI-powered resume review and improvement tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ResumeGlobalStateProvider>{children}</ResumeGlobalStateProvider>
      </body>
    </html>
  );
}
