import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.nl360.site",
      },
    ],
  },
};

export default nextConfig;
