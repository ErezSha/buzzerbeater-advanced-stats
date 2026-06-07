import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
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
