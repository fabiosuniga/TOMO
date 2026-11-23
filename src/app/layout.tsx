import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TOMO — A Rede Social para Quem Vive Entre Páginas",
  description:
    "Registre suas leituras, avalie livros com meias-estrelas, guarde citações no seu caderno de notas e mantenha sua ofensiva diária de leitura.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        {/* MANDATORY per modern-web-guidance (dark-mode): Declare color-scheme in head to prevent FOUC */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="font-sans antialiased bg-tomo-bg text-tomo-text selection:bg-tomo-green/25 selection:text-tomo-light">
        {children}
      </body>
    </html>
  );
}
