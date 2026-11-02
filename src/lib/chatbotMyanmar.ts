/**
 * Helps the assistant understand questions typed in Myanmar.
 *
 * - Myanmar has no spaces between words, so text is split into syllables
 *   (မြန် · မာ · စာ) and compared by syllables and syllable pairs.
 * - Spoken Myanmar (ဘာလဲ, တယ်, နဲ့, တဲ့) is mapped to the written forms the
 *   handbooks use (သည်, နှင့်, သော).
 * - Common insurance words get their English term too (ပရီမီယံ → premium),
 *   so a Myanmar question also finds English-only material.
 */

const CONS = 'က-အ';
/** Syllable break: before a consonant that is not stacked or closed by ် / ္ */
const BREAK = new RegExp(`(?<!္)([${CONS}ဣဤဥဦဧဩဪဿ၌၍၏၀-၉])(?![်္])`, 'g');

export function syllables(text: string): string[] {
  return text
    .replace(BREAK, ' $1')
    .split(/[\s၊။,.?!()“”"'\-–—:;/]+/)
    .filter(Boolean);
}

/** Grammar words: they appear everywhere, so they say nothing about the topic. */
export const MM_STOP = new Set(
  (
    'သည် ပါ ၏ ကို မှ က တွင် များ နှင့် သော ဖြစ် ရှိ သို့ ၍ လျှင် ပြီး လည်း သာ ပင် မည် ရန် အတွက် ' +
    'တို့ ခဲ့ နေ ထား ပေး ရ နိုင် ကြ ချင် လို လဲ လား နည်း သ ဘာ ဘယ် ဆို တာ မှာ တယ် မယ် တဲ့ နဲ့ ပဲ ဘူး ' +
    'ရဲ့ လေး ပေါ့ နော် ဗျာ ရှင့် ခင်ဗျ ဗျ ရှင် အဲ ဒီ ဤ ထို ဟု ဟူ သည့် ကဲ့ သို့ ဆိုင် ရာ ဖို့ လို့ ရင် လောက် ' +
    'မ ဟုတ် ကော ရော ပြော ပြ ပြန် ချင် သိ ကြည့် ဦး'
  ).split(' ')
);

/** Spoken → written Myanmar (as used in handbooks). Longest first. */
const SPOKEN: [RegExp, string][] = [
  [/ဆိုတာ(ဘာလဲ|က)?/g, 'ဆိုသည်မှာ'],
  [/ဘယ်လိုလဲ|ဘယ်လို/g, 'မည်သို့'],
  [/ဘယ်လောက်/g, 'မည်မျှ'],
  [/ဘယ်သူ/g, 'မည်သူ'],
  [/ဘာကြောင့်/g, 'အဘယ်ကြောင့်'],
  [/တွေ/g, 'များ'],
  [/နဲ့/g, 'နှင့်'],
  [/တဲ့/g, 'သော'],
  [/တယ်/g, 'သည်'],
  [/ဒီ/g, 'ဤ'],
  [/အဲ့ဒီ|အဲဒီ/g, 'ထို'],
  [/ရဲ့/g, '၏'],
  [/ရင်/g, 'လျှင်'],
  [/လို့/g, '၍'],
  [/အေးဂျင့်|အေဂျင့်|ကိုယ်စားလှယ်/g, 'ကိုယ်စားလှယ် agent'],
];

/**
 * Myanmar words → English terms used in the materials. Each English term is
 * added to the question, so Myanmar questions also match English text.
 */
const GLOSSARY: [RegExp, string][] = [
  [/အာမခံ/, 'insurance|insured'],
  [/အသက်အာမခံ/, 'life insurance'],
  [/ကျန်းမာရေးအာမခံ|ဆေးကုသ/, 'health insurance|medical'],
  [/ပရီမီယံ|ပရီမီယမ်|အာမခံကြေး|ပေးသွင်းကြေး|ပေးသွင်းငွေ/, 'premium'],
  [/လျော်ကြေး|ကလိမ်|ကလေမ်|တောင်းခံ/, 'claim|claims'],
  [/ပေါ်လစီ|အာမခံစာချုပ်/, 'policy'],
  [/စာချုပ်/, 'contract'],
  [/အာမခံထားငွေ|အာမခံငွေ/, 'sum assured|sum insured|sum-insured'],
  [/အကျိုးခံစားခွင့်ရှိသူ|အမွေဆက်ခံ|nominee/, 'beneficiary|nominee'],
  [/အကျိုးခံစားခွင့်|အကျိုးကျေးဇူး|အကျိုး/, 'benefit|benefits'],
  [/ကိုယ်စားလှယ်/, 'agent|agency'],
  [/ထိပ်တန်း|ဆုရ|အကောင်းဆုံးဝန်ထမ်း|top\s*performer/i, 'top performer|top performers|latest'],
  [/ဌာနမှူး|ဌာနခေါင်း|hod/i, 'head of department|hod'],
  [/အဖွဲ့ဝင်|team/i, 'team|members'],
  [/သတင်း/, 'news'],
  [/ဗီဒီယို/, 'video'],
  [/ကြေညာ|bulletin/i, 'bulletin'],
  [/ဆက်သွယ်|ဖုန်း|လိပ်စာ|အီးမေးလ်/, 'contact|phone|address|email'],
  [/မျှော်မှန်း|ရူပါရုံ/, 'vision'],
  [/ရည်မှန်းချက်|မစ်ရှင်/, 'mission'],
  [/တန်ဖိုးထား/, 'core values'],
  [/သင်တန်း/, 'course|training|lesson'],
  [/ဘယ်သူ/, 'who'],
  [/အဆိုပြုလွှာ|လျှောက်လွှာ/, 'proposal|proposal form|application'],
  [/ပြန်လည်အာမခံ/, 'reinsurance'],
  [/အမွေ/, 'estate'],
  [/ရေကြောင်း|ပင်လယ်/, 'marine'],
  [/မီး/, 'fire'],
  [/မော်တော်ယာဉ်/, 'motor'],
  [/လိုင်စင်/, 'license|licensing'],
  [/စာမေးပွဲ/, 'exam|examination'],
  [/အန္တရာယ်|ဆုံးရှုံးနိုင်ခြေ|ဘေး/, 'risk'],
  [/ဆုံးရှုံး/, 'loss'],
  [/အာမခံကုမ္ပဏီ|ကုမ္ပဏီ/, 'insurer|company'],
  [/အာမခံထားသူ/, 'insured|policyholder'],
  [/ပေါ်လစီပိုင်ရှင်/, 'policyholder'],
  [/သေဆုံး/, 'death'],
  [/မတော်တဆ/, 'accident'],
  [/မသန်စွမ်း/, 'disability'],
  [/ဆေးရုံ/, 'hospital|hospitalization'],
  [/ရောဂါ|နာမကျန်း/, 'illness|sickness'],
  [/ပင်စင်/, 'pension|retirement'],
  [/အငြိမ်းစား/, 'retirement'],
  [/နှစ်စဉ်ထောက်ပံ့|annuity/, 'annuity'],
  [/ရင်းနှီးမြှုပ်နှံ/, 'investment|invest'],
  [/အခွန်/, 'tax'],
  [/ငွေကြေးစီမံ|ဘဏ္ဍာရေးစီမံ/, 'financial planning'],
  [/ပိုင်ဆိုင်မှု/, 'assets'],
  [/ဝင်ငွေ/, 'income'],
  [/ဖောက်သည်|ဝယ်ယူသူ/, 'customer|client'],
  [/ရောင်း/, 'sales|selling'],
  [/ဝန်ဆောင်မှု/, 'service'],
  [/စည်းမျဉ်း|စည်းကမ်း|ဥပဒေ/, 'regulation|law|rules'],
  [/စိစစ်|underwriting/, 'underwriting'],
  [/သက်တမ်း/, 'term|period'],
  [/ပျက်ပြယ်/, 'lapse|lapsed'],
  [/ပြန်အမ်းငွေ|ပြန်ရငွေ|surrender/, 'surrender value'],
  [/ကျေးဇူးပြုကာလ|ချိန်းဆိုကာလ/, 'grace period'],
  [/စာရွက်စာတမ်း|စာရွက်/, 'documents'],
  [/အခြေခံမူ|မူများ|သဘောတရား/, 'principle|principles|concept'],
  [/ယုံကြည်စိတ်ချ|အပြည့်အဝယုံကြည်/, 'utmost good faith'],
  [/အာမခံထိုက်သောအကျိုးစီးပွား/, 'insurable interest'],
  [/နစ်နာကြေး|လျော်ပေး/, 'indemnity'],
  [/အဓိကအကြောင်းတရား|တိုက်ရိုက်အကြောင်း/, 'proximate cause'],
  [/ဈေးနှုန်း|စျေးနှုန်း|တန်ဖိုးသတ်မှတ်/, 'pricing|valuation'],
  [/ဘောနပ်စ်/, 'bonus'],
  [/ငွေပေးချေ/, 'payment'],
];

/** Rewrites a Myanmar question into the handbooks' written style, plus English terms. */
export function expandMyanmarQuery(question: string): string {
  let q = question.normalize('NFC').replace(/[​-‍﻿]/g, '');
  for (const [re, to] of SPOKEN) q = q.replace(re, to);
  const english = new Set<string>();
  for (const [re, terms] of GLOSSARY) if (re.test(q)) terms.split('|').forEach((t) => english.add(t));
  return english.size ? `${q} ${[...english].join(' ')}` : q;
}

/** English names for a Myanmar term: the glossary entries with the longest match. */
export function glossaryTerms(text: string): string[] {
  let best = 0;
  let out: string[] = [];
  for (const [re, terms] of GLOSSARY) {
    const m = text.match(re);
    if (!m) continue;
    if (m[0].length > best) {
      best = m[0].length;
      out = [terms];
    } else if (m[0].length === best) out.push(terms);
  }
  return out.flatMap((t) => t.split('|'));
}
