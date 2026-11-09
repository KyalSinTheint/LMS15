/**
 * The main subject of a bulletin, read from its title (then tags, then
 * description): "Smile Campaign" → a smiling face, "Blood Donation Day" →
 * a blood drop, "New Mobile App" → a phone … Each subject has an icon and a
 * colour palette for the card picture. Specific subjects win over generic
 * words such as "campaign" or "notice".
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity, Ambulance, Droplets, TreeDeciduous, Apple, Award, Baby, Banknote, Bell, Bike, BookOpen, Bot, Brain, Briefcase, Building2, Bus, Cake,
  Calculator, Calendar, Camera, Car, Clock, CloudRain, Coffee, Compass, CreditCard, Droplet, Dumbbell, FileText, Flag, Flame,
  Flower2, Footprints, Gamepad2, Gem, Gift, Globe, GraduationCap, HandCoins, HandHeart, Handshake, HardHat, Headphones,
  Heart, HeartHandshake, HeartPulse, Home, Hospital, Laptop, Laugh, Leaf, Lightbulb, Lock, Mail, MapPin, Medal, Megaphone,
  MessageCircle, Mic, Moon, Mountain, Music, Newspaper, Palette, PartyPopper, Percent, PiggyBank, Pill, Plane, Puzzle, Receipt,
  Rocket, Salad, Scale, ShieldAlert, ShieldCheck, Ship, ShoppingBag, Smartphone, Smile, Snowflake, Sparkles, Sprout,
  Star, Stethoscope, Store, Sun, Sunrise, Syringe, Target, ThumbsUp, Ticket, TreePine, TrendingUp, Trophy, Truck, Umbrella,
  UserPlus, Users, Video, Volleyball, Wallet, Waves, Wifi, Wrench, Zap,
} from 'lucide-react';

export interface Palette {
  from: string;
  to: string;
  accent: string;
}

export const SUBJECT_PALETTES: Record<string, Palette> = {
  sunny: { from: '#f59e0b', to: '#c2410c', accent: '#fde68a' },
  love: { from: '#e11d48', to: '#881337', accent: '#fecdd3' },
  fresh: { from: '#10b981', to: '#065f46', accent: '#a7f3d0' },
  ocean: { from: '#0ea5e9', to: '#1e3a8a', accent: '#bae6fd' },
  tech: { from: '#6366f1', to: '#312e81', accent: '#c7d2fe' },
  night: { from: '#475569', to: '#0f172a', accent: '#cbd5e1' },
  royal: { from: '#1e88c7', to: '#0d3b66', accent: '#bae6fd' },
  gold: { from: '#e3a008', to: '#92400e', accent: '#fde68a' },
  party: { from: '#c026d3', to: '#581c87', accent: '#f5d0fe' },
  care: { from: '#14b8a6', to: '#115e59', accent: '#99f6e4' },
  fire: { from: '#f97316', to: '#9a3412', accent: '#fed7aa' },
  sky: { from: '#38bdf8', to: '#0369a1', accent: '#e0f2fe' },
};

export interface Subject {
  key: string;
  label: string;
  Icon: LucideIcon;
  /** a small second icon in the corner of the picture */
  Accent?: LucideIcon;
  palette: keyof typeof SUBJECT_PALETTES;
  re: RegExp;
}

// Order matters: the first subject found in the title wins.
export const SUBJECTS: Subject[] = [
  // feelings & people
  { key: 'smile', label: 'Smile', Icon: Smile, Accent: Sparkles, palette: 'sunny', re: /\bsmil\w*|\bhappy|\bhappiness|\bjoy\w*|ပြုံး|ပျော်/i },
  { key: 'laugh', label: 'Fun', Icon: Laugh, Accent: Sparkles, palette: 'sunny', re: /\bfun\b|\blaugh\w*|\bcomedy|\bjoke/i },
  { key: 'thanks', label: 'Thank you', Icon: ThumbsUp, Accent: Heart, palette: 'sunny', re: /thank|appreciat|kudos|well done|great job|ကျေးဇူး/i },
  { key: 'love', label: 'Love & care', Icon: Heart, Accent: Sparkles, palette: 'love', re: /\blove\b|valentine|\bkindness|\bcaring\b|မေတ္တာ|ချစ်/i },
  { key: 'blood', label: 'Blood donation', Icon: Droplet, Accent: Heart, palette: 'love', re: /\bblood\b|သွေး/i },
  { key: 'nature', label: 'Environment / green', Icon: TreeDeciduous, Accent: Leaf, palette: 'fresh', re: /environment|\bgreen\b|tree planting|\bplant\w*|recycl|earth day|climate|သစ်ပင်|သဘာဝ/i },
  { key: 'charity', label: 'Charity / CSR', Icon: HandHeart, Accent: Heart, palette: 'love', re: /charit|donat|\bcsr\b|volunteer|fundrais|give back|community|လှူ|ပရဟိတ/i },
  { key: 'welcome', label: 'Welcome / new joiner', Icon: UserPlus, Accent: Sparkles, palette: 'ocean', re: /welcome|new joiner|onboard|recruit|hiring|vacanc|career|job opening|ကြိုဆို/i },
  { key: 'partner', label: 'Partnership', Icon: Handshake, Accent: Star, palette: 'royal', re: /partner|\bmou\b|agreement|collaborat|alliance|signing|ပူးပေါင်း/i },
  { key: 'family', label: 'Family', Icon: HeartHandshake, Accent: Heart, palette: 'love', re: /\bfamil\w*|parents|mother|father|မိသားစု/i },
  { key: 'baby', label: 'Child / baby', Icon: Baby, Accent: Heart, palette: 'sky', re: /\bbab(y|ies)\b|\bchild\w*|\bkids?\b|maternity|ကလေး/i },
  // celebrations & events
  { key: 'birthday', label: 'Birthday / anniversary', Icon: Cake, Accent: PartyPopper, palette: 'party', re: /birthday|anniversar|\bjubilee|မွေးနေ့|နှစ်ပတ်လည်/i },
  { key: 'christmas', label: 'Christmas', Icon: TreePine, Accent: Snowflake, palette: 'fresh', re: /christmas|x-?mas|ခရစ္စမတ်/i },
  { key: 'thingyan', label: 'Thingyan water festival', Icon: Droplets, Accent: Sun, palette: 'ocean', re: /thingyan|water festival|သင်္ကြန်/i },
  { key: 'newyear', label: 'New Year', Icon: Sparkles, Accent: PartyPopper, palette: 'party', re: /new year|နှစ်သစ်/i },
  { key: 'festival', label: 'Festival / party', Icon: PartyPopper, Accent: Sparkles, palette: 'party', re: /festival|celebrat|\bparty\b|\bgala\b|\bdinner\b|ပွဲတော်|ပွဲ\b/i },
  { key: 'gift', label: 'Gift / reward', Icon: Gift, Accent: Sparkles, palette: 'party', re: /\bgift|\bprize|\blucky draw|\bgiveaway|\bvoucher|\bfree\b|လက်ဆောင်|ကံစမ်း/i },
  { key: 'ticket', label: 'Event / ticket', Icon: Ticket, Accent: Star, palette: 'party', re: /\bticket|\bconcert|\bshow\b|\bevent\b/i },
  { key: 'sports', label: 'Sports', Icon: Volleyball, Accent: Trophy, palette: 'fresh', re: /sport|football|soccer|volleyball|tournament|\bmatch\b|marathon|\brun\b|\brace\b|အားကစား|ဘောလုံး/i },
  { key: 'fitness', label: 'Fitness / wellness', Icon: Dumbbell, Accent: HeartPulse, palette: 'fresh', re: /fitness|\bgym\b|exercise|wellness|yoga|\bwalk|steps challenge|ကိုယ်လက်လှုပ်ရှား/i },
  { key: 'music', label: 'Music', Icon: Music, Accent: Mic, palette: 'party', re: /music|\bsong|karaoke|\bband\b|singing|သီချင်း/i },
  { key: 'photo', label: 'Photo contest', Icon: Camera, Accent: Star, palette: 'night', re: /photo|camera|\bselfie|ဓာတ်ပုံ/i },
  { key: 'video', label: 'Video', Icon: Video, Accent: Star, palette: 'night', re: /\bvideo|\bfilm\b|\bmovie|tiktok|youtube|ဗီဒီယို/i },
  { key: 'art', label: 'Art / design', Icon: Palette, Accent: Sparkles, palette: 'party', re: /\bart\b|\bdrawing|\bdesign contest|creativ|ပန်းချီ/i },
  { key: 'game', label: 'Game / quiz', Icon: Gamepad2, Accent: Star, palette: 'tech', re: /\bgame|\bquiz\b|puzzle|trivia|ဂိမ်း/i },
  { key: 'coffee', label: 'Coffee / break', Icon: Coffee, Accent: Heart, palette: 'gold', re: /coffee|\btea\b|breakfast|lunch|snack|canteen|ကော်ဖီ/i },
  { key: 'food', label: 'Food / healthy eating', Icon: Salad, Accent: Apple, palette: 'fresh', re: /\bfood|\bmeal|nutrition|healthy eating|\bdiet\b|အစားအစာ/i },
  { key: 'travel', label: 'Trip / travel', Icon: Plane, Accent: MapPin, palette: 'sky', re: /\btrip\b|\btravel|\btour\b|vacation|holiday trip|outing|excursion|ခရီး/i },
  { key: 'flower', label: 'Flowers / women', Icon: Flower2, Accent: Heart, palette: 'love', re: /flower|women'?s day|\bwomen\b|mother'?s day|ပန်း|အမျိုးသမီး/i },
  { key: 'summer', label: 'Summer / sun', Icon: Sun, Accent: Sparkles, palette: 'sunny', re: /summer|\bsunny|\bbeach|နွေ/i },
  { key: 'rain', label: 'Rainy season', Icon: CloudRain, Accent: Umbrella, palette: 'sky', re: /\brain\w*|monsoon|flood|မိုး|ရေကြီး/i },
  { key: 'night', label: 'Night / Ramadan', Icon: Moon, Accent: Star, palette: 'night', re: /\bnight\b|ramadan|\beid\b|ညဘက်/i },
  { key: 'sunrise', label: 'Fresh start', Icon: Sunrise, Accent: Sparkles, palette: 'sunny', re: /fresh start|new beginning|morning|kick[- ]?off|launch day/i },
  // business
  { key: 'app', label: 'App / mobile', Icon: Smartphone, Accent: Sparkles, palette: 'tech', re: /\bapp\b|mobile|smartphone|\bphone\b|\bsms\b|viber|ဖုန်း/i },
  { key: 'launch', label: 'Launch', Icon: Rocket, Accent: Sparkles, palette: 'tech', re: /\blaunch|\bnew product|introduc|\bunveil|\brelease\b|go[- ]live|မိတ်ဆက်/i },
  { key: 'idea', label: 'Ideas / innovation', Icon: Lightbulb, Accent: Sparkles, palette: 'sunny', re: /\bidea|innovat|suggestion|hackathon|brainstorm|အကြံ/i },
  { key: 'target', label: 'Target / goal', Icon: Target, Accent: TrendingUp, palette: 'fire', re: /\btarget|\bgoal\b|\bkpi\b|quota|\bsales\b|campaign|contest|competition|challenge|ပစ်မှတ်|ပြိုင်ပွဲ|ကမ်ပိန်း/i },
  { key: 'growth', label: 'Growth / results', Icon: TrendingUp, Accent: Star, palette: 'fresh', re: /growth|result|performance|revenue|record|achievement|milestone|တိုးတက်/i },
  { key: 'trophy', label: 'Award / winner', Icon: Trophy, Accent: Star, palette: 'gold', re: /award|winner|champion|top performer|best agent|\bmdrt\b|recogni|congrat|ဆု/i },
  { key: 'medal', label: 'Achievement', Icon: Medal, Accent: Star, palette: 'gold', re: /medal|honou?r|excellen/i },
  { key: 'bonus', label: 'Bonus / incentive', Icon: HandCoins, Accent: Sparkles, palette: 'gold', re: /bonus|incentive|commission|reward|ဆုကြေး|ကော်မရှင်/i },
  { key: 'discount', label: 'Discount / offer', Icon: Percent, Accent: Sparkles, palette: 'fire', re: /discount|\boffer\b|\bpromo|\bsale\b|% off|လျှော့/i },
  { key: 'shopping', label: 'Shopping', Icon: ShoppingBag, Accent: Gift, palette: 'party', re: /shopping|\bshop\b|merch|store/i },
  { key: 'money', label: 'Money / payment', Icon: Banknote, Accent: Sparkles, palette: 'fresh', re: /\bmoney|\bcash\b|\bpay(ment|roll|day)?\b|salary|\bfee\b|ငွေ|လစာ/i },
  { key: 'card', label: 'Card / digital payment', Icon: CreditCard, Accent: Smartphone, palette: 'tech', re: /\bcard\b|kbz ?pay|wave ?pay|e-?payment|mobile banking|qr pay/i },
  { key: 'savings', label: 'Savings', Icon: PiggyBank, Accent: Sparkles, palette: 'fresh', re: /saving|endowment|\binvest\w*|\bwealth/i },
  { key: 'tax', label: 'Tax / accounting', Icon: Calculator, Accent: Receipt, palette: 'royal', re: /\btax\b|accounting|\baudit\b|financial statement|\bbudget|အခွန်/i },
  { key: 'claim', label: 'Claims', Icon: Receipt, Accent: ShieldCheck, palette: 'royal', re: /\bclaim|reimburs|လျော်ကြေး/i },
  { key: 'premium', label: 'Premium / payment', Icon: Wallet, Accent: Calendar, palette: 'royal', re: /premium|ပရီမီယံ/i },
  // insurance & health
  { key: 'health', label: 'Health', Icon: HeartPulse, Accent: Stethoscope, palette: 'care', re: /health|medical|doctor|clinic|check-?up|ကျန်းမာ|ဆေး/i },
  { key: 'hospital', label: 'Hospital', Icon: Hospital, Accent: Ambulance, palette: 'care', re: /hospital|\bpanel\b|ဆေးရုံ/i },
  { key: 'vaccine', label: 'Vaccine', Icon: Syringe, Accent: ShieldCheck, palette: 'care', re: /vaccin|injection|covid|flu shot|ကာကွယ်ဆေး/i },
  { key: 'medicine', label: 'Medicine', Icon: Pill, Accent: Heart, palette: 'care', re: /medicine|\bpills?\b|pharmac/i },
  { key: 'mind', label: 'Mental health', Icon: Brain, Accent: Heart, palette: 'tech', re: /mental|stress|mindful|counsel|စိတ်ကျန်းမာ/i },
  { key: 'accident', label: 'Accident / safety', Icon: ShieldAlert, Accent: HardHat, palette: 'fire', re: /accident|safety|\bfire drill|emergency|ဘေးကင်း|မတော်တဆ/i },
  { key: 'fire', label: 'Fire', Icon: Flame, Accent: ShieldAlert, palette: 'fire', re: /\bfire\b|မီး/i },
  { key: 'umbrella', label: 'Protection / life cover', Icon: Umbrella, Accent: Heart, palette: 'royal', re: /protect|coverage|life insurance|life cover|policyholder|အာမခံ/i },
  { key: 'car', label: 'Motor / car', Icon: Car, Accent: ShieldCheck, palette: 'sky', re: /\bcars?\b|\bmotor\w*|vehicle|\bdriv\w*|ကား/i },
  { key: 'bike', label: 'Bicycle / motorbike', Icon: Bike, Accent: Footprints, palette: 'fresh', re: /\bbike|\bbicycle|cycling|motorbike|ဆိုင်ကယ်/i },
  { key: 'bus', label: 'Transport', Icon: Bus, Accent: MapPin, palette: 'sky', re: /\bbus\b|transport|ferry|shuttle/i },
  { key: 'truck', label: 'Delivery', Icon: Truck, Accent: MapPin, palette: 'sky', re: /deliver|courier|logistic|shipment/i },
  { key: 'ship', label: 'Marine', Icon: Ship, Accent: Waves, palette: 'sky', re: /marine|\bship|\bcargo|သင်္ဘော/i },
  { key: 'home', label: 'Home / property', Icon: Home, Accent: ShieldCheck, palette: 'gold', re: /\bhome\b|\bhouse|property|အိမ်/i },
  // learning
  { key: 'graduation', label: 'Graduation / exam', Icon: GraduationCap, Accent: Star, palette: 'tech', re: /graduat|\bexam|\bcertif|license|\bia-?0\d|scholarship|စာမေးပွဲ|လိုင်စင်|ဘွဲ့/i },
  { key: 'training', label: 'Training / learning', Icon: BookOpen, Accent: Lightbulb, palette: 'tech', re: /training|\bcourse|learning|workshop|seminar|webinar|\bclass\b|သင်တန်း|လေ့လာ/i },
  { key: 'reading', label: 'Reading / newsletter', Icon: Newspaper, Accent: Star, palette: 'royal', re: /newsletter|magazine|\bnews\b|\bread(ing)?\b|သတင်း/i },
  // office & tech
  { key: 'computer', label: 'Computer / system', Icon: Laptop, Accent: Wifi, palette: 'tech', re: /laptop|computer|\bsystem\b|software|portal|website|\blms\b|\bit\b|digital|online|upgrade|maintenance|ကွန်ပျူတာ/i },
  { key: 'ai', label: 'AI / automation', Icon: Bot, Accent: Sparkles, palette: 'tech', re: /\bai\b|chatbot|automation|robot/i },
  { key: 'security', label: 'Password / security', Icon: Lock, Accent: ShieldCheck, palette: 'night', re: /password|security|cyber|phishing|\bscam|fraud|login|လုံခြုံ/i },
  { key: 'wifi', label: 'Internet', Icon: Wifi, Accent: Zap, palette: 'tech', re: /internet|wi-?fi|network|connection/i },
  { key: 'mail', label: 'Email / letter', Icon: Mail, Accent: Bell, palette: 'ocean', re: /\be-?mail|\bletter|\binbox/i },
  { key: 'chat', label: 'Feedback / survey', Icon: MessageCircle, Accent: Star, palette: 'ocean', re: /feedback|survey|opinion|\bpoll\b|\bvoice\b|စစ်တမ်း/i },
  { key: 'support', label: 'Customer service', Icon: Headphones, Accent: Heart, palette: 'ocean', re: /customer service|call center|hotline|helpdesk|help desk|support|ဝန်ဆောင်မှု/i },
  { key: 'office', label: 'Office / branch', Icon: Building2, Accent: MapPin, palette: 'night', re: /\boffice|\bbranch|\bhq\b|headquarter|relocat|new address|ရုံး|ဌာနခွဲ/i },
  { key: 'location', label: 'Location / map', Icon: MapPin, Accent: Compass, palette: 'sky', re: /location|\bmap\b|direction|venue|address|နေရာ/i },
  { key: 'store', label: 'Service centre', Icon: Store, Accent: MapPin, palette: 'ocean', re: /service cent|counter|kiosk|booth/i },
  { key: 'repair', label: 'Maintenance', Icon: Wrench, Accent: Zap, palette: 'night', re: /repair|fix\b|outage|downtime|power cut|electricity/i },
  { key: 'energy', label: 'Energy', Icon: Zap, Accent: Sparkles, palette: 'sunny', re: /energy|power|electric|motivat/i },
  // rules & time
  { key: 'policy', label: 'Policy / rules', Icon: FileText, Accent: ShieldCheck, palette: 'royal', re: /policy|memo|guideline|\bsop\b|procedure|circular|directive|\brules?\b|regulation|compliance|\baml\b|\bkyc\b|မူဝါဒ|စည်းကမ်း|ညွှန်ကြား/i },
  { key: 'law', label: 'Legal', Icon: Scale, Accent: FileText, palette: 'royal', re: /legal|\blaw\b|court|contract|ethic|ဥပဒေ/i },
  { key: 'calendar', label: 'Schedule / dates', Icon: Calendar, Accent: Clock, palette: 'ocean', re: /schedule|calendar|\bdates?\b|timetable|deadline|closing date|ရက်/i },
  { key: 'time', label: 'Office hours', Icon: Clock, Accent: Calendar, palette: 'ocean', re: /office hours|working hours|\btime\b|\bhours\b|shift|အချိန်/i },
  { key: 'holiday', label: 'Holiday', Icon: Sun, Accent: Calendar, palette: 'sunny', re: /holiday|day off|leave\b|closed|ရုံးပိတ်|အားလပ်/i },
  { key: 'mountain', label: 'Challenge / journey', Icon: Mountain, Accent: Flag, palette: 'night', re: /journey|climb|summit|adventure/i },
  { key: 'flag', label: 'National / milestone', Icon: Flag, Accent: Star, palette: 'fire', re: /\bflag\b|national|independence|union day|အမျိုးသား/i },
  { key: 'globe', label: 'Global / international', Icon: Globe, Accent: Plane, palette: 'ocean', re: /global|international|world|overseas|universal|ကမ္ဘာ/i },
  { key: 'gem', label: 'Premium / VIP', Icon: Gem, Accent: Sparkles, palette: 'royal', re: /\bvip\b|platinum|diamond|premium member|exclusive/i },
  { key: 'star', label: 'Star / spotlight', Icon: Star, Accent: Sparkles, palette: 'gold', re: /\bstar\b|spotlight|highlight|featured/i },
  { key: 'puzzle', label: 'Problem solving', Icon: Puzzle, Accent: Lightbulb, palette: 'tech', re: /solution|problem|puzzle/i },
  { key: 'megaphone', label: 'Announcement', Icon: Megaphone, Accent: Sparkles, palette: 'ocean', re: /announce|attention|important|ကြေညာ/i },
  { key: 'bell', label: 'Notice / reminder', Icon: Bell, Accent: Clock, palette: 'care', re: /notice|reminder|alert|update|အသိပေး/i },
  { key: 'activity', label: 'Activity', Icon: Activity, Accent: Star, palette: 'fresh', re: /activit|program(me)?\b/i },
  { key: 'team', label: 'Team', Icon: Users, Accent: Star, palette: 'tech', re: /\bteam\w*|\bstaff\b|\bemployee\w*|\bcolleague|town ?hall|all[- ]hands|\bmeeting|\bgathering|အဖွဲ့|ဝန်ထမ်း/i },
  { key: 'job', label: 'Work', Icon: Briefcase, Accent: Star, palette: 'night', re: /\bwork\b|business|corporate|agency|banca|အလုပ်/i },
  { key: 'award', label: 'Award', Icon: Award, Accent: Star, palette: 'gold', re: /badge|certificate of|achievement badge/i },
  { key: 'sprout', label: 'Growth / new', Icon: Sprout, Accent: Sparkles, palette: 'fresh', re: /\bgrow\b|nurtur|develop(ment)?\b|ဖွံ့ဖြိုး/i },
];

const BY_KEY = new Map(SUBJECTS.map((s) => [s.key, s]));
export const getSubject = (key?: string | null) => (key ? BY_KEY.get(key) : undefined);

/** The subject named in the text: title first, then tags, then description. Earlier entries in SUBJECTS win. */
export function findSubject(title: string, tags: string[] = [], description = ''): Subject | null {
  for (const text of [title, tags.join(' '), description]) {
    if (!text) continue;
    const found = SUBJECTS.find((s) => s.re.test(text));
    if (found) return found;
  }
  return null;
}
