import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hautaus-App",
  description: "Hautausjärjestelyt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body className="bg-slate-50">
        {children}
      </body>
    </html>
  );
}