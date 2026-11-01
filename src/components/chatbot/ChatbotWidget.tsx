/**
 * LMS Assistant: a draggable floating mascot on every user-panel page.
 * Click it to chat. Answers come from the knowledge base admins build
 * (PDFs + FAQs) and from the Product Knowledge Hub, in Myanmar or English.
 * Questions it cannot answer can be sent to the L&D team.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, RotateCcw, Send, UserRound, X } from 'lucide-react';
import { useLms } from '../../context/LmsContext';
import { MentorMascot } from './MentorMascot';
import { askTeam, loadMyQuestions, loadPublishedEntries, markAnswersSeen } from '../../lib/chatbotApi';
import { buildKnowledge } from '../../lib/chatbotKnowledge';
import { isMyanmar, KnowledgeIndex, KnowledgeItem, minAnswerScore } from '../../lib/chatbotSearch';

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
  tone?: 'info' | 'team';
}

const BUTTON = 64;
const MARGIN = 12;
const POS_KEY = 'kbz_assistant_pos';
const CHAT_KEY = 'kbz_assistant_chat';

/**
 * Trainer Panda's voice: a playful, cheeky trainer — teasing but never rude.
 * Facts always come word-for-word from the approved knowledge; only the
 * lines around them are playful. English only for now (Myanmar coming soon).
 */
const T = {
  greetings: [
    "Psst! Trainer Panda here 🐼🎓 — your slightly cheeky KBZ Life trainer. Ask me anything about our products, policies or procedures. There are no silly questions… well, almost none 😄",
    "Well, well, well… a curious learner appears! 🐼 I'm Trainer Panda. Ask me about products, policies or procedures — I promise to only tease you a little 😏",
    "Class is in session! 🔔 Trainer Panda reporting for duty 🐼🎓 What would you like to learn today?",
    "Ah, you found my secret study corner 🎋📚 I'm Trainer Panda — ask me anything from our training materials!",
    "Hello, future insurance superstar! 🌟 Trainer Panda at your service. Fire away — I've had my bamboo, I'm ready 🎋",
  ],
  intros: [
    'Ooh, good one! I knew this before my morning bamboo 🎋',
    'Easy peasy! Write this down — there might be a pop quiz later 😉',
    'Look what I found in my secret study notes 📚',
    'Teacher’s pet alert! Here you go 🐼✨',
    'Aha, I was hoping someone would ask that! 🤓',
    'Hold my bamboo… here’s the answer 🎋',
    'Gold star for curiosity! ⭐ Here’s what our materials say:',
    'Psst… don’t tell the others I gave you the answer 🤫',
    'I could answer this in my sleep — and I nap a LOT 😴',
    'Drumroll please… 🥁',
    'You again? I like your style 😎 Here you go:',
    'Ding ding ding! Trainer Panda has the answer 🔔',
    'This one’s on the exam, I just know it 👀',
    'Pandas never forget… or was that elephants? Anyway: 🐘🐼',
    'Ooh, a smart question! Someone’s been studying 📖',
  ],
  notFound: [
    "Hmm… you've stumped the Trainer! 🐼💦 That's not in my notes yet. Shall I pass it to the L&D team?",
    "Even pandas don't know everything (shocking, I know 😅). Want me to send this to the L&D team?",
    'Ooh, a tricky one! My notes are silent on this 🤐 Shall I ask the L&D team for you?',
    "I flipped through all my bamboo-stained notes… nothing! 🎋📚 Let me ask the L&D team?",
    "You found a gap in my brain! 🧠🕳️ Congratulations, I think? Want the L&D team to fill it in?",
    "Plot twist: the Trainer doesn't know 😱 Shall I forward this to the real experts in L&D?",
    "That's above my pay grade (I'm paid in bamboo) 🎋 Shall I ask the L&D team?",
  ],
  send: 'Ask the L&D team for me',
  sent: [
    "Done! I've slipped your question to the L&D team 📨 I'll wave at you from my icon when they answer 👋",
    'Sent! The L&D team has your question 📨 Keep studying while you wait — I’m watching 👀😄',
    "Whoosh! 📨 Your question is flying to the L&D team. Look for a red dot on my icon when they reply 🔴",
    'Delivered by express panda post 🐼📮 The L&D team will answer you right here.',
  ],
  hello: [
    'Hello hello! 🐼 Ready to learn something? Ask me about any product, policy or procedure.',
    'Hey there, superstar! 🌟 What shall we learn today?',
    'Oh hi! You caught me mid-snack 🎋 What can I help you with?',
    "Yo! 👋 Trainer Panda in the house. Got a question? I've got (most of) the answers 😏",
    'Mingalaba! 🙏 (That’s about all the Myanmar I know right now 😅) What would you like to learn?',
  ],
  thanks: [
    "You're welcome! Now go protect some families 💪🐼",
    'Anytime! Trainer Panda is always on duty (except during nap time 😴)',
    'My pleasure! That’ll be one bamboo shoot, please 🎋😄',
    "Aww, stop it, you'll make me blush 🐼☺️",
    'Happy to help! Remember: double-check the facts — even with me 😉',
    'No problem! Go forth and be awesome 🌟',
  ],
  who: [
    "I'm Trainer Panda 🐼🎓 — KBZ Life's learning buddy. I answer from our approved training materials, so you can trust my facts… my jokes, not so much 😄",
    "Trainer Panda, at your service! 🐼 Part teacher, part bamboo enthusiast, 100% here to help you learn.",
  ],
  howAreYou: [
    "Fantastic! Just finished my bamboo and ready to teach 🎋💪 How about you — what are we learning?",
    "Better now that a learner showed up 😄 What's your question?",
    "Feeling smart and a little sleepy — classic panda 😴🐼 Ask away!",
  ],
  joke: [
    "Why did the insurance agent bring a ladder? To reach a higher level of coverage! 🪜😂 …Okay, back to studying.",
    "What's a panda's favourite insurance? Bam-BOO-dy coverage! 🎋😆 I'll see myself out…",
    "Why don't pandas ever lapse their policies? They never miss a pay-mint… I mean, payment 🐼💸",
    "I'd tell you a joke about grace periods, but you have 30 days to laugh 😏",
  ],
  bye: [
    'Bye bye! 👋 Don’t forget your homework 😉🐼',
    'See you later, superstar! Go make the Trainer proud 🌟',
    'Class dismissed! 🔔 Come back anytime 🐼',
  ],
  cheeky: [
    "Ouch! 🐼💔 Pandas have feelings too, you know… but I forgive you. Try asking me about a product or policy?",
    "Hey, I'm doing my best with paws instead of fingers 🐾😅 Ask me something from our training materials!",
    "Rude! …just kidding 😄 Let's try again — ask me about our products, policies or procedures.",
  ],
  laugh: ['Hehe 😄 Glad I amuse you. Now… back to studying! 📚', 'LOL 😂 Okay okay, focus! What’s your question?'],
  love: ["Aww 🥰 The Trainer loves enthusiastic learners too! Now, let's learn something 📚"],
  help: [
    "Here's how I work 🐼: ask me in English about our products, policies, claims or procedures. I'll find the answer in our approved materials. If I don't know, I'll pass your question to the L&D team!",
  ],
  myanmar: [
    'Oops! 😅 I’m still taking Myanmar lessons 📖🐼 For now, please ask me in English.\nမြန်မာလို လောလောဆယ် မဖြေနိုင်သေးပါဘူး — English လို မေးပေးပါနော် 🙏',
    'Ah, my Myanmar isn’t ready yet — the Trainer is still studying 📚🐼 Could you ask me in English?\nမြန်မာဘာသာ မကြာခင် ရလာပါမယ်။ လောလောဆယ် English လို မေးပေးပါ 🙏',
  ],
  trap: [
    "Nice try! 😏 Trainer Panda doesn't do crystal-ball promises 🔮 Every case depends on the policy terms, the documents and the official review.",
    'Ooh, a trick question! 🕵️ I can’t promise a yes or no on that — the policy terms and the official review decide, not this panda 🐼',
    "Careful, that's a trap question 😄 Nobody can guarantee that in advance — it depends on the policy terms and the case.",
    "Hah! You almost got me 😏 Pandas don't make promises about outcomes — the policy and the review do.",
    "Is this a test? 🧐 Because the right answer is: 'it depends on the policy terms and the official assessment.'",
  ],
  trapHelp: 'Here’s what our materials say, so you can explain it properly:',
  trapNoInfo: 'For a definite answer on a real case, please check the policy document or ask the L&D team.',
  verifyMy: 'အချက်အလက်တွေကို အမြဲ ပြန်စစ်ဆေးပါ — Panda ကိုလည်း အကုန်မယုံပါနဲ့ 🐼',
  verify: 'Always double-check the facts — don’t trust the Panda blindly! 🐼',
  related: 'Curious? Try these too:',
  source: 'Source',
  openProduct: 'Open in Product Knowledge Hub',
  placeholder: 'Ask a question in English…',
  teamAnswer: 'Ding ding! 🔔 The L&D team answered',
  disclaimer: 'English only for now · For learning reference',
};

// Random line, never the same one twice in a row
let lastLine = '';
const pick = (options: string[]) => {
  const pool = options.length > 1 ? options.filter((o) => o !== lastLine) : options;
  lastLine = pool[Math.floor(Math.random() * pool.length)];
  return lastLine;
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
/** Small talk that should get a playful reply instead of a knowledge search. */
const smallTalk = (q: string): SmallTalk | null => {
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
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadPublishedEntries>> | null>(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [unread, setUnread] = useState(0);
  const [greeting] = useState(() => pick(T.greetings));
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
    } catch (err) {
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
              title: `${T.teamAnswer}: “${q.question}”`,
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
    setTimeout(() => inputRef.current?.focus(), 50);
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
    return [...faqs, ...productQs].slice(0, 4);
  }, [entries, publishedProducts]);

  const answerFromItem = (item: KnowledgeItem): Message => ({
    id: uid(),
    role: 'bot',
    intro: pick(T.intros),
    title: item.question?.split('\n')[0] || item.title || undefined,
    text: trimAnswer(item.content),
    source: item.source,
    productId: item.productId,
  });

  const ask = (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    setInput('');
    const userMsg: Message = { id: uid(), role: 'user', text: question };
    // English only for now: Myanmar questions get a friendly "coming soon"
    if (isMyanmar(question)) {
      setMessages((prev) => [...prev, userMsg, { id: uid(), role: 'bot', text: pick(T.myanmar), tone: 'info' }]);
      return;
    }
    const chat = smallTalk(question);
    if (chat) {
      setMessages((prev) => [...prev, userMsg, { id: uid(), role: 'bot', text: pick(T[chat]) }]);
      return;
    }
    const hits = index.search(question, 4);
    const min = minAnswerScore(question);
    let reply: Message;
    if (isTrapQuestion(question)) {
      // No promises: deflect, then share the relevant facts if we have them
      const best = hits.length && hits[0].score >= min * 0.8 ? hits[0].item : null;
      reply = best
        ? { ...answerFromItem(best), intro: `${pick(T.trap)} ${T.trapHelp}`, tone: 'info' }
        : { id: uid(), role: 'bot', text: `${pick(T.trap)}\n\n${T.trapNoInfo}`, askable: question, tone: 'info' };
      setMessages((prev) => [...prev, userMsg, reply]);
      return;
    }
    if (hits.length && hits[0].score >= min) {
      reply = {
        ...answerFromItem(hits[0].item),
        related: hits
          .slice(1)
          .filter((h) => h.score >= min * 0.8)
          .map((h) => h.item),
      };
    } else {
      reply = { id: uid(), role: 'bot', text: pick(T.notFound), askable: question, tone: 'info' };
    }
    setMessages((prev) => [...prev, userMsg, reply]);
  };

  const sendToTeam = async (msg: Message) => {
    if (!msg.askable) return;
    try {
      await askTeam(currentUser.id, currentUser.full_name, msg.askable);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === msg.id ? { ...m, askable: undefined } : m)),
        { id: uid(), role: 'bot', text: pick(T.sent), tone: 'info' },
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
          style={panelStyle}
          className="fixed z-[60] inset-0 sm:inset-auto sm:w-[380px] bg-white sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003366] to-[#176B98] text-white px-4 py-3 flex items-center gap-3 shrink-0">
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
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Always-visible reminder */}
          <div
            role="note"
            className="shrink-0 px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] leading-snug text-amber-900 flex items-start gap-2"
          >
            <span aria-hidden="true">⚠️</span>
            <span>
              <strong>{T.verifyMy}</strong>
              <br />
              <span className="text-amber-800">{T.verify}</span>
            </span>
          </div>

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
                      className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[#176B98] text-[11px] font-semibold hover:bg-sky-100 cursor-pointer text-left"
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
                  <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-[#176B98] text-white text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                </div>
              ) : (
                <BotBubble key={m.id} tone={m.tone}>
                  {m.intro && <p className="text-[12px] italic text-[#176B98] mb-1.5">{m.intro}</p>}
                  {m.title && <p className="font-bold text-slate-900 mb-1">{m.title}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.source && (
                    <p className="mt-2 text-[10.5px] text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      {T.source}: {m.source}
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
                      {T.send}
                    </button>
                  )}
                  {m.related && m.related.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <p className="text-[10.5px] font-bold text-slate-500 mb-1">{T.related}</p>
                      <div className="flex flex-col gap-1">
                        {m.related.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setMessages((prev) => [...prev, answerFromItem(r)])}
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
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T.placeholder}
              maxLength={500}
              aria-label="Your question"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#176B98]/30"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-xl bg-[#176B98] hover:bg-[#12567a] text-white flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
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
      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[13px] leading-relaxed shadow-2xs border ${
        tone === 'team' ? 'bg-emerald-50 border-emerald-200 text-slate-800' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {children}
    </div>
  </div>
);
