/**
 * Admin → Settings → "Our Company · CEO": change the CEO photo, name and
 * title shown on the Our Company page (stored in site_content).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2, UserRound } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { uploadImageFile } from '../../lib/storageUtils';
import { loadSiteContent, saveSiteContent } from '../../lib/siteContent';
import { defaultCompanyContent } from '../../data/companyContent';

const DEFAULT_PHOTO = defaultCompanyContent.ceoMotto.photoUrl || '/assets/aistudio/CEO_38bdec3d.jpg';

export const CeoContentCard: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { currentUser, showToast } = useLms();
  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState({ photo: '', name: '', title: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSiteContent().then((c) => {
      const v = { photo: c.ceo_photo_url || '', name: c.ceo_name || '', title: c.ceo_title || '' };
      setSaved(v);
      setPhoto(v.photo);
      setName(v.name);
      setTitle(v.title);
    });
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadImageFile(file, 'company-news');
      if (!res.success || !res.url) throw new Error(res.error || 'Upload failed');
      setPhoto(res.url);
    } catch (err) {
      showToast('error', 'Photo not uploaded', (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteContent({ ceo_photo_url: photo, ceo_name: name, ceo_title: title }, currentUser.full_name);
      setSaved({ photo, name, title });
      showToast('success', 'CEO section updated', 'Employees see the change on the Our Company page.');
      onSaved?.();
    } catch (err) {
      showToast('error', 'Not saved', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const dirty = photo !== saved.photo || name !== saved.name || title !== saved.title;
  const input =
    'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#176B98]/30';

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-2xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-[#176B98] flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Our Company · CEO</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Photo, name and title shown in the CEO Motto section of the Our Company page.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        <div className="shrink-0">
          <img
            src={photo || DEFAULT_PHOTO}
            alt="CEO"
            className="w-36 aspect-[4/5] object-cover rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void upload(f);
            }}
          />
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {photo ? 'Change' : 'Upload'}
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto('')}
                title="Use the default photo"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-red-600 text-[11px] font-bold hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Default
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CEO name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultCompanyContent.ceoMotto.ceoName} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultCompanyContent.ceoMotto.ceoTitle} className={input} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Leave a field empty to use the default shown in grey. A portrait photo (4:5) looks best.</p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save CEO section
          </button>
        </div>
      </div>
    </section>
  );
};
