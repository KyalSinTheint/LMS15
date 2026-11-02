/**
 * Repairs Myanmar (Burmese) text that was damaged when a Pyidaungsu-font
 * PDF was converted to Word / copied as text.
 *
 * The damage is systematic, so it can be undone with rules:
 *   ေ (written before a consonant)  → stored as "ဘ"     ဘပား    → ပေး
 *   ြ (written before a consonant)  → stored as "ဖ"     ဖခင်ား  → ခြင်း
 *   း                               → stored as "ား"    ထာား    → ထား
 *   ်                               → often "္်"        ဖဖစ္်   → ဖြစ်
 *   ီ                               → stored as "ှီ"     ကုမ္ပဏှီ → ကုမ္ပဏီ
 *   ့ (after ွ)                     → stored as "ွေ့"    ဘတွွေ့  → တွေ့
 *   ဲ / ိ                           → sometimes lost as a space
 * plus extra spaces before vowel signs and marks typed in visual order.
 * The rules are followed by a short list of whole-word fixes.
 */

const CONS = 'က-အဣ-ဪဿ၎';
const MARK = 'ါ-ှၖ-ၙ';
const RE_RUN = /[က-႟](?:[က-႟]|[ \t ]+(?=[က-႟]))*/g;
const isCons = (c: string) => /^[က-အဣ-ဪဿ၎]$/.test(c);
const isMark = (c: string) => /^[ါ-ှၖ-ၙ]$/.test(c);

/** Storage order of the marks that follow a consonant (Unicode / UTN #11). */
const ORDER: Record<string, number> = {
  'ျ': 1, // ျ
  'ြ': 2, // ြ
  'ွ': 3, // ွ
  'ှ': 4, // ှ
  'ေ': 5, // ေ
  'ိ': 6, // ိ
  'ီ': 6, // ီ
  'ု': 7, // ု
  'ူ': 7, // ူ
  'ဲ': 8, // ဲ
  'ါ': 9, // ါ
  'ာ': 9, // ာ
  'ံ': 10, // ံ
  '့': 11, // ့
  '်': 12, // ်
  'း': 13, // း
};

/** Text-level substitutions, applied before the marks are reordered. */
const PRE: [RegExp, string][] = [
  [/[\t ]/g, ' '],
  [/ွ +ွေ့/g, 'ွဲ့'], // ဖွ ွေ့ → ဖွဲ့
  [/ွေ့/g, '့'], // တွွေ့ → တွ့ (the ေ comes from the ဘ prefix)
  [/ား/g, 'း'],
  [/္်/g, '်'],
  [/စ္(?![စဆ])/g, 'စ'], // စ္ရ → စရ (a real stack is only စ္စ / စ္ဆ)
  [/ှီ/g, 'ီ'],
  [/ံ ?ို/g, 'ုံ'], // ဆံိုား → ဆုံး
  [/ျြု/g, 'ျို'], // အမျြုား → အမျိုး
  [/ြု/g, 'ု'],
  [/ဘ +က/g, 'ဘဖက'], // ဘ ကာင → ကြော (the wide ြ was lost)
  [/ွ +(?=[က-အ])/g, 'ွဲ'], // ခွ ဘဝ → ခွဲဝေ
  [/ +(?=[ါ-ှ])/g, ''], // spaces before vowel signs / marks
  [/([ဘဖ]) +(?=[က-အ])/g, '$1'], // spaces after the ေ / ြ prefixes
];

/** Whole-word fixes for what the rules cannot know. */
const NOT_SIGN = '(?![\\u102B-\\u103E])';
const WORDS: [RegExp, string][] = [
  [/ဖစ်/g, 'ဖြစ်'],
  [/ဖြြ/g, 'ဖြ'],
  [new RegExp('ဖ(?:ြ)?င်' + NOT_SIGN, 'g'), 'ဖြင့်'],
  [new RegExp('နှင်' + NOT_SIGN, 'g'), 'နှင့်'],
  [new RegExp('ကြောင်' + NOT_SIGN, 'g'), 'ကြောင့်'],
  [new RegExp('ခွဲ?င်' + NOT_SIGN, 'g'), 'ခွင့်'],
  [/လင်(?=ထား)/g, 'လင့်'],
  [/စောင်ရှောက်/g, 'စောင့်ရှောက်'],
  [/ကို?မ္?ပဏ(?:ီ)?/g, 'ကုမ္ပဏီ'],
  [/ကုမ္ပဏီီ/g, 'ကုမ္ပဏီ'],
  [/ဒါဏ်/g, 'ဒဏ်'],
  [/ပျက်ဆီး/g, 'ပျက်စီး'],
  [/သဘာ(?!ဝ)/g, 'သဘော'],
  [/(^|[^ွ])လ ?ပြောင်း/g, '$1လွှဲပြောင်း'],
  [/ေဲ/g, 'ေ'], // ငွေဲ → ငွေ
  [/ွဲ(?=[က-အ]်)/g, 'ွ'], // ရွဲယ် → ရွယ်, တွဲက် → တွက်
  [/ခနို့်/g, 'ခန့်'],
  [/ကုန် ?ကမ်း/g, 'ကုန်ကြမ်း'],
  [/ထည်ဝင်းကြေး/g, 'ထည့်ဝင်ကြေး'],
  [/မိ?မိ?မ(?=၏|အ|သည်|နှင့်|ကို|တို့|ဘာသာ|ကိုယ်)/g, 'မိမိ'],
  [/မမိ(?![\u102B-\u103E])/g, 'မိမိ'],
  [/မမ(?![\u102B-\u103E])/g, 'မိမိ'],
  [/စ္စ်/g, 'စစ်'],
  [/ရနှိုင်/g, 'ရှိနိုင်'],
  [/ညန်/g, 'ညွှန်'],
  [/ဖွံ့ပဖုး/g, 'ဖွံ့ဖြိုး'],
  [/ကိုယစာ်း/g, 'ကိုယ်စား'],
  [/ရွေးချယဝ်ယ်/g, 'ရွေးချယ်ဝယ်'],
  [/ရွေးချယရာ်/g, 'ရွေးချယ်ရာ'],
  [/ကိုယပို်င်/g, 'ကိုယ်ပိုင်'],
  [/ကုန့်ကျစရိတ့်/g, 'ကုန်ကျစရိတ်'],
  [/ထ(?=တွေ့)/g, 'ထိ'],
  [/ပြ?ပ[ြ]?ီး/g, 'ပြီး'],
  [/ရပှါ/g, 'ရှိပါ'],
  [/ရဘှကာင်း/g, 'ရှိကြောင်း'],
  [/လကခံ်/g, 'လက်ခံ'],
  [/ထတို်/g, 'ထုတ်'],
  [/ဖွင်ဟ/g, 'ဖွင့်ဟ'],
  [/အရေးကကြီး/g, 'အရေးကြီး'],
  [/ထည်သွင်း/g, 'ထည့်သွင်း'],
  [/ပရီမံယံ/g, 'ပရီမီယံ'],
  [/ဘး(?=အ)/g, 'ဘေး'],
  [/အနတရာယ်/g, 'အန္တရာယ်'],
  [/လကခဏာ/g, 'လက္ခဏာ'],
  [/ခနဓာ/g, 'ခန္ဓာ'],
  [/ပြဌာန်း/g, 'ပြဋ္ဌာန်း'],
  [/ိုို့/g, 'ို့'],
  [/ို့်/g, 'ို့'],
];


/** Is this ဘ / ဖ a real letter (true) or a misplaced ေ / ြ (false)? */
function isRealLetter(chars: string[], i: number): boolean {
  const next = chars[i + 1];
  if (!next || !isCons(next)) return true; // followed by a vowel sign, space or end
  const after = chars[i + 2];
  // ဘဏ်, ဘဏ္ဍာ, ဖက် … the next consonant closes this syllable
  return after === '်' || after === '္';
}

/** Moves visual-order ေ / ြ after their consonant and sorts each syllable's marks. */
function reorder(run: string): string {
  const chars = Array.from(run);
  let out = '';
  let prefix: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if ((c === 'ဘ' || c === 'ဖ') && !isRealLetter(chars, i)) {
      prefix.push(c === 'ဘ' ? 'ေ' : 'ြ');
      i++;
      continue;
    }
    if (c === 'ေ' && i + 1 < chars.length && isCons(chars[i + 1])) {
      prefix.push('ေ'); // a real ေ that was typed before its consonant
      i++;
      continue;
    }
    if (isCons(c)) {
      // base: consonant, plus stacked consonants (C ္ C)
      let base = c;
      i++;
      while (chars[i] === '္' && chars[i + 1] && isCons(chars[i + 1])) {
        base += chars[i] + chars[i + 1];
        i += 2;
      }
      const marks = [...prefix];
      prefix = [];
      while (i < chars.length && isMark(chars[i]) && chars[i] !== '္') {
        // Kinzi / asat followed by ္ belongs to the next consonant
        if (chars[i] === '်' && chars[i + 1] === '္') break;
        marks.push(chars[i]);
        i++;
      }
      const seen = new Set<string>();
      const uniq = marks.filter((m) => (seen.has(m) ? false : (seen.add(m), true)));
      uniq.sort((a, b) => (ORDER[a] ?? 20) - (ORDER[b] ?? 20));
      out += base + uniq.join('');
      continue;
    }
    if (prefix.length) {
      // nothing to attach to: put the letters back
      out += prefix.map((p) => (p === 'ေ' ? 'ဘ' : 'ဖ')).join('');
      prefix = [];
    }
    out += c;
    i++;
  }
  if (prefix.length) out += prefix.map((p) => (p === 'ေ' ? 'ဘ' : 'ဖ')).join('');
  return out;
}

/** Applies only the whole-word fixes (safe on text that is already repaired). */
export function fixMyanmarWords(text: string): string {
  return text.replace(RE_RUN, (run) => {
    let s = run;
    for (const [re, to] of WORDS) s = s.replace(re, to);
    return s;
  });
}

/** True when the text looks like the damaged Pyidaungsu export. */
export function hasDamagedMyanmar(text: string): boolean {
  const my = (text.match(/[\u1000-\u109F]/g) || []).length;
  if (my < 8) return false;
  // Sequences that never occur in correct Myanmar text
  const signs = (text.match(/ာား|္်|ွေ့|ွွ| [\u102B-\u103E]/g) || []).length;
  return signs >= 2 && signs / my > 0.004;
}

/** Repairs damaged Myanmar text. Text that is already fine is returned unchanged. */
export function fixMyanmar(text: string): string {
  if (!hasDamagedMyanmar(text)) return text;
  return text.replace(RE_RUN, (run) => {
    let s = run;
    for (const [re, to] of PRE) s = s.replace(re, to);
    s = reorder(s);
    for (const [re, to] of WORDS) s = s.replace(re, to);
    return s;
  });
}

/**
 * Rough check that Myanmar text is well formed: share of syllables that do
 * not follow the basic consonant + marks pattern.
 */
export function myanmarBadRatio(text: string): number {
  const syl = text.match(new RegExp(`[${CONS}](?:္[${CONS}])?[${MARK}]*`, 'g')) || [];
  if (!syl.length) return 0;
  const bad = syl.filter((s) => {
    const m = Array.from(s).slice(1).filter((ch) => ORDER[ch] !== undefined);
    for (let k = 1; k < m.length; k++) if (ORDER[m[k]] < ORDER[m[k - 1]]) return true;
    if (/[ိီ][ိီ]|[ုူ][ုူ]|ေ.*[ိီ]/.test(s)) return true;
    return /^[ဘဖ][က-အ]/.test(s);
  });
  return bad.length / syl.length;
}
