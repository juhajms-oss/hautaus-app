import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Varoitus: Tämä sallii tuotantorakennuksen valmistumisen onnistuneesti, 
    // vaikka projektissasi olisi ESLint-virheitä.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! VAROITUS !!
    // Vaarallista sallia tuotantorakennukset valmistumaan, 
    // vaikka projektissasi on tyyppivirheitä.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;