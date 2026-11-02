/**
 * Everything employees can see on the portal, as assistant knowledge:
 * company information (vision, mission, CEO motto, contact), the L&D team and
 * Head of Department, Top Performers, news, videos, bulletins, training
 * lessons, skill resources and courses. Only published content is used, and
 * nothing that is visible to admins only (employee accounts, emails, logs).
 */
import type {
  CompanyBulletinItem,
  CompanyNewsArticle,
  CompanyVideoItem,
  Course,
  HodMotto,
  LdTeamMember,
  LicenseTrainingLesson,
  SkillDevelopmentResource,
  TopPerformerEntry,
} from '../types/lms';
import type { CompanyContentData } from '../data/companyContent';
import type { KnowledgeItem } from './chatbotSearch';

export interface SiteData {
  companyContent?: CompanyContentData | null;
  topPerformers: TopPerformerEntry[];
  teamMembers: LdTeamMember[];
  hodMotto?: HodMotto | null;
  companyNews: CompanyNewsArticle[];
  companyVideos: CompanyVideoItem[];
  companyBulletins: CompanyBulletinItem[];
  licenseTrainingLessons: LicenseTrainingLesson[];
  skillDevelopmentResources: SkillDevelopmentResource[];
  courses: Course[];
}

const clean = (...parts: (string | null | undefined)[]) =>
  parts
    .filter((p) => p && String(p).trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Sort key for a Top Performer's month ("October 2026" → 202610). */
const periodKey = (p: TopPerformerEntry) => {
  const year = Number((p.recognition_period || '').match(/\b(20\d\d)\b/)?.[1] || (p.award_date || p.created_at || '').slice(0, 4)) || 0;
  const m = MONTHS.findIndex((name) => new RegExp(name.slice(0, 3), 'i').test(p.recognition_period || ''));
  return year * 100 + (m >= 0 ? m + 1 : p.month_index || 0);
};

export function buildSiteKnowledge(d: SiteData): KnowledgeItem[] {
  const items: KnowledgeItem[] = [];
  const add = (id: string, title: string, content: string, source: string) => {
    if (content.length >= 10) items.push({ id: `site:${id}`, kind: 'site', title, content, source });
  };

  // ---- Our Company --------------------------------------------------------
  const c = d.companyContent;
  if (c) {
    const src = 'Our Company';
    if (c.ceoMotto?.ceoName)
      add(
        'ceo',
        `CEO — ${c.ceoMotto.ceoName}`,
        clean(
          `The CEO (Chief Executive Officer) of KBZ Life is ${c.ceoMotto.ceoName}${c.ceoMotto.ceoTitle ? `, ${c.ceoMotto.ceoTitle}` : ''}.`,
          'ကုမ္ပဏီ၏ CEO မှာ',
          `${c.ceoMotto.ceoName} ဖြစ်ပါသည်။`,
          c.ceoMotto.motto ? `CEO motto: “${c.ceoMotto.motto}”` : '',
          c.ceoMotto.statementContext
        ),
        src
      );
    if (c.about?.paragraphs?.length) add('about', c.about.heading || 'About KBZ Life', clean(...c.about.paragraphs), src);
    for (const key of ['vision', 'mission', 'purpose'] as const) {
      const v = c[key];
      if (v) add(key, v.heading || key, clean(`KBZ Life ${key}:`, v.englishStatement, v.burmeseStatement ? `(${v.burmeseStatement})` : ''), src);
    }
    if (c.coreValues?.items?.length)
      add(
        'core-values',
        'Core Values',
        clean(
          'KBZ Life core values (တန်ဖိုးထားမှုများ):',
          c.coreValues.items.map((v) => `${v.number}. ${v.title} (${v.burmeseSubtitle}) — ${v.description}`).join(' ')
        ),
        src
      );
    if (c.aspirations?.items?.length)
      add('aspirations', c.aspirations.englishSubtitle || 'Aspirations', clean(c.aspirations.intro, ...c.aspirations.items.map((a) => a.paragraph)), src);
    if (c.contact)
      add(
        'contact',
        'Contact KBZ Life',
        clean(
          'Contact KBZ Life (ဆက်သွယ်ရန်) — company phone number, hotline, email address and office address:',
          c.contact.phone && `Phone ဖုန်း: ${c.contact.phone}.`,
          c.contact.email && `Email: ${c.contact.email}.`,
          c.contact.website && `Website: ${c.contact.website}.`,
          ...(c.contact.addresses || []).map((a) => `${a.city} office address (လိပ်စာ): ${a.address}.`)
        ),
        src
      );
  }

  // ---- L&D team -------------------------------------------------------------
  const h = d.hodMotto;
  if (h && h.is_published !== false && (h.hod_name || h.motto_text))
    add(
      'hod',
      `Head of L&D — ${h.hod_name || ''}`.trim(),
      clean(
        h.hod_name && `The Head of Department (HOD) of Learning & Development is ${h.hod_name}${h.hod_title ? `, ${h.hod_title}` : ''}.`,
        h.hod_name && `L&D ဌာနမှူး (HOD) မှာ ${h.hod_name} ဖြစ်ပါသည်။`,
        h.motto_text && `HOD motto: “${h.motto_text}”`,
        h.statement_context
      ),
      'L&D Team'
    );
  const team = d.teamMembers.filter((m) => m.is_published !== false).sort((a, b) => a.display_order - b.display_order);
  if (team.length) {
    add(
      'team',
      'Learning & Development team',
      clean(
        `The Learning & Development (L&D) team members (L&D အဖွဲ့ဝင်များ): ${team
          .map((m) => `${m.full_name} — ${m.position}${m.member_type === 'intern' ? ' (intern)' : ''}`)
          .join('; ')}.`
      ),
      'L&D Team'
    );
    for (const m of team)
      add(
        `team:${m.id}`,
        m.full_name,
        clean(`${m.full_name} is ${m.position}${m.department ? ` in ${m.department}` : ''}${m.member_type === 'intern' ? ' (intern)' : ''} in the KBZ Life L&D team.`),
        'L&D Team'
      );
  }

  // ---- Top Performers -------------------------------------------------------
  const performers = d.topPerformers.filter((p) => p.status === 'published');
  if (performers.length) {
    const byPeriod = new Map<number, TopPerformerEntry[]>();
    for (const p of performers) {
      const k = periodKey(p);
      byPeriod.set(k, [...(byPeriod.get(k) || []), p]);
    }
    const periods = [...byPeriod.keys()].sort((a, b) => b - a);
    const line = (p: TopPerformerEntry) =>
      `${p.ranking ? `#${p.ranking} ` : ''}${p.employee_name} (${[p.employee_title, p.department, p.channel].filter(Boolean).join(', ')})${
        p.achievement_title ? ` — ${p.achievement_title}` : ''
      }`;
    periods.forEach((k, i) => {
      const list = byPeriod.get(k)!.sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
      const period = list[0].recognition_period || `${MONTHS[(k % 100) - 1] || ''} ${Math.floor(k / 100)}`;
      add(
        `top:${k}`,
        `Top Performers — ${period}`,
        clean(
          i === 0 ? 'Latest (this month’s) Top Performers. နောက်ဆုံးလ ထိပ်တန်းဝန်ထမ်းများ (Top Performer) —' : 'Top Performers (ထိပ်တန်းဝန်ထမ်းများ)',
          `for ${period}: ${list.map(line).join('; ')}.`
        ),
        'Top Performers'
      );
    });
    for (const p of performers)
      add(
        `top-person:${p.id}`,
        `${p.employee_name} — Top Performer`,
        clean(`${line(p)} was a Top Performer for ${p.recognition_period}.`, p.achievement_description),
        'Top Performers'
      );
  }

  // ---- News, videos, bulletins ----------------------------------------------
  for (const n of d.companyNews.filter((x) => x.status === 'published'))
    add(`news:${n.id}`, n.title, clean(n.summary, ...(n.content || []).slice(0, 3), n.published_at && `(Published ${n.published_at.slice(0, 10)})`), 'Company News');
  for (const v of d.companyVideos.filter((x) => x.status === 'published'))
    add(`video:${v.id}`, v.title, clean(`Company update video: ${v.title}.`, v.description), 'Company Update Videos');
  for (const b of d.companyBulletins.filter((x) => x.published || x.status === 'published'))
    add(
      `bulletin:${b.id}`,
      b.title,
      clean(`Company bulletin${b.reference_no ? ` ${b.reference_no}` : ''}: ${b.title}.`, b.description, b.published_at && `(Published ${b.published_at.slice(0, 10)})`),
      'Company Bulletin'
    );

  // ---- Learning ----------------------------------------------------------------
  for (const l of d.licenseTrainingLessons) {
    const lesson = l as LicenseTrainingLesson & { is_published?: boolean; status?: string };
    if (lesson.is_published === false || lesson.status === 'draft') continue;
    add(`license:${l.id}`, l.title, clean(`License Training lesson: ${l.title}.`, l.description), 'License Training');
  }
  for (const r of d.skillDevelopmentResources) {
    const res = r as SkillDevelopmentResource & { is_published?: boolean; status?: string };
    if (res.is_published === false || res.status === 'draft') continue;
    add(`skill:${r.id}`, r.title, clean(`Skill Development (${r.topic}): ${r.title}.`, r.description, r.instructor_name && `Instructor: ${r.instructor_name}.`), 'Skill Development');
  }
  for (const co of d.courses.filter((x) => x.published))
    add(`course:${co.id}`, co.title, clean(`Course: ${co.title} (${co.category}).`, co.description), 'Courses');

  return items;
}
