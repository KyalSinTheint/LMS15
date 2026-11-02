/**
 * LMS Assistant: a draggable floating mascot on every user-panel page.
 * Click it to chat. Answers come from the knowledge base admins build
 * (PDFs + FAQs) and from the Product Knowledge Hub, in Myanmar or English.
 * Questions it cannot answer can be sent to the L&D team.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, RotateCcw, Send, UserRound, X } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { MentorMascot } from './MentorMascot';
import { say, ScriptKey } from './pandaScript';
import { askTeam, loadMyQuestions, loadPublishedEntries, markAnswersSeen } from '../../lib/chatbotApi';
import { buildKnowledge } from '../../lib/chatbotKnowledge';
import { isMyanmar, KnowledgeIndex, KnowledgeItem, minAnswerScore, SearchHit } from '../../lib/chatbotSearch';
import { composeAnswer } from '../../lib/chatbotAnswer';

type Lang = 'en' | 'my';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  title?: string;
  source?: string;
  productId?: string;
  related?: KnowledgeItem[];
  /** Playful line shown before the answer */
  intro?: string;
  /** Offer to send this question to the L&D team */
  askable?: string;
  /** The answer in the other language (English original / Myanmar) */
  alt?: string;
  altLang?: 'en' | 'my';
  /** Short extra points from other matching sections */
  points?: { title: string; text: string }[];
  lang?: 'en' | 'my';
  tone?: 'info' | 'team';
}

const BUTTON = 60;
const MARGIN = 12;
const POS_KEY = 'kbz_assistant_pos';
const CHAT_KEY = 'kbz_assistant_chat';

/**
 * Trainer Panda's voice: a playful, cheeky trainer — teasing but never rude.
 * Facts always come word-for-word from the approved knowledge; only the
 * lines around them are playful. Questions can be in English or Myanmar;
 * the reply follows the question's language.
 */
/** Fixed labels (the playful lines live in pandaScript.ts) */
const T = {
  send: 'Ask the L&D team for me',
  trapHelp: 'Here’s what our materials say, so you can explain it properly:',
  trapNoInfo: 'For a definite answer on a real case, please check the policy document or ask the L&D team.',
  verifyMy: 'အချက်အလက်တွေကို အမြဲ ပြန်စစ်ဆေးပါ — Panda ကိုလည်း အကုန်မယုံပါနဲ့ 🐼',
  verify: 'Always double-check the facts — don’t trust the Panda blindly! 🐼',
  related: 'Curious? Try these too:',
  source: 'Source',
  openProduct: 'Open in Product Knowledge Hub',
  placeholder: 'Ask in English or မြန်မာ…',
  disclaimer: 'English · မြန်မာ · For learning reference',
  showEnglish: 'English မူရင်း ကြည့်ရန်',
  showMyanmar: 'မြန်မာလို ကြည့်ရန်',
  hideAlt: 'ပိတ်ရန် / Hide',
  alsoEn: 'Also worth knowing:',
  alsoMy: 'ထပ်သိထားသင့်တာ —',
  sourceMy: 'ရင်းမြစ်',
  sendMy: 'L&D team ကို မေးပေးပါ',
  relatedMy: 'ဒါတွေလည်း မေးကြည့်ပါ —',
  trapHelpMy: 'ရှင်းပြနိုင်အောင် စာအုပ်ထဲက အချက်အလက်ကို ပြပေးမယ် —',
  trapNoInfoMy: 'Case တစ်ခုချင်းအတွက် အတိအကျသိချင်ရင် policy စာရွက်စာတမ်း စစ်ကြည့်ပါ၊ ဒါမှမဟုတ် L&D team ကို မေးပါ။',
  autoFixed: 'မြန်မာစာကို စက်ဖြင့် ပြင်ထားသဖြင့် အမှားအနည်းငယ် ပါနိုင်ပါသည်။ English မူရင်းနှင့် တိုက်စစ်ပါ။',
};


/** Small talk that should get a friendly reply instead of a knowledge search. */
/**
 * "Gotcha" questions that ask for a promise or a certain yes/no about an
 * outcome (guarantees, definite approval, 100%, always/never). The panda
 * never promises: it deflects playfully and points to the facts instead.
 */
const TRAP_PATTERNS = [
  // "guaranteed" alone is a normal product word ("guaranteed sum assured"), so only promise-seeking phrasing counts
  /\b((can|could|do|will) you (guarantee|promise)|is it guaranteed (that|to)|guarantee (me|that)|promise (me|that))\b/i,
  /\b(for sure|definitely|certainly|absolutely|surely|no matter what|100 percent)\b/i,
  /\b(will|would|can)\s+(my|the|our|his|her|their)\s+(claim|policy|application|payout|refund)\s+(definitely|surely|always|ever|be approved|get approved|be rejected|never)\b/i,
  /\b(will|would)\s+(i|we|they|he|she|the customer)\s+(definitely|surely|always|never)\b/i,
  /\b(yes or no|just say yes|answer yes|only yes)\b/i,
  /\b(always|never)\s+(approved|rejected|paid|covered)\b/i,
  /(သေချာပေါက်|အသေအချာ|ကတိပေး|ကတိ\s*ရ|အာမခံ(ပေး)?နိုင်(လား|မလား)|၁၀၀\s*%|100\s*%|ဟုတ်\s*(သလား)?\s*\/?\s*မဟုတ်|ဘယ်တော့မှ|လုံးဝ\s*(ရ|မရ))/,
];
const isTrapQuestion = (q: string) => TRAP_PATTERNS.some((re) => re.test(q));

type SmallTalk = 'hello' | 'thanks' | 'who' | 'howAreYou' | 'joke' | 'bye' | 'cheeky' | 'laugh' | 'love' | 'help';
const SMALL_TALK: [RegExp, SmallTalk][] = [
  [/^(hi+|hello+|hey+|hiya|yo|sup|good (morning|afternoon|evening|day)|mingalaba)( (there|professor|panda|prof))?$/, 'hello'],
  [/^(thanks?( a lot)?|thank you( so much| very much)?|thx|ty|tq|cheers|appreciate it|great thanks)$/, 'thanks'],
  [/^(who are you|what are you|what is your name|whats your name|your name|are you a (bot|robot|human|ai))$/, 'who'],
  [/^(how are you( doing| today)?|how r u|hows it going|how is it going|whats up|what's up)$/, 'howAreYou'],
  [/\b(tell me a joke|joke|make me laugh|something funny)\b/, 'joke'],
  [/^(bye+|goodbye|see you|see ya|good night|gtg|later|cya)$/, 'bye'],
  [/\b(stupid|dumb|useless|idiot|you suck|bad bot|hate you|shut up|boring)\b/, 'cheeky'],
  [/^(lol+|lmao|haha+|hehe+|😂+|🤣+)$/, 'laugh'],
  [/^(i love you|love you|ily|you are (cute|awesome|great|the best)|good bot)$/, 'love'],
  [/^(help|what can you do|how do you work|how to use)$/, 'help'],
];
const SMALL_TALK_MY: [RegExp, SmallTalk][] = [
  [/^(မင်္ဂလာ(ပါ)?(ခင်ဗျာ|ခင်ဗျ|ရှင့်|ရှင်)?|ဟယ်လို|ဟိုင်း)(\s*(panda|ပန်ဒါ|ဆရာ))?$/i, 'hello'],
  [/^(ကျေးဇူး(ပဲ|ပါ|တင်ပါတယ်|တင်တယ်|အများကြီးတင်ပါတယ်|ပဲနော်)?(ခင်ဗျာ|ရှင့်|နော်)?)$/, 'thanks'],
  [/((မင်း|နင်|ခင်ဗျား|ရှင်)\s*(က)?\s*(ဘယ်သူ|ဘာ)(လဲ)?|နာမည်\s*(ဘာ|ဘယ်လို))/, 'who'],
  [/^(နေကောင်းလား|အဆင်ပြေလား|ဘယ်လိုနေလဲ)/, 'howAreYou'],
  [/(ဟာသ|ရယ်စရာ|ပြက်လုံး)/, 'joke'],
  [/^(တာ့တာ|ဘိုင်|သွားပြီ(နော်)?|နောက်မှ\s*တွေ့မယ်)$/, 'bye'],
  [/^(ဘာ(တွေ)?\s*လုပ်ပေးနိုင်|အကူအညီ|ဘယ်လိုသုံးရ)/, 'help'],
  [/(အသုံးမကျ|အရူး|ညံ့လိုက်|ပေါတာ)/, 'cheeky'],
];
const MY_TALK: Partial<Record<SmallTalk, ScriptKey>> = {
  hello: 'myHello',
  thanks: 'myThanks',
  who: 'myWho',
  howAreYou: 'myHowAreYou',
  joke: 'myJoke',
  bye: 'myBye',
  help: 'myHelp',
  cheeky: 'myCheeky',
};

/** Small talk that should get a playful reply instead of a knowledge search. */
const smallTalk = (q: string): SmallTalk | null => {
  if (isMyanmar(q)) {
    const t = q.trim().replace(/[!?.,။၊]+/g, '').replace(/\s+/g, ' ');
    if (t.length > 40) return null;
    return SMALL_TALK_MY.find(([re]) => re.test(t))?.[1] ?? null;
  }
  const t = q.trim().toLowerCase().replace(/[!?.,]+/g, '').replace(/\s+/g, ' ');
  // Longer messages are real questions, even if they contain "joke" or "boring"
  if (t.split(' ').length > 7) return null;
  return SMALL_TALK.find(([re]) => re.test(t))?.[1] ?? null;
};

const uid = () => Math.random().toString(36).slice(2);
const clampPos = (x: number, y: number) => ({
  x: Math.min(Math.max(MARGIN, x), window.innerWidth - BUTTON - MARGIN),
  y: Math.min(Math.max(MARGIN, y), window.innerHeight - BUTTON - MARGIN),
});
const readJson = <T,>(key: string, store: Storage | undefined, fallback: T): T => {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, store: Storage | undefined, value: unknown) => {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
const trimAnswer = (text: string, max = 900) => (text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + ' …' : text);

export const ChatbotWidget: React.FC<{ onOpenProduct?: (productId: string) => void }> = ({ onOpenProduct }) => {
  const { currentUser, products, showToast } = useLms();

  const [open, setOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Phones: the chat is full screen, so the page behind it must not scroll
  useBodyScrollLock(open && isPhone);
  // Phones: the system Back button/gesture closes the chat instead of leaving the page
  useEffect(() => {
    if (!open || !isPhone) return;
    window.history.pushState({ ...(window.history.state || {}), trainerPanda: true }, '');
    const onPop = () => setOpen(false);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.trainerPanda) window.history.back();
    };
  }, [open, isPhone]);
  const [noticeOpen, setNoticeOpen] = useState(false);

  // ---- Draggable position -------------------------------------------------
  const [pos, setPos] = useState(() => {
    const saved = readJson<{ x: number; y: number } | null>(POS_KEY, typeof window !== 'undefined' ? window.localStorage : undefined, null);
    return saved ? clampPos(saved.x, saved.y) : clampPos(window.innerWidth - BUTTON - 20, window.innerHeight - BUTTON - 20);
  });
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setDragging(true);
    setPos(clampPos(d.originX + dx, d.originY + dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      // Snap to the nearest side so it never covers the middle of the page
      setPos((p) => {
        const snapped = clampPos(p.x + BUTTON / 2 < window.innerWidth / 2 ? MARGIN : window.innerWidth - BUTTON - MARGIN, p.y);
        writeJson(POS_KEY, window.localStorage, snapped);
        return snapped;
      });
    } else {
      setOpen((o) => !o);
    }
  };

  // ---- Chat state -----------------------------------------------------------
  const [messages, setMessages] = useState<Message[]>(() => readJson<Message[]>(CHAT_KEY, window.sessionStorage, []));
  /** Answers whose other-language version is open */
  const [showAlt, setShowAlt] = useState<Set<string>>(() => new Set());
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadPublishedEntries>> | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState(false);
  const [unread, setUnread] = useState(0);
  const [greeting] = useState(() => say('greetings'));
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => writeJson(CHAT_KEY, window.sessionStorage, messages.slice(-60)), [messages]);

  const publishedProducts = useMemo(() => products.filter((p) => p.is_published || p.status === 'published'), [products]);
  const index = useMemo(() => new KnowledgeIndex(buildKnowledge(entries || [], publishedProducts)), [entries, publishedProducts]);

  const loadKnowledge = useCallback(async () => {
    if (entries || loadingKnowledge) return;
    setLoadingKnowledge(true);
    try {
      setEntries(await loadPublishedEntries());
      setKnowledgeError(false);
    } catch (err) {
      setKnowledgeError(true);
      console.warn('[KBZLife Assistant] Knowledge base unavailable, using Product Knowledge Hub only:', (err as Error).message);
      setEntries([]);
    } finally {
      setLoadingKnowledge(false);
    }
  }, [entries, loadingKnowledge]);

  // Answers from the L&D team: badge on the icon, shown when the chat opens
  const checkTeamAnswers = useCallback(
    async (deliver: boolean) => {
      try {
        const mine = await loadMyQuestions(currentUser.id);
        const fresh = mine.filter((q) => q.status === 'answered' && !q.seen_at);
        setUnread(deliver ? 0 : fresh.length);
        if (deliver && fresh.length) {
          setMessages((prev) => [
            ...prev,
            ...fresh.reverse().map((q) => ({
              id: uid(),
              role: 'bot' as const,
              tone: 'team' as const,
              title: `${say('teamAnswer')}: “${q.question}”`,
              text: q.answer || '',
              source: q.answered_by_name ? `L&D · ${q.answered_by_name}` : 'L&D team',
            })),
          ]);
          await markAnswersSeen();
        }
      } catch {
        /* assistant not set up yet */
      }
    },
    [currentUser.id]
  );

  useEffect(() => {
    checkTeamAnswers(false);
    const timer = window.setInterval(() => checkTeamAnswers(false), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [checkTeamAnswers]);

  useEffect(() => {
    if (!open) return;
    loadKnowledge();
    checkTeamAnswers(true);
    if (window.innerWidth >= 640) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const suggestions = useMemo(() => {
    const faqs = (entries || []).filter((e) => e.kind === 'faq' && e.question && !isMyanmar(e.question)).slice(0, 3).map((e) => e.question!.split('\n')[0]);
    const productQs = publishedProducts.slice(0, 2).map((p) => `${p.title} benefits`);
    // Always-working starters, so a new chat is never empty
    return [...faqs, ...productQs].slice(0, 3).concat(['What can you do?', 'အာမခံဆိုတာဘာလဲ?', 'Tell me a joke 😄']);
  }, [entries, publishedProducts]);

  const introFor = (item: KnowledgeItem): ScriptKey =>
    item.kind === 'faq' ? 'answerFaq' : item.kind === 'product' ? 'answerProduct' : 'answerHandbook';
  /** Builds a reply from search hits: best sentences, other language, extra points. */
  const buildAnswer = (question: string, hits: SearchHit[], lang: Lang, introKey?: ScriptKey): Message => {
    const best = hits[0].item;
    const a = composeAnswer(question, hits, index, lang);
    return {
      id: uid(),
      role: 'bot',
      lang,
      intro: say(introKey ?? (lang === 'my' ? 'myAnswer' : introFor(best))),
      title: best.question?.split('\n')[0] || best.title || undefined,
      text: trimAnswer(a.text),
      alt: a.alt ? trimAnswer(a.alt) : undefined,
      altLang: lang === 'my' ? 'en' : 'my',
      points: a.points.map((p) => ({ title: p.title, text: trimAnswer(p.text, 300) })),
      source: best.source,
      productId: best.productId,
    };
  };
  /** Opens a suggested topic as its own answer. */
  const answerFromItem = (item: KnowledgeItem, lang: Lang): Message =>
    buildAnswer(item.question || item.title || '', [{ item, score: 1 }], lang, lang === 'my' ? 'myRelated' : 'related');

  const ask = (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    setInput('');
    const lang: Lang = isMyanmar(question) ? 'my' : 'en';
    const userMsg: Message = { id: uid(), role: 'user', text: question };
    const chat = smallTalk(question);
    if (chat) {
      const key: ScriptKey = lang === 'my' ? MY_TALK[chat] ?? 'myHello' : chat;
      setMessages((prev) => [...prev, userMsg, { id: uid(), role: 'bot', text: say(key), lang }]);
      return;
    }
    const hits = index.search(question, 4);
    const min = minAnswerScore(question);
    let reply: Message;
    if (isTrapQuestion(question)) {
      // No promises: deflect, then share the relevant facts if we have them
      const trap = `${say(lang === 'my' ? 'myTrap' : 'trap')} ${lang === 'my' ? T.trapHelpMy : T.trapHelp}`;
      reply =
        hits.length && hits[0].score >= min * 0.8
          ? { ...buildAnswer(question, hits, lang), intro: trap, tone: 'info' }
          : {
              id: uid(),
              role: 'bot',
              lang,
              text: `${say(lang === 'my' ? 'myTrap' : 'trap')}\n\n${lang === 'my' ? T.trapNoInfoMy : T.trapNoInfo}`,
              askable: question,
              tone: 'info',
            };
      setMessages((prev) => [...prev, userMsg, reply]);
      return;
    }
    if (hits.length && hits[0].score >= min) {
      const askedBefore = messages.some((m) => m.role === 'user' && m.text.trim().toLowerCase() === question.toLowerCase());
      const answer = buildAnswer(question, hits, lang, askedBefore ? (lang === 'my' ? 'myAgain' : 'again') : undefined);
      const used = new Set([...(answer.points || []).map((p) => p.title), hits[0].item.title || '']);
      reply = {
        ...answer,
        related: hits
          .slice(1)
          .filter((h) => h.score >= min * 0.8 && !used.has(h.item.title || ''))
          .map((h) => h.item),
      };
    } else {
      reply = knowledgeError
        ? {
            id: uid(),
            role: 'bot',
            lang,
            text:
              lang === 'my'
                ? 'အင်တာနက်ကြောင့် Panda စာအုပ်တွေကို ဖွင့်မရဖြစ်နေတယ် 😥 Page ကို refresh လုပ်ပြီး ထပ်မေးကြည့်ပါ။'
                : 'Panda couldn’t open the handbooks (connection problem) 😥 Please refresh the page and ask again.',
            tone: 'info',
          }
        : { id: uid(), role: 'bot', lang, text: say(lang === 'my' ? 'myNotFound' : 'notFound'), askable: question, tone: 'info' };
    }
    setMessages((prev) => [...prev, userMsg, reply]);
  };

  const sendToTeam = async (msg: Message) => {
    if (!msg.askable) return;
    try {
      await askTeam(currentUser.id, currentUser.full_name, msg.askable);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === msg.id ? { ...m, askable: undefined } : m)),
        { id: uid(), role: 'bot', text: say(msg.lang === 'my' ? 'mySent' : 'sent'), tone: 'info', lang: msg.lang },
      ]);
    } catch (err) {
      showToast('error', 'Not sent', (err as Error).message);
    }
  };

  // ---- Panel placement: next to the icon, always fully on screen ------------
  const onRight = pos.x + BUTTON / 2 > window.innerWidth / 2;
  const panelHeight = Math.min(580, window.innerHeight - 2 * MARGIN);
  const below = pos.y + BUTTON + 10; // panel top if opened under the icon
  const above = pos.y - 10 - panelHeight; // panel top if opened over the icon
  const fitsBelow = below + panelHeight <= window.innerHeight - MARGIN;
  const fitsAbove = above >= MARGIN;
  const top = fitsBelow ? below : fitsAbove ? above : Math.max(MARGIN, window.innerHeight - MARGIN - panelHeight);
  // No room above or below: open beside the icon instead of covering it
  const side = fitsBelow || fitsAbove ? 0 : BUTTON + 10;
  const panelStyle: React.CSSProperties =
    window.innerWidth < 640
      ? {}
      : {
          top,
          height: panelHeight,
          [onRight ? 'right' : 'left']: onRight
            ? Math.max(MARGIN, window.innerWidth - pos.x - BUTTON + side)
            : Math.max(MARGIN, pos.x + side),
        };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Trainer Panda — KBZ Life Assistant"
          style={isPhone ? { height: '100dvh' } : panelStyle}
          className="fixed z-[60] inset-x-0 top-0 sm:inset-auto sm:w-[380px] bg-white sm:rounded-3xl shadow-2xl sm:border border-slate-200 flex flex-col overflow-hidden overscroll-contain"
        >
          {/* Header */}
          <div
            className="bg-gradient-to-r from-[#003366] to-[#176B98] text-white px-3 sm:px-4 pb-3 flex items-center gap-2.5 sm:gap-3 shrink-0"
            style={{ paddingTop: isPhone ? 'max(12px, env(safe-area-inset-top))' : 12 }}
          >
            <MentorMascot className="w-10 h-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-sm leading-tight">Trainer Panda 🐼</p>
              <p className="text-[11px] text-sky-100/90 truncate">{T.disclaimer}</p>
            </div>
            <button
              type="button"
              onClick={() => setMessages([])}
              title="Clear chat"
              aria-label="Clear chat"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center hover:bg-white/15 active:bg-white/25 cursor-pointer"
            >
              <RotateCcw className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-white/10 sm:bg-transparent hover:bg-white/15 active:bg-white/25 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Always-visible reminder (one compact line on phones, tap for Myanmar) */}
          <button
            type="button"
            role="note"
            onClick={() => setNoticeOpen((o) => !o)}
            aria-expanded={!isPhone || noticeOpen}
            className="shrink-0 w-full text-left px-3.5 py-1.5 sm:py-2 bg-amber-50 border-b border-amber-200 text-[11px] leading-snug text-amber-900 flex items-start gap-2 cursor-pointer sm:cursor-default"
          >
            <span aria-hidden="true">⚠️</span>
            {isPhone && !noticeOpen ? (
              <span className="flex-1 truncate">
                {T.verify} <span className="text-amber-700 underline">မြန်မာ</span>
              </span>
            ) : (
              <span>
                <strong>{T.verifyMy}</strong>
                <br />
                <span className="text-amber-800">{T.verify}</span>
              </span>
            )}
          </button>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[#F3F8FB] dark:bg-[#0B131E]">
            <BotBubble>
              <p>{greeting}</p>
              {suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full bg-sky-50 border border-sky-200 text-[#176B98] text-[13px] sm:text-[11px] font-semibold hover:bg-sky-100 cursor-pointer text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </BotBubble>

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-[#176B98] text-white text-[15px] sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                </div>
              ) : (
                <BotBubble key={m.id} tone={m.tone}>
                  {m.intro && <p className="text-[12px] italic text-[#176B98] mb-1.5">{m.intro}</p>}
                  {m.title && <p className="font-bold text-slate-900 mb-1">{m.title}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.alt && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setShowAlt((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          })
                        }
                        className="text-[11px] font-semibold text-[#176B98] hover:underline cursor-pointer"
                      >
                        {showAlt.has(m.id) ? T.hideAlt : m.altLang === 'en' ? T.showEnglish : T.showMyanmar}
                      </button>
                      {showAlt.has(m.id) && (
                        <p className="mt-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[13px] sm:text-[12px] text-slate-600 whitespace-pre-wrap break-words">
                          {m.alt}
                        </p>
                      )}
                    </div>
                  )}
                  {m.points && m.points.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[10.5px] font-bold text-slate-500 mb-1">{m.lang === 'my' ? T.alsoMy : T.alsoEn}</p>
                      <ul className="space-y-1">
                        {m.points.map((pt, i) => (
                          <li key={i} className="text-[13px] sm:text-[12px] text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">{pt.title}:</span> {pt.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {m.lang === 'my' && m.alt && m.altLang === 'en' && (
                    <p className="mt-1.5 text-[10px] text-amber-700">{T.autoFixed}</p>
                  )}
                  {m.source && (
                    <p className="mt-2 text-[10.5px] text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      {m.lang === 'my' ? T.sourceMy : T.source}: {m.source}
                    </p>
                  )}
                  {m.productId && onOpenProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProduct(m.productId!);
                        if (window.innerWidth < 640) setOpen(false);
                      }}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-[11px] font-bold cursor-pointer"
                    >
                      {T.openProduct}
                    </button>
                  )}
                  {m.askable && (
                    <button
                      type="button"
                      onClick={() => sendToTeam(m)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#176B98] hover:bg-[#12567a] text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <UserRound className="w-3.5 h-3.5" />
                      {m.lang === 'my' ? T.sendMy : T.send}
                    </button>
                  )}
                  {m.related && m.related.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <p className="text-[10.5px] font-bold text-slate-500 mb-1">{m.lang === 'my' ? T.relatedMy : T.related}</p>
                      <div className="flex flex-col gap-1">
                        {m.related.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setMessages((prev) => [...prev, answerFromItem(r, m.lang || 'en')])}
                            className="text-left text-[11.5px] text-[#176B98] hover:underline cursor-pointer"
                          >
                            → {r.question?.split('\n')[0] || r.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </BotBubble>
              )
            )}
            {loadingKnowledge && (
              <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading knowledge…
              </p>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="px-3 pt-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
            style={{ paddingBottom: isPhone ? 'max(12px, env(safe-area-inset-bottom))' : 12 }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T.placeholder}
              maxLength={500}
              aria-label="Your question"
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 min-w-0 px-4 py-3 sm:px-3.5 sm:py-2.5 rounded-2xl sm:rounded-xl border border-slate-200 bg-slate-50 text-base sm:text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#176B98]/30"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="w-12 h-12 sm:w-10 sm:h-10 rounded-2xl sm:rounded-xl bg-[#176B98] hover:bg-[#12567a] active:scale-95 text-white flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating, draggable mascot */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-label={open ? 'Close Trainer Panda, the KBZ Life Assistant' : 'Open Trainer Panda, the KBZ Life Assistant (drag to move)'}
        aria-expanded={open}
        title="Trainer Panda · KBZ Life Assistant (drag to move)"
        style={{ left: pos.x, top: pos.y, width: BUTTON, height: BUTTON, touchAction: 'none' }}
        className={`fixed z-[61] rounded-full shadow-xl select-none ${
          dragging ? 'cursor-grabbing scale-105' : 'cursor-pointer hover:scale-105 transition-transform'
        } ${open ? 'max-sm:hidden' : ''}`}
      >
        <MentorMascot className="w-full h-full pointer-events-none" />
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}
      </button>
    </>
  );
};

const BotBubble: React.FC<{ children: React.ReactNode; tone?: 'info' | 'team' }> = ({ children, tone }) => (
  <div className="flex items-end gap-2">
    <MentorMascot className="w-7 h-7 shrink-0" />
    <div
      className={`max-w-[88%] sm:max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[15px] sm:text-[13px] leading-relaxed shadow-2xs border ${
        tone === 'team' ? 'bg-emerald-50 border-emerald-200 text-slate-800' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {children}
    </div>
  </div>
);
