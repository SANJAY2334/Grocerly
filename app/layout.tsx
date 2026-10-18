import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { QuickViewModal } from "@/components/layout/QuickViewModal";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { FloatingCartBar } from "@/components/layout/FloatingCartBar";
import { ToastContainer } from "@/components/ui/Toast";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  themeColor: "#163C29",
};

export const metadata: Metadata = {
  title: "Grocerly — Good Food. Brighter Days. | Premium Grocery Marketplace",
  description:
    "Premium groceries, smarter choices and a healthier tomorrow — delivered to your door.",
  applicationName: "Grocerly",
  openGraph: {
    title: "Grocerly — Good Food. Brighter Days.",
    description:
      "Premium groceries, smarter choices and a healthier tomorrow — delivered to your door.",
    type: "website",
    locale: "en_IN",
    siteName: "Grocerly",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Grocerly Fresh Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grocerly — Good Food. Brighter Days.",
    description: "Premium groceries, smarter choices and a healthier tomorrow — delivered to your door.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${caveat.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col font-sans bg-[#F8F7F2] text-[#1A221E] antialiased selection:bg-[#C8E27A] selection:text-[#163C29]">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileNav />
        <CartDrawer />
        <QuickViewModal />
        <CommandPalette />
        <FloatingCartBar />
        <ToastContainer />
      </body>
    </html>
  );
}
