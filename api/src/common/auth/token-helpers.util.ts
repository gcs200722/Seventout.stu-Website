export function parseJwtDurationToSeconds(
  duration: string,
  keyLabel: string,
): number {
  const normalized = duration.trim();
  const match = normalized.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid JWT duration for ${keyLabel}: ${normalized}`);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const factorMap: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * factorMap[unit];
}

export function expiryDateFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export function filterPermissionCodesByPrefix(
  permissions: string[],
  prefix: string,
): string[] {
  return permissions.filter((permission) => permission.startsWith(prefix));
}
