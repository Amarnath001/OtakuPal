import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OtakuPal — Anime & Manga Recommendations",
  description: "Get personalized anime, manga, and manhwa recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-otaku-bg text-zinc-200">
        {children}
      </body>
    </html>
  );
}
