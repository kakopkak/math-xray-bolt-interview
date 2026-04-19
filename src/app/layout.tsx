import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const themeInitScript = `
(() => {
  const STORAGE_KEY = "math-xray-theme";
  const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
  const sanitizeThemePreference = (value) =>
    value === "light" || value === "dark" || value === "system" ? value : "system";
  const resolveEffectiveTheme = (preference, prefersDark) =>
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const theme = sanitizeThemePreference(storedTheme);
    document.documentElement.dataset.theme = resolveEffectiveTheme(
      theme,
      window.matchMedia(SYSTEM_THEME_QUERY).matches,
    );
  } catch {
    document.documentElement.dataset.theme = resolveEffectiveTheme(
      "system",
      window.matchMedia(SYSTEM_THEME_QUERY).matches,
    );
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Matemaatika Röntgen",
  description: "KoosRada Matemaatika Röntgen: sammupõhine väärarusaamade analüüs õpetajatele.",
  openGraph: {
    title: "Matemaatika Röntgen",
    description: "KoosRada Matemaatika Röntgen: sammupõhine väärarusaamade analüüs õpetajatele.",
    type: "website",
    locale: "et_EE",
    siteName: "Matemaatika Röntgen",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Matemaatika Röntgeni eelvaatepilt",
      },
    ],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="et"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <AuthSessionProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
