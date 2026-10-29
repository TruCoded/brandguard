import "./island.css";
import "./globals.css";
import { AppProvider } from "@/lib/ctx";
import Shell from "@/components/Shell";
export const metadata = { title: "BrandGuard", description: "BrandGuard: AI-powered brand governance. Every piece of content, on-brand by design." };
export default function RootLayout({ children }) {
  return (<html lang="en"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="icon" href="/favicon.svg" />
  </head><body><AppProvider><Shell>{children}</Shell></AppProvider></body></html>);
}
