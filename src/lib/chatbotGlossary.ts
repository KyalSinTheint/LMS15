/**
 * Myanmar → English insurance glossary for the LMS Assistant.
 *
 * The licensing handbook's text is English (its Myanmar text layer is
 * broken in the PDF), so a Myanmar question is "translated" into English
 * insurance terms and searched against the English content.
 * Longer phrases are matched first. Spelling variants are listed together.
 */

const GLOSSARY: [string[], string][] = [
  // ---- Core concepts ---------------------------------------------------
  [['အသက်အာမခံ'], 'life insurance'],
  [['အထွေထွေအာမခံ'], 'general insurance non-life'],
  [['ကျန်းမာရေးအာမခံ'], 'health insurance medical'],
  [['မီးအာမခံ'], 'fire insurance'],
  [['မော်တော်ယာဉ်အာမခံ', 'ကားအာမခံ'], 'motor insurance vehicle'],
  [['ရေကြောင်းအာမခံ', 'ပင်လယ်ကုန်စည်'], 'marine insurance cargo'],
  [['ခရီးသွားအာမခံ'], 'travel insurance'],
  [['မတော်တဆထိခိုက်', 'မတော်တဆ'], 'accident personal accident'],
  [['အုပ်စုလိုက်', 'အုပ်စု'], 'group'],
  [['ပြန်လည်အာမခံ'], 'reinsurance'],
  [['အာမခံကုမ္ပဏီ', 'အာမခံသူ'], 'insurer insurance company'],
  [['အာမခံထားသူ', 'အာမခံရသူ', 'အာမခံထားရှိသူ'], 'insured policyholder'],
  [['အာမခံ'], 'insurance'],
  [['အန္တရာယ်', 'ဆုံးရှုံးနိုင်ခြေ', 'ဘေးအန္တရာယ်'], 'risk hazard peril'],
  [['ဆုံးရှုံးမှု', 'နစ်နာမှု'], 'loss'],
  [['ကာကွယ်မှု', 'အကာအကွယ်'], 'cover protection coverage'],

  // ---- Policy & premium -------------------------------------------------
  [['ပရီမီယံ', 'ပရီမီယမ်', 'အာမခံကြေး', 'အာမခံထားငွေပေးသွင်း'], 'premium'],
  [['ပေးသွင်း', 'ပေးဆောင်', 'ပေးချေ'], 'pay payment'],
  [['ကျေးဇူးပြုချိန်', 'ချိန်းဆိုရက်ကျော်', 'ပေးသွင်းရန်အချိန်ကျော်', 'သက်ညှာကာလ'], 'grace period'],
  [['ပေါ်လစီ', 'အာမခံလက်မှတ်', 'အာမခံစာချုပ်'], 'policy contract'],
  [['အဆိုပြုလွှာ', 'လျှောက်လွှာ'], 'proposal form application'],
  [['အာမခံထားငွေ', 'အာမခံငွေ', 'အာမခံပမာဏ'], 'sum assured sum insured'],
  [['သက်တမ်းပြည့်', 'သက်တမ်းစေ့'], 'maturity'],
  [['သက်တမ်း'], 'term period duration'],
  [['ပြန်အပ်', 'ရပ်စဲ', 'ဖျက်သိမ်း'], 'surrender cancellation termination'],
  [['ပျက်ပြယ်', 'ရပ်ဆိုင်း'], 'lapse lapsed'],
  [['ပြန်လည်အသက်သွင်း', 'ပြန်လည်ဆက်လက်'], 'revival reinstatement'],
  [['ဆုကြေး', 'ဘောနပ်စ်'], 'bonus'],
  [['ချေးငွေ'], 'loan'],
  [['ပြောင်းလွှဲ', 'လွှဲပြောင်း'], 'assignment transfer'],
  [['အပိုဆောင်း', 'နောက်ဆက်တွဲ'], 'rider additional benefit'],
  [['ခြွင်းချက်', 'မပါဝင်', 'မလွှမ်းခြုံ'], 'exclusion excluded not covered'],
  [['လွှမ်းခြုံ', 'ပါဝင်'], 'covered coverage'],
  [['ရိုးရိုးအာမခံ', 'သက်တမ်းအာမခံ'], 'term insurance'],
  [['တစ်သက်တာ'], 'whole life'],
  [['စုဆောင်း', 'ငွေစု'], 'savings endowment'],
  [['နှစ်စဉ်ထောက်ပံ့ကြေး', 'ပင်စင်'], 'annuity pension'],

  // ---- Claims & beneficiaries ---------------------------------------------
  [['လျော်ကြေးတောင်းခံ', 'လျော်ကြေး', 'ငွေတောင်းခံ', 'တောင်းဆိုမှု'], 'claim'],
  [['ပေးလျော်', 'ပေးချေမှု'], 'settlement payout payment'],
  [['အကျိုးခံစားခွင့်ရှိသူ', 'အကျိုးခံစားသူ', 'အမွေခံ'], 'beneficiary nominee'],
  [['အကျိုးခံစားခွင့်', 'အကျိုးကျေးဇူး'], 'benefit benefits'],
  [['သေဆုံး', 'ကွယ်လွန်'], 'death'],
  [['သေဆုံးမှုလက်မှတ်'], 'death certificate'],
  [['ဆေးလက်မှတ်', 'ဆေးမှတ်တမ်း'], 'medical certificate records'],
  [['စာရွက်စာတမ်း', 'အထောက်အထား'], 'documents proof'],
  [['မသန်စွမ်း'], 'disability'],
  [['ဆေးရုံ'], 'hospital hospitalization'],

  // ---- Principles (licensing exam) ----------------------------------------
  [['အပြည့်အဝယုံကြည်', 'ယုံကြည်မှုအပြည့်', 'ရိုးသားမှုအပြည့်'], 'utmost good faith uberrimae fidei'],
  [['အာမခံနိုင်သည့်အကျိုးစီးပွား', 'အကျိုးစီးပွားဆိုင်ရာ'], 'insurable interest'],
  [['လျော်ကြေးပြန်လည်ပေးခြင်း', 'နဂိုအခြေအနေ'], 'indemnity'],
  [['အခွင့်အရေးလွှဲပြောင်း'], 'subrogation'],
  [['ဝေမျှပေးဆောင်'], 'contribution'],
  [['အနီးစပ်ဆုံးအကြောင်းရင်း', 'တိုက်ရိုက်အကြောင်းရင်း'], 'proximate cause'],
  [['အခြေခံမူ', 'မူများ'], 'principle principles'],
  [['ဖော်ပြ', 'ထုတ်ဖော်'], 'disclosure'],
  [['လိမ်လည်', 'မမှန်ကန်'], 'fraud misrepresentation'],

  // ---- Underwriting & people -----------------------------------------------
  [['စိစစ်', 'အကဲဖြတ်'], 'underwriting assessment'],
  [['သေဆုံးနှုန်း'], 'mortality rate'],
  [['ကိန်းဂဏန်းပညာရှင်', 'အက်ချူရီ'], 'actuary actuarial'],
  [['အေးဂျင့်', 'ကိုယ်စားလှယ်'], 'agent'],
  [['ကော်မရှင်'], 'commission'],
  [['လိုင်စင်'], 'license licensing'],
  [['စာမေးပွဲ'], 'examination exam'],
  [['ကြီးကြပ်', 'စည်းကြပ်', 'ထိန်းကျောင်း'], 'regulator regulation supervision'],
  [['ဥပဒေ', 'နည်းဥပဒေ'], 'law act regulation'],
  [['ကျင့်ဝတ်'], 'ethics code of conduct'],
  [['တိုင်ကြားချက်', 'တိုင်ကြား'], 'complaint grievance'],
  [['ဖောက်သည်', 'customer', 'ဝယ်ယူသူ', 'ဝယ်သူ'], 'customer client prospect'],
  [['လိုအပ်ချက်'], 'needs requirement'],
  [['ရောင်းချ', 'အရောင်း'], 'sales selling'],
  [['ဈေးကွက်'], 'market marketing'],
  [['ထိုးဖောက်နှုန်း', 'ထိုးဖောက်မှု'], 'penetration'],
  [['သိပ်သည်းဆ'], 'density'],
  [['စီးပွားရေး'], 'economy economic'],
  [['လူဦးရေ'], 'population'],
  [['ငွေကြေးခဝါချ'], 'money laundering aml'],
  [['ကုမ္ပဏီ'], 'company'],
  [['ဘဏ်'], 'bank bancassurance'],

  // ---- Common question words → concept ------------------------------------
  [['အသက်အရွယ်', 'အသက်ကန့်သတ်', 'အသက်'], 'age entry age'],
  [['ဝင်ရောက်', 'ဝယ်ယူနိုင်', 'လျှောက်ထား'], 'entry eligibility apply'],
  [['အခွန်'], 'tax'],
  [['အတိုး'], 'interest'],
  [['ငွေ'], 'money amount'],
  [['ရက်', 'ရက်အတွင်း'], 'days'],
  [['လစဉ်'], 'monthly'],
  [['နှစ်'], 'year'],
  [['အဓိပ္ပာယ်ဖွင့်', 'အဓိပ္ပာယ်'], 'meaning definition'],
  [['အမျိုးအစား'], 'types kinds'],
  [['အရေးပါ', 'အရေးကြီး'], 'importance'],
  [['လုပ်ငန်းစဉ်', 'လုပ်ထုံးလုပ်နည်း'], 'procedure process'],
];

// Longest phrases first, so "အသက်အာမခံ" wins over "အာမခံ"
const ENTRIES = GLOSSARY.flatMap(([terms, en]) => terms.map((t) => [t.replace(/\s+/g, ''), en] as const)).sort(
  (a, b) => b[0].length - a[0].length
);

/** English terms for the insurance words found in a Myanmar question ('' if none). */
export function translateMyanmarQuery(question: string): string {
  let text = question.replace(/\s+/g, '').normalize('NFC');
  const found: string[] = [];
  for (const [mm, en] of ENTRIES) {
    if (text.includes(mm)) {
      found.push(en);
      text = text.split(mm).join(' '); // consume, so shorter overlapping terms don't double count
    }
  }
  return Array.from(new Set(found)).join(' ');
}
