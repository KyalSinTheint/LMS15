/**
 * Default profile avatars.
 *
 * Users without an uploaded photo get a cartoon character generated locally
 * (DiceBear "Avataaars" by Pablo Stanley, free for personal and commercial use).
 * The character is derived from the user's id, so each person keeps the same
 * avatar everywhere and no personal data is sent to any external service.
 */
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

// Soft brand-friendly backgrounds (hex without '#', as DiceBear expects)
const BACKGROUND_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'c7f0db', 'fde68a'];

// Older builds stored stock photos of real people as the "default" avatar.
// Treat those as "no photo" so they are replaced by the cartoon default.
const LEGACY_STOCK_AVATARS = ['photo-1534528741775-53994a69daeb', 'photo-1507003211169-0a1dd7228f2d', 'photo-1535713875002-d1d0cf377fde'];

const cache = new Map<string, string>();

/** Cartoon avatar (data URI) for a stable seed such as a user id or email. */
export function getDefaultAvatar(seed: string): string {
  const key = seed || 'kbzlife-user';
  const cached = cache.get(key);
  if (cached) return cached;

  const uri = createAvatar(avataaars, {
    seed: key,
    backgroundColor: BACKGROUND_COLORS,
    backgroundType: ['solid'],
    // Keep it friendly and workplace-appropriate: natural skin and hair tones,
    // professional clothing, plain glasses, no novelty hats or sunglasses.
    skinColor: ['614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4'],
    hairColor: ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'e8e1e1'],
    facialHairColor: ['2c1b18', '4a312c', '724133', 'a55728'],
    top: [
      'hijab', 'turban', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'fro', 'longButNotTooLong',
      'miaWallace', 'straight01', 'straight02', 'straightAndStrand', 'dreads01', 'frizzle', 'shaggy',
      'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'bigHair',
    ],
    clothing: ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
    clothesColor: ['262e33', '25557c', '5199e4', '3c4f5c', '929598', 'e6e6e6', '65c9ff'],
    accessories: ['prescription01', 'prescription02', 'round'],
    accessoriesProbability: 25,
    mouth: ['smile', 'default', 'twinkle'],
    eyes: ['default', 'happy', 'wink', 'squint'],
    eyebrows: ['default', 'defaultNatural', 'raisedExcited', 'raisedExcitedNatural'],
    facialHairProbability: 15,
  }).toDataUri();

  cache.set(key, uri);
  return uri;
}

const isUsablePhoto = (url?: string | null): url is string =>
  Boolean(url && url.trim() && !LEGACY_STOCK_AVATARS.some((id) => url.includes(id)));

/**
 * The picture to show for a user: their uploaded photo if they have one,
 * otherwise their personal cartoon avatar.
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

/** <img onError> handler: swap a broken photo for the cartoon default. */
export function avatarFallbackOnError(seed: string) {
  return (event: { currentTarget: HTMLImageElement }) => {
    const fallback = getDefaultAvatar(seed);
    if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
  };
}
