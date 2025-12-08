import type { Metadata } from "next";
import "./globals.css";
import Gatekeeper from "./Gatekeeper";

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
        {/* Sovellus on suojattu Gatekeeperillä */}
        <Gatekeeper>
          {children}
        </Gatekeeper>
      </body>
    </html>
  );
}