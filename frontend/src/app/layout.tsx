import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/components/StoreProvider";
import ClientLayout from "@/components/ClientLayout";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VedaAI — AI Teacher's Toolkit",
  description: "AI-powered answer sheet evaluator and plagiarism detector",
  icons: {
    icon: [
      { url: "/veda-ai-logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/veda-ai-logo.png",
    apple: "/veda-ai-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${bricolage.variable} ${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-bricolage, 'Bricolage Grotesque', system-ui, sans-serif)" }}
      >
        <StoreProvider>
          <ToastProvider>
            <div className="flex h-screen w-screen overflow-hidden">
              <ClientLayout>{children}</ClientLayout>
            </div>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
