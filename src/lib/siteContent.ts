/**
 * Page content admins change from the admin panel (table site_content,
 * migration 20261112): currently the CEO photo, name and title shown on the
 * Our Company page.
 */
import { getSupabaseClient } from './supabase';

export type SiteContentKey = 'ceo_photo_url' | 'ceo_name' | 'ceo_title';
export type SiteContent = Partial<Record<SiteContentKey, string>>;

const SETUP =
  'Saving page content needs a one-time database update: run supabase/migrations/20261112_site_content.sql in the Supabase SQL Editor.';

/** All saved values ({} when nothing is saved or the table is missing). */
export async function loadSiteContent(): Promise<SiteContent> {
  const client = getSupabaseClient();
  if (!client) return {};
  const { data, error } = await client.from('site_content').select('key, value');
  if (error) return {};
  const out: SiteContent = {};
  for (const row of (data || []) as { key: SiteContentKey; value: string | null }[]) if (row.value) out[row.key] = row.value;
  return out;
}

/** Saves values; an empty value removes the key (the page shows its default again). */
export async function saveSiteContent(values: SiteContent, adminName: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const now = new Date().toISOString();
  const toSave = Object.entries(values).filter(([, v]) => v && v.trim());
  const toClear = Object.entries(values).filter(([, v]) => !v || !v.trim()).map(([k]) => k);
  if (toSave.length) {
    const { error } = await client
      .from('site_content')
      .upsert(toSave.map(([key, value]) => ({ key, value: value!.trim(), updated_at: now, updated_by_name: adminName })));
    if (error) throw new Error(/site_content|42P01|schema cache/i.test(error.message) ? SETUP : error.message);
  }
  if (toClear.length) {
    const { error } = await client.from('site_content').delete().in('key', toClear);
    if (error) throw new Error(/site_content|42P01|schema cache/i.test(error.message) ? SETUP : error.message);
  }
}
