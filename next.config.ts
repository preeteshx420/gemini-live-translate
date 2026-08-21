import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@livekit/rtc-node", "ws"],
  allowedDevOrigins: [
    "05dd-74-235-140-73.ngrok-free.app",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
