import { NextRequest } from "next/server";

/**
 * Returns the reliable public base URL of the application.
 * Prioritizes explicit environment variable, Vercel deployment variables,
 * incoming request proxy headers (x-forwarded-host), and falls back to req.nextUrl.origin.
 */
export function getBaseUrl(req?: NextRequest): string {
  // 1. Explicit configured production URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  // 2. Production Vercel domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // 3. Current branch/preview Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 4. Request headers (handles custom domains and reverse proxies)
  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }
    const host = req.headers.get("host");
    if (host) {
      const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
      return `${proto}://${host}`;
    }
    try {
      return req.nextUrl.origin;
    } catch {}
  }
  return "http://localhost:3000";
}
