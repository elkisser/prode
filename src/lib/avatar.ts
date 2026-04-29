export function getDefaultAvatarUrl(seed: string, size = 160): string {
  const url = new URL('https://api.dicebear.com/9.x/avataaars/png');
  url.searchParams.set('seed', seed);
  url.searchParams.set('radius', '36');
  url.searchParams.set('backgroundColor', '0b1220');
  url.searchParams.set('size', String(size));
  return url.toString();
}

function sanitizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleaned = String(url).trim().replace(/`/g, '').trim();
  if (!cleaned) return null;
  if (
    cleaned.startsWith('https://') ||
    cleaned.startsWith('http://') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:')
  ) {
    return cleaned;
  }
  return null;
}

export function resolveAvatarUrl(avatarUrl: string | null | undefined, seed: string, size = 160): string {
  return sanitizeAvatarUrl(avatarUrl) || getDefaultAvatarUrl(seed, size);
}
