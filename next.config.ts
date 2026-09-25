import type { NextConfig } from "next";

// /api/* is forwarded to the Node.js + Express + Prisma backend (see ../backend) by
// src/app/api/[...path]/route.ts, which reads BACKEND_URL at request time.
const nextConfig: NextConfig = {};

export default nextConfig;
