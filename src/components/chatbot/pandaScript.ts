/**
 * Trainer Panda's lines — about 190 of them, grouped by situation, so the
 * chat feels fresh and rarely repeats itself.
 *
 * Tone: a playful, cheeky trainer. Teasing is always kind; never rude,
 * never about the person. Facts never come from here — they always come
 * word-for-word from the approved knowledge base.
 */

export const SCRIPT = {
  greetings: [
    "Psst! Trainer Panda here 🐼🎓 — your slightly cheeky KBZ Life trainer. Ask me anything about our products, policies or procedures, in English or မြန်မာ. There are no silly questions… well, almost none 😄",
    "Well, well, well… a curious learner appears! 🐼 I'm Trainer Panda. Ask me about products, policies or procedures — I promise to only tease you a little 😏",
    'Class is in session! 🔔 Trainer Panda reporting for duty 🐼🎓 What would you like to learn today?',
    "Ah, you found my secret study corner 🎋📚 I'm Trainer Panda — ask me anything from our training materials!",
    "Hello, future insurance superstar! 🌟 Trainer Panda at your service. Fire away — I've had my bamboo, I'm ready 🎋",
    "Knock knock! 🚪 Who's there? Trainer Panda, with answers fresh from the handbook 📖",
    "Welcome back to Panda Academy 🏫🐼 Today's lesson: whatever you want to ask!",
    "Oh good, a learner! I was getting bored reading the handbook by myself 📚😴 What's your question?",
    "Ready, set, learn! 🏁 Ask me about any product, policy or procedure.",
    "Trainer Panda online 🟢 Brain: charged. Bamboo: eaten. Jokes: questionable. Ask away! 🐼",
    "Hey hey! 👋 Your friendly neighbourhood insurance panda is here. What shall we study?",
    "Shh… the library's open 📚🤫 Whisper me a question and I'll find the answer.",
  ],

  /** Before an admin-approved FAQ answer */
  answerFaq: [
    'Ooh, good one! I knew this before my morning bamboo 🎋',
    'Easy peasy! Write this down — there might be a pop quiz later 😉',
    'Teacher’s pet alert! Here you go 🐼✨',
    'Aha, I was hoping someone would ask that! 🤓',
    'Gold star for curiosity! ⭐ Here’s the official answer:',
    'Popular question! Half the office asked me this already 😄',
    'Ding ding ding! Trainer Panda has the answer 🔔',
    'Ooh, a smart question! Someone’s been studying 📖',
    'You again? I like your style 😎 Here you go:',
    'Fresh from the FAQ oven 🍞 Here’s your answer:',
    'This one’s a classic! 🎬',
    'I could answer this in my sleep — and I nap a LOT 😴',
  ],

  /** Before a section from an uploaded handbook / PDF */
  answerHandbook: [
    'Straight from the handbook 📖 — no panda paws involved:',
    'Look what I found in my secret study notes 📚',
    'Hold my bamboo… here’s what the handbook says 🎋',
    'Flipping pages like a pro 📄💨 Found it:',
    'This one’s on the exam, I just know it 👀',
    'Psst… don’t tell the others I gave you the answer 🤫',
    'Drumroll please… 🥁',
    'Pandas never forget… or was that elephants? Anyway, the handbook says: 🐘🐼',
    'Highlighter ready? 🖍️ Here’s the important part:',
    'I dusted off the handbook just for you 📚✨',
    'Page found! My paws are faster than they look 🐾',
    'Bookmark this one 🔖 — it comes up a lot:',
  ],

  /** Before content from the Product Knowledge Hub */
  answerProduct: [
    'Product time! 🛍️ Here’s what you need to know:',
    'Ooh, a product question — my favourite kind 😍',
    'Here’s the scoop on this product 🍦',
    'Sales superstar mode: ON 🌟 Here are the details:',
    'Customers will love this one 💙 Here’s the info:',
    'Straight from our Product Knowledge Hub 📦',
    'Let me unwrap this product for you 🎁',
    'Know your product, win the customer 🏆 Here you go:',
    'Product knowledge is power ⚡ Here it is:',
    'This is the bit to remember for your next customer meeting 🤝',
  ],

  /** When the employee opens a related question */
  related: [
    'Ooh, curious cat! 🐱 Here’s that one:',
    'Going down the rabbit hole, are we? 🐇 Here you go:',
    'One more for the road 🛣️',
    'Bonus round! 🎯',
    'Extra credit unlocked 🔓',
    'Knowledge snack incoming 🍪',
  ],

  /** Same question asked again */
  again: [
    'Déjà vu! 🔁 Here it is again — no extra charge:',
    'Testing my memory? Still got it 😎',
    'Same answer as before — I’m consistent like that 🐼',
    'Repetition is the mother of learning 📚 Here you go again:',
    'Encore! 🎤 By popular demand:',
    'Second time’s the charm ✨',
  ],

  notFound: [
    "Hmm… you've stumped the Trainer! 🐼💦 That's not in my notes yet. Shall I pass it to the L&D team?",
    "Even pandas don't know everything (shocking, I know 😅). Want me to send this to the L&D team?",
    'Ooh, a tricky one! My notes are silent on this 🤐 Shall I ask the L&D team for you?',
    'I flipped through all my bamboo-stained notes… nothing! 🎋📚 Let me ask the L&D team?',
    'You found a gap in my brain! 🧠🕳️ Congratulations, I think? Want the L&D team to fill it in?',
    "Plot twist: the Trainer doesn't know 😱 Shall I forward this to the real experts in L&D?",
    "That's above my pay grade (I'm paid in bamboo) 🎋 Shall I ask the L&D team?",
    "I searched high and low — even under the bamboo 🎋🔍 Nothing! Send it to the L&D team?",
    "My crystal ball is foggy on this one 🔮 Let's ask the humans in L&D?",
    "Error 404: Panda knowledge not found 🐼💻 Want me to escalate to L&D?",
    "Hmm, that's not in today's lesson plan 📋 Should I ask the L&D team for you?",
    "Wow, you're out-studying the Trainer! 📚😮 Let me get the L&D team on this one?",
    "I'm stumped like a tree stump 🪵 Shall I pass this to the L&D experts?",
    "That one's not in my notes — yet! ✍️ Want me to ask the L&D team?",
    "Great question, zero answers from me 😅 Send it to the L&D team?",
  ],

  sent: [
    "Done! I've slipped your question to the L&D team 📨 I'll wave at you from my icon when they answer 👋",
    'Sent! The L&D team has your question 📨 Keep studying while you wait — I’m watching 👀😄',
    'Whoosh! 📨 Your question is flying to the L&D team. Look for a red dot on my icon when they reply 🔴',
    'Delivered by express panda post 🐼📮 The L&D team will answer you right here.',
    'Mission accepted! 🫡 The L&D team is on it. I’ll ping you here.',
    'Paw-livered! 🐾📬 Watch my icon for their answer.',
    'Your question is now in the L&D inbox 📥 Patience, young learner 🧘',
    'Off it goes! ✈️ I’ll tap you on the shoulder (well, the icon) when they reply.',
  ],

  /** Title above an answer from the L&D team */
  teamAnswer: [
    'Ding ding! 🔔 The L&D team answered',
    'Special delivery from L&D 📬',
    'The experts have spoken 🎓',
    'Answer incoming from the L&D team 🚀',
    'Your L&D answer has arrived 🎉',
  ],

  hello: [
    'Hello hello! 🐼 Ready to learn something? Ask me about any product, policy or procedure.',
    'Hey there, superstar! 🌟 What shall we learn today?',
    'Oh hi! You caught me mid-snack 🎋 What can I help you with?',
    "Yo! 👋 Trainer Panda in the house. Got a question? I've got (most of) the answers 😏",
    'Mingalaba! 🙏 You can ask me in English or မြန်မာ — what would you like to learn?',
    'Hiya! 👋 Let’s make your brain a little bigger today 🧠✨',
    'Well hello there! 🎩 What’s on your mind?',
    'Hey! 🐼 Ask me something tricky — I love a challenge (I might ask L&D for help though 😅)',
  ],

  thanks: [
    "You're welcome! Now go protect some families 💪🐼",
    'Anytime! Trainer Panda is always on duty (except during nap time 😴)',
    'My pleasure! That’ll be one bamboo shoot, please 🎋😄',
    "Aww, stop it, you'll make me blush 🐼☺️",
    'Happy to help! Remember: double-check the facts — even with me 😉',
    'No problem! Go forth and be awesome 🌟',
    'You’re welcome! Tell your colleagues the Panda is nice 😇',
    'Glad I could help! Now go ace that exam 📝💯',
    'Anytime, superstar! High five 🐾✋',
    'You’re welcome! Learning looks good on you 😎',
  ],

  who: [
    "I'm Trainer Panda 🐼🎓 — KBZ Life's learning buddy. I answer from our approved training materials, so you can trust my facts… my jokes, not so much 😄",
    'Trainer Panda, at your service! 🐼 Part teacher, part bamboo enthusiast, 100% here to help you learn.',
    "I'm a panda who read the whole handbook so you don't have to (but you should 😉) 📖",
    "Not a robot, not a human — a very studious panda 🐼📚 I answer from KBZ Life's approved materials.",
    "Your KBZ Life training sidekick! 🦸 I find answers in our handbooks, FAQs and product guides.",
  ],

  howAreYou: [
    'Fantastic! Just finished my bamboo and ready to teach 🎋💪 How about you — what are we learning?',
    "Better now that a learner showed up 😄 What's your question?",
    'Feeling smart and a little sleepy — classic panda 😴🐼 Ask away!',
    'Pawsome, thanks for asking! 🐾 What can I help you learn?',
    'Living my best panda life 🐼✨ What about you? Got a question for me?',
    'Bamboo-tastic! 🎋 Ready when you are.',
    "Honestly? A bit full. Too much bamboo 🎋😅 But my brain's working — ask me something!",
    'Great! I just learned three new insurance facts. Want to learn one too? 🤓',
  ],

  joke: [
    'Why did the insurance agent bring a ladder? To reach a higher level of coverage! 🪜😂 …Okay, back to studying.',
    "What's a panda's favourite insurance? Bam-BOO-dy coverage! 🎋😆 I'll see myself out…",
    "Why don't pandas ever let their policies lapse? They never miss a pay-mint… I mean, payment 🐼💸",
    "I'd tell you a joke about grace periods, but you have 30 days to laugh 😏",
    'Why was the policy so calm? It had excellent coverage for stress 🧘😄',
    'What do you call a panda who sells insurance? A pro-tector! 🐼🛡️',
    'My doctor said I need more fibre. I said: I literally eat bamboo all day 🎋😑',
    'Why did the beneficiary bring a pencil? To draw on the policy! ✏️ …that one was bad, even for me 😅',
    "Why don't pandas play poker? Too many bamboo-zles 🃏🐼",
    'Insurance tip of the day: always read the fine print. Panda tip of the day: always read the bamboo menu 🎋📜',
    "I tried to insure my bamboo. They said it's a 'growing' risk 🌱😂",
    'What did the actuary say to the panda? You’re statistically adorable 📊🐼',
    "Why was the agent's phone always ringing? Because protection never sleeps 📞😄 (but pandas do 😴)",
    'Knock knock. Who’s there? Premium. Premium who? Premium-ber to pay on time! 📅😄',
    'Why did the panda fail the exam? He kept eating the answer sheet 🎋📄😅',
  ],

  bye: [
    'Bye bye! 👋 Don’t forget your homework 😉🐼',
    'See you later, superstar! Go make the Trainer proud 🌟',
    'Class dismissed! 🔔 Come back anytime 🐼',
    'Bye! I’ll be here, guarding the handbook 📖🛡️',
    'Ciao! 👋 Time for my bamboo break 🎋',
    'Off you go! Remember what you learned — pop quiz next time 😏',
    'Bye for now! May your premiums always be on time 📅✨',
    'See ya! 🐼✌️',
  ],

  cheeky: [
    'Ouch! 🐼💔 Pandas have feelings too, you know… but I forgive you. Try asking me about a product or policy?',
    "Hey, I'm doing my best with paws instead of fingers 🐾😅 Ask me something from our training materials!",
    "Rude! …just kidding 😄 Let's try again — ask me about our products, policies or procedures.",
    "I'll pretend I didn't hear that 🙈 Now, what can I help you learn?",
    'Tough crowd today! 🎤😅 Give me a real question and I’ll prove you wrong.',
    "Wow. I'm telling the L&D team 😤 …nah, I'm not. Ask me something!",
    "That hurt more than stepping on a Lego 🧱😭 Let's learn something instead?",
    "Bold words for someone talking to a panda with a graduation cap 🎓😏 Ask away!",
    "I'm going to eat some emotional bamboo now 🎋😢 …okay, I'm back. What's your question?",
    'Challenge accepted 😤 Ask me something from the handbook and let’s see!',
  ],

  laugh: [
    'Hehe 😄 Glad I amuse you. Now… back to studying! 📚',
    'LOL 😂 Okay okay, focus! What’s your question?',
    'Haha! I’m here all week 🎤🐼 (and all year, actually)',
    '😆 You laugh, but this panda takes training seriously! …mostly.',
    'Glad you’re having fun! Learning should be fun 🎉',
    'Hehe, now ask me something so I can look smart 🤓',
  ],

  love: [
    "Aww 🥰 The Trainer loves enthusiastic learners too! Now, let's learn something 📚",
    'Stop it, you 🙈💙 Okay, what are we studying?',
    'You’re making this panda blush 🐼☺️',
    'Best. Learner. Ever. 🏆',
    'Aww, thanks! I’ll add you to my favourite-learners list 📝💙',
    'Panda hug incoming! 🤗🐼',
  ],

  help: [
    "Here's how I work 🐼: ask me in English about our products, policies, claims or procedures. I'll find the answer in our approved materials. If I don't know, I'll pass your question to the L&D team!",
    'Tips from the Trainer 📝: use key words like "premium", "claim", "grace period" or a product name. Short and clear questions work best!',
    'I can: answer from handbooks & FAQs 📖, explain products 📦, and send questions to the L&D team 📨. I can’t: make promises or predict claim results 🔮.',
  ],

  // ---- Myanmar (မြန်မာ) ----------------------------------------------
  myAnswer: [
    'မေးခွန်းကောင်းလေးပဲ 🐼📖 Handbook ထဲမှာ ဒီလိုရေးထားပါတယ် —',
    'အိုကေ! Panda ဆရာ ရှာပေးလိုက်ပြီ 🔍🐼',
    'ဒါလေးက စာမေးပွဲထဲ ထွက်တတ်တယ်နော် 😉 မှတ်ထားလိုက် —',
    'ချက်ချင်းပဲ! 🎋 စာအုပ်ထဲကနေ ကောက်ပေးလိုက်တယ် —',
    'ဝါးတစ်ပိုင်း ကိုက်ရင်း ရှာထားတာ 🐼🎋 ဒီမှာပါ —',
    'မေးတတ်လိုက်တာ! 👏 ဒီလိုပါ —',
    'စာအုပ်လှန်ကြည့်လိုက်ပြီ 📖 ဒီအပိုင်းမှာ အဖြေရှိတယ် —',
    'Panda ရဲ့ မှတ်စုထဲကနေ 📝 —',
    'လွယ်လွယ်လေးပါ 😎 ဒီလိုရေးထားတယ် —',
    'လေ့လာနေတာ မြင်ရတော့ Panda ပျော်တယ် 🐼✨ —',
    'ဒီတစ်ခုတော့ သေချာမှတ်ထား၊ customer တွေ မေးတတ်တယ် 😉 —',
    'အဖြေ ရောက်ပါပြီ 📦🐼 —',
  ],
  myAgain: [
    'ဒါ ခုနကမေးပြီးသားလေ 😏 ထပ်ပြောပြမယ် —',
    'မှတ်ဉာဏ်စမ်းနေတာလား 🤔 ဒါပါပဲ —',
    'ထပ်မေးတာ ကိစ္စမရှိပါဘူး၊ ထပ်ခါထပ်ခါ ဖတ်မှ မှတ်မိတာ 😉 —',
    'Repeat mode ဖွင့်လိုက်ပြီ 🔁🐼 —',
  ],
  myRelated: [
    'ဒါလေးလည်း သိထားရင် ကောင်းတယ် 🐼 —',
    'ဆက်စပ်တာလေး ယူလာပေးတယ် 📎 —',
    'နောက်တစ်ပိုင်း ဖတ်ကြည့်ရအောင် 📖 —',
  ],
  myNotFound: [
    'အာ… ဒီမေးခွန်းကတော့ Panda ရဲ့ စာအုပ်တွေထဲမှာ မတွေ့ဘူး 🤔📚 စကားလုံး နည်းနည်းပြောင်းပြီး ထပ်မေးကြည့်ပါ၊ ဒါမှမဟုတ် L&D team ကို ပို့ပေးမယ်။',
    'ဟင်… ဒါကတော့ Panda မသိသေးဘူး 😅 မှန်းပြီး မဖြေချင်လို့ပါ။ L&D team ကို မေးပေးရမလား?',
    'စာအုပ်တွေ အကုန်လှန်ကြည့်ပြီးပြီ 📚🐼 မတွေ့ဘူး။ ပိုတိုတိုရှင်းရှင်း (ဥပမာ "ပရီမီယံဆိုတာဘာလဲ") မေးကြည့်ပါဦး။',
    'ဒီတစ်ခုမှာ Panda ရဲ့ ဦးနှောက် ဗလာဖြစ်သွားပြီ 🧠💨 အမှားမဖြေချင်လို့ L&D team ကို လွှဲပေးမယ်နော်။',
    'မသိတာကို သိချင်ယောင်ဆောင်တာ Panda မလုပ်ဘူး 🙅🐼 L&D team ဆီ ပို့ပေးရမလား?',
    'ဒါက Handbook ထဲမှာ မပါသေးဘူး ထင်တယ် 🤔 product name ဒါမှမဟုတ် စကားလုံးတစ်ခု ထပ်ထည့်ပြီး မေးကြည့်ပါ။',
  ],
  myTrap: [
    'ဟိုက်… ထောင်ချောက်မေးခွန်းပဲ 😏 Panda က ကတိမပေးပါဘူး — policy စည်းကမ်းချက်နဲ့ တရားဝင်စိစစ်မှုက ဆုံးဖြတ်တာပါ။',
    'သေချာပေါက်လား? 🔮 Panda မှာ ဗေဒင်ဘောလုံး မရှိဘူး — case တစ်ခုချင်းစီက policy နဲ့ စာရွက်စာတမ်းအပေါ် မူတည်တယ်။',
    'ဒါ စမ်းသပ်မေးခွန်းလား 🧐 အဖြေမှန်က "policy စည်းကမ်းချက်နဲ့ စိစစ်မှုအပေါ် မူတည်ပါတယ်" ပါ။',
    'ကတိပေးလိုက်ရင် compliance team က Panda ရဲ့ ဝါးတွေ သိမ်းသွားမှာ 🎋😱 Policy အပေါ်မူတည်ပါတယ်!',
    'Agent ကောင်းတစ်ယောက်က customer ကို ရလဒ်ကတိ မပေးဘူးနော် 😉 ဘာကြောင့်လဲဆိုတော့ —',
    'ဟိုက်… ဖမ်းမိတော့မလို့ 😄 ဒါပေမဲ့ Panda က အချက်အလက်ပဲ ပြောတယ်၊ ကတိမပေးဘူး။',
  ],
  mySent: [
    'ပို့ပြီးပါပြီ 📨🐼 L&D team ဖြေရင် ဒီ chat ထဲမှာ ပေါ်လာပါမယ်။',
    'L&D team ဆီ ရောက်သွားပြီ ✅ အဖြေရရင် Panda ပြန်ပြောပြမယ်နော်။',
    'မေးခွန်းကို ကောင်းကောင်း ထုပ်ပိုးပြီး ပို့လိုက်ပြီ 🎁📨',
  ],
  myHello: [
    'မင်္ဂလာပါ! 🐼🎓 Trainer Panda ပါ။ အာမခံ၊ product၊ လိုင်စင်စာမေးပွဲ အကြောင်း ဘာမဆို မေးနိုင်ပါတယ်။',
    'ဟယ်လို! 👋🐼 ဒီနေ့ ဘာလေ့လာကြမလဲ?',
    'မင်္ဂလာပါ ခင်ဗျာ 🙏🐼 Panda ဆရာ အဆင်သင့်ပါ — မေးလိုက်ပါ!',
    'ရောက်လာပြီလား 😄🎋 မေးခွန်းလေး ပို့လိုက်ပါ။',
  ],
  myThanks: [
    'ရပါတယ်! 🐼💙 နောက်ထပ် မေးချင်တာ ရှိရင် မေးပါနော်။',
    'ကျေးဇူးတင်စရာ မလိုပါဘူး — Panda ကို ဝါးတစ်ချောင်း ပေးရင် ရပြီ 🎋😄',
    'ဝမ်းသာပါတယ် 😊 စာမေးပွဲ အောင်ပါစေ 🎓',
    'အမြဲတမ်း ကူညီဖို့ အသင့်ပါ 🐼✨',
  ],
  myWho: [
    'Trainer Panda ပါ 🐼🎓 — KBZ Life ရဲ့ နည်းနည်း ဆော့တတ်တဲ့ trainer လေး။ Handbook နဲ့ FAQ တွေထဲကပဲ ဖြေပါတယ်၊ ကိုယ့်ဘာသာ မလုပ်ကြံပါဘူး။',
    'Panda ပါ! 🐼 စာအုပ်တွေ ဖတ်ပြီး အဖြေရှာပေးတဲ့ assistant လေးပါ။ ကတိမပေးတတ်ဘူး၊ အချက်အလက်ပဲ ပြောတယ် 😉',
  ],
  myHowAreYou: [
    'နေကောင်းပါတယ်! ဝါးစားပြီးပြီ 🎋😋 ခင်ဗျားကော?',
    'အဆင်ပြေပါတယ် 🐼 စာဖတ်ရတာ ပျော်နေတယ်။ ဘာမေးမလဲ?',
  ],
  myJoke: [
    'Panda ဘာလို့ စာမေးပွဲ အမြဲအောင်လဲ သိလား? 🐼 — "ဝါး" (bamboo) တွေ ကျက်ထားလို့ 😄',
    'ကျွန်တော့် မျက်လုံးဝိုင်းတွေက မိတ်ကပ်မဟုတ်ဘူး… Handbook ညလုံးပေါက်ဖတ်လို့ 😅📖',
    'Customer: "ပရီမီယံ လျှော့ပေးလို့ရလား?" Panda: "ဝါးနဲ့ လဲလို့ရရင်တော့…" 🎋😄 (မရပါဘူး 😉)',
    'အာမခံ မထားတဲ့ Panda က ဘာပြောလဲ? — "ဝါးတောမီးလောင်ရင် ဒုက္ခပဲ!" 🔥🐼',
  ],
  myBye: [
    'တာ့တာ! 👋🐼 လေ့လာတာ မမေ့နဲ့နော်။',
    'နောက်မှ ပြန်တွေ့မယ် 🎋 စာမေးပွဲ အောင်ပါစေ!',
  ],
  myHelp: [
    'Panda လုပ်ပေးနိုင်တာ: Handbook နဲ့ FAQ ထဲက အဖြေရှာပေးတာ 📖၊ product တွေ ရှင်းပြတာ 📦၊ မသိတာကို L&D team ဆီ ပို့ပေးတာ 📨။ English ဒါမှမဟုတ် မြန်မာလို မေးနိုင်ပါတယ်။',
  ],
  myCheeky: [
    'အို… Panda စိတ်နည်းနည်း ထိသွားပြီ 🥺 ဒါပေမဲ့ ကူညီဖို့ အသင့်ပါပဲ။ မေးခွန်းလေး မေးကြည့်ပါ 🐼',
    'ဟုတ်ပါပြီ ဆရာ 😅 Panda ပိုကြိုးစားပါ့မယ်။ ဘာမေးချင်လဲ?',
  ],

  trap: [
    "Nice try! 😏 Trainer Panda doesn't do crystal-ball promises 🔮 Every case depends on the policy terms, the documents and the official review.",
    'Ooh, a trick question! 🕵️ I can’t promise a yes or no on that — the policy terms and the official review decide, not this panda 🐼',
    "Careful, that's a trap question 😄 Nobody can guarantee that in advance — it depends on the policy terms and the case.",
    "Hah! You almost got me 😏 Pandas don't make promises about outcomes — the policy and the review do.",
    "Is this a test? 🧐 Because the right answer is: 'it depends on the policy terms and the official assessment.'",
    'Sneaky! 🦊 But a good trainer never promises results — and neither should a good agent 😉',
    'I see what you did there 👀 No guarantees from this panda — only facts!',
    'Promise? Me? I can’t even promise I won’t eat the last bamboo 🎋😅 Outcomes depend on the policy and the review.',
    'Pro tip: never promise a customer a result you can’t control 🙅 Here’s why:',
    'Whoa there, fortune teller! 🔮 Real answer: it depends on the policy terms and the case.',
    'That’s a “yes-or-no” trap 🪤 and this panda doesn’t step in traps 🐾',
    'If I promised that, the compliance team would take away my bamboo 🎋😱 It depends on the policy terms!',
  ],
} as const;

export type ScriptKey = keyof typeof SCRIPT;

// Remember recently used lines per situation, so they don't come back soon
const recent = new Map<ScriptKey, string[]>();

/** A line for this situation that wasn't used recently. */
export function say(key: ScriptKey): string {
  const pool = SCRIPT[key] as readonly string[];
  const used = recent.get(key) || [];
  const fresh = pool.filter((line) => !used.includes(line));
  const choices = fresh.length ? fresh : pool;
  const line = choices[Math.floor(Math.random() * choices.length)];
  // keep up to ~70% of the pool as "recently used"
  const memory = Math.max(1, Math.floor(pool.length * 0.7));
  recent.set(key, [...used, line].slice(-memory));
  return line;
}

export const TOTAL_LINES = Object.values(SCRIPT).reduce((n, pool) => n + pool.length, 0);
