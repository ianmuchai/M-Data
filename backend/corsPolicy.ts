const localDevelopmentOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

export function parseAllowedOrigins(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (allowedOrigins.length === 0 && localDevelopmentOriginPattern.test(origin)) return true;
  return false;
}

