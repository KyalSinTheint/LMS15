/**
 * Company Bulletin pictures in the same glossy 3D style as the products:
 * a clean brand-blue background with a 3D illustration of what the bulletin
 * is about (Smile Campaign → smiling face, Blood Donation → blood drop …).
 * Subjects without their own illustration get their icon as a raised 3D
 * clay icon on a tile. Original SVG artwork.
 */
import React from 'react';
import type { SceneKey } from './productScenes';
import type { Subject } from './bulletinSubjects';
import { Product3DArt } from './product3d';

/** Bulletin subject → 3D illustration. */
const SUBJECT_ART: Record<string, string> = {
  smile: 'smile', laugh: 'smile',
  love: 'heartcare', thanks: 'protect', charity: 'protect', support: 'protect',
  blood: 'blood',
  nature: 'tree', sprout: 'tree', flower: 'tree',
  birthday: 'cake',
  megaphone: 'megaphone', launch: 'megaphone',
  trophy: 'trophy', award: 'trophy', medal: 'trophy',
  bell: 'bell',
  calendar: 'calendar', holiday: 'calendar', time: 'calendar',
  app: 'phone', chat: 'phone',
  security: 'lock',
  gift: 'gift', bonus: 'gift', christmas: 'gift', newyear: 'gift', festival: 'gift',
  target: 'target', growth: 'target',
  health: 'health', activity: 'heartcare', fitness: 'heartcare', mind: 'heartcare',
  hospital: 'hospital', medicine: 'medicine', vaccine: 'medicine',
  accident: 'accident',
  rain: 'rainy', umbrella: 'rainy', thingyan: 'rainy',
  family: 'family', baby: 'family',
  team: 'group', partner: 'group', welcome: 'group', job: 'group',
  money: 'savings', savings: 'savings', discount: 'wallet', shopping: 'wallet', card: 'wallet', premium: 'wallet', claim: 'document',
  policy: 'document', law: 'document', tax: 'document',
  graduation: 'education', training: 'education', reading: 'education',
  travel: 'plane', ship: 'plane',
  car: 'travel', bike: 'travel', bus: 'travel', truck: 'travel',
  home: 'home', fire: 'home',
  office: 'city', store: 'city',
  globe: 'universe',
};

/** Admin-chosen / category scene → 3D illustration. */
const SCENE_ART: Record<string, string> = {
  campaign: 'target', policy: 'document', announce: 'megaphone', notice: 'bell', award: 'trophy', celebrate: 'gift',
  education: 'education', health: 'health', savings: 'savings', city: 'city', travel: 'plane', shield: 'shield',
  home: 'home', universe: 'universe', family: 'family', retirement: 'retirement',
};

/** Picture filling its parent (parent: relative, sized). */
export const BulletinArt: React.FC<{ scene?: SceneKey; subject?: Subject | null; className?: string }> = ({
  scene = 'notice',
  subject,
  className = '',
}) => {
  const art = subject ? SUBJECT_ART[subject.key] || 'icon' : SCENE_ART[scene] || 'bell';
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1f8ccb] via-[#176b98] to-[#0d3b66]" />
      <div className="absolute -right-10 -top-16 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-20 w-44 h-44 rounded-full bg-black/10" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-sky-300/15" />
      <Product3DArt
        scene={art}
        icon={subject?.Icon}
        className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 h-[88%] max-h-56 w-auto aspect-square"
      />
    </div>
  );
};
