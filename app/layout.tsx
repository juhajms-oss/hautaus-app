import type { Metadata } from "next";
import "./globals.css";
import Gatekeeper from "./Gatekeeper"; // Tuodaan portinvartija

export const metadata: Metadata = {
  title: "Hautaus-App",
  description: "Hautausjärjestelyt ja muistotilaisuudet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body className="bg-slate-50">
        {/* Käärimme koko sovelluksen Gatekeeperin sisään */}
        <Gatekeeper>
          {children}
        </Gatekeeper>
      </body>
    </html>
  );
}