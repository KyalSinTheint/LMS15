/**
 * Default profile avatars: friendly animal characters.
 *
 * Users without an uploaded photo get an animal (Microsoft Fluent Emoji,
 * MIT license) on a soft coloured circle. The animal and colour are chosen
 * from the user's id, so each person keeps the same avatar everywhere, and
 * everything is generated locally (no external requests, no personal data
 * leaves the browser).
 */
import { ANIMAL_AVATAR_ICONS } from './animalAvatarIcons';

const ANIMALS = Object.keys(ANIMAL_AVATAR_ICONS);

// Soft brand-friendly backgrounds
const BACKGROUND_COLORS = ['#b6e3f4', '#c0aede', '#d1d4f9', '#ffd5dc', '#ffdfbf', '#c7f0db', '#fde68a', '#e0f2fe'];

// Older builds stored stock photos of real people as the "default" avatar.
// Treat those as "no photo" so they are replaced by the animal default.
const LEGACY_STOCK_AVATARS = ['photo-1534528741775-53994a69daeb', 'photo-1507003211169-0a1dd7228f2d', 'photo-1535713875002-d1d0cf377fde'];

/** Small, stable string hash: FNV-1a with a murmur3 finaliser for an even spread. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const cache = new Map<string, string>();

/** Animal avatar (SVG data URI) for a stable seed such as a user id or email. */
export function getDefaultAvatar(seed: string): string {
  const key = seed || 'kbzlife-user';
  const cached = cache.get(key);
  if (cached) return cached;

  const h = hash(key);
  const animal = ANIMALS[h % ANIMALS.length];
  // Use different bits for the colour so animal and colour vary independently
  const background = BACKGROUND_COLORS[Math.floor(h / ANIMALS.length) % BACKGROUND_COLORS.length];

  // 64x64 canvas; the 32x32 artwork is scaled to 44px and centred
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" fill="${background}"/>` +
    `<g transform="translate(10 10) scale(1.375)">${ANIMAL_AVATAR_ICONS[animal]}</g>` +
    `</svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  cache.set(key, uri);
  return uri;
}

const isUsablePhoto = (url?: string | null): url is string =>
  Boolean(url && url.trim() && !LEGACY_STOCK_AVATARS.some((id) => url.includes(id)));

/**
 * The picture to show for a user: their uploaded photo if they have one,
 * otherwise their personal animal avatar.
 */
export function getUserAvatar(user?: {
  id?: string | null;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
} | null): string {
  if (user && isUsablePhoto(user.avatar_url)) return user.avatar_url;
  return getDefaultAvatar(user?.id || user?.email || user?.full_name || '');
}

/** <img onError> handler: swap a broken photo for the animal default. */
export function avatarFallbackOnError(seed: string) {
  return (event: { currentTarget: HTMLImageElement }) => {
    const fallback = getDefaultAvatar(seed);
    if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
  };
}
