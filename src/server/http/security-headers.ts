/**
 * Security header helpers.
 *
 * Builds production-oriented HTTP security headers for pages and APIs.
 */

type SecurityHeadersOptions = {
  isDevelopment: boolean;
};

function buildContentSecurityPolicy({
  isDevelopment,
}: SecurityHeadersOptions) {
  const connectSources = ["'self'"];
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (isDevelopment) {
    connectSources.push("ws:", "http:", "https:");
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders(options: SecurityHeadersOptions) {
  const headers = new Headers({
    "Content-Security-Policy": buildContentSecurityPolicy(options),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy":
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-DNS-Prefetch-Control": "off",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
  });

  if (!options.isDevelopment) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return headers;
}
