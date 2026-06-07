import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BuzzerBeater Advanced Stats",
  description: "Private BuzzerBeater team analytics dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    try {
      const storedTheme = localStorage.getItem("theme");
      const shouldUseDark = storedTheme ? storedTheme === "dark" : true;
      document.documentElement.classList.toggle("dark", shouldUseDark);
    } catch {
      document.documentElement.classList.add("dark");
    }
  `;

  return (
    <html
      lang="en"
      className={`${barlow.variable} dark`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {children}
      </body>
    </html>
  );
}
