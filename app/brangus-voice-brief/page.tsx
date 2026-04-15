import type { Metadata } from 'next'
import Image from 'next/image'
import { VoiceBriefNav } from './voice-brief-nav'
import { ScriptNav } from './script-nav'

export const metadata: Metadata = {
  title: "Voice Artist Brief | Stockman's Wallet",
  description:
    'Voice over artist casting brief for Brangus, the AI stock agent character in Stockman\'s Wallet.',
  robots: { index: false, follow: false },
}

/* ------------------------------------------------------------------ */
/*  Image placeholder                                                  */
/* ------------------------------------------------------------------ */
function ImagePlaceholder({
  description,
  aspect = 'wide',
}: {
  description: string
  aspect?: 'landscape' | 'wide'
}) {
  return (
    <div
      className={`${aspect === 'wide' ? 'aspect-[21/9]' : 'aspect-[16/9]'} flex items-center justify-center rounded-2xl border border-dashed border-brand/20 bg-brand/[0.03] p-8`}
    >
      <p className="max-w-md text-center text-sm leading-relaxed text-brand/50">
        {description}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sample script                                                      */
/* ------------------------------------------------------------------ */
function SampleScript({
  number,
  title,
  duration,
  register,
  purpose,
  script,
}: {
  number: number
  title: string
  duration: string
  register: string
  purpose: string
  script: string
}) {
  return (
    <div
      id={`sample-${number}`}
      className="group scroll-mt-20 rounded-2xl border border-white/[0.04] bg-white/[0.015] p-5 transition-colors hover:border-white/[0.08] sm:p-6"
    >
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-bold tabular-nums text-brand">
          {number}
        </span>
        <h4 className="font-serif text-lg font-semibold text-white">{title}</h4>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full border border-white/[0.06] px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-text-muted">
            {register}
          </span>
          <span className="text-sm tabular-nums text-text-muted">{duration}</span>
        </div>
      </div>
      {/* Purpose */}
      <p className="mb-4 pl-10 text-sm text-text-muted">{purpose}</p>
      {/* Script body */}
      <div className="ml-3 border-l-2 border-white/[0.06] pl-6">
        {script.split('\n\n').map((paragraph, i) => (
          <p
            key={i}
            className="mb-3 text-[15px] leading-[1.85] text-text-secondary last:mb-0"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function BrangusVoiceBriefPage() {
  return (
    <main className="min-h-screen">
      <VoiceBriefNav />

      {/* ─────────────────────────────────────────────────────────────
          HERO
          Cinematic first impression. Image + headline + single CTA.
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-16 pt-24 lg:pb-24 lg:pt-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[900px] w-[900px] -translate-x-[55%] -translate-y-[35%] rounded-full bg-brand/[0.04] blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-end lg:gap-20">
            {/* Copy */}
            <div className="order-2 max-w-lg text-center lg:order-1 lg:pb-8 lg:text-left">

              <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-brand">
                Voice Artist Casting Brief
              </p>
              <h1 className="mb-5 font-serif text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Meet Brangus.
              </h1>
              <p className="text-lg leading-relaxed text-text-secondary">
                We are looking for a voice to bring him to life. Marketing videos, social media, how-to content, TV spots. This is an ongoing role. The right voice becomes the character.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-start">
                <a
                  href="#submit"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-light"
                >
                  Submit an Audition
                </a>
                <a
                  href="#scripts"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 px-7 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-white/20 hover:text-white"
                >
                  Read the Scripts
                </a>
              </div>
            </div>

            {/* Character image */}
            <div className="relative order-1 w-56 shrink-0 sm:w-72 lg:order-2 lg:w-[340px]">
              <div className="absolute -inset-10 rounded-3xl bg-brand/[0.06] blur-3xl" />
              <Image
                src="/images/brangus-post-dirt.webp"
                alt="Brangus, an anthropomorphised Brangus Bull in a blue work shirt and jeans, leaning on a fence post"
                width={600}
                height={900}
                className="relative rounded-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          IDENTITY STRIP
          Quick-scan character facts. Three stats at a glance.
          ───────────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-6 py-5 sm:flex-row sm:gap-12 lg:gap-16">
          {[
            { label: 'Species', value: 'Brangus Bull' },
            { label: 'Experience', value: '30 years in the yards' },
            { label: 'Personality', value: 'Larrikin. Sharp. Genuine.' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{item.label}</p>
              <p className="mt-0.5 text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          THE CHARACTER
          Story-driven prose. Who Brangus is, what drives him.
          ───────────────────────────────────────────────────────────── */}
      <section id="character" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="mb-10 text-xs font-medium uppercase tracking-[0.25em] text-brand">
            The Character
          </h2>

          <p className="mb-6 font-serif text-[26px] font-medium leading-[1.45] text-white sm:text-[28px]">
            Brangus is a 30-year veteran stock agent across Queensland and New South Wales. He knows every saleyard from Roma to Wagga.
          </p>

          <p className="text-[17px] leading-[1.8] text-text-secondary">
            He is a larrikin with a dry wit, but underneath the humour he genuinely cares about farmers, their families, and their livelihoods. He tells it straight. Never sugarcoats. He is a mate first, an advisor second.
          </p>
        </div>

        {/* Pull-quote - wider, bolder */}
        <div className="mx-auto mt-16 max-w-3xl px-6 lg:px-8">
          <blockquote className="relative rounded-2xl border border-white/[0.04] bg-white/[0.02] px-8 py-10 sm:px-12 sm:py-12">
            <span className="absolute -top-4 left-8 font-serif text-6xl leading-none text-brand/30 sm:left-12">&ldquo;</span>
            <p className="font-serif text-xl leading-[1.6] text-white sm:text-2xl">
              Think: the sharpest bloke at the Roma saleyards Christmas party. The one who has the whole pub laughing, then gives you dead-serious advice about your herd that saves you ten grand.
            </p>
          </blockquote>
        </div>

        {/* IMAGE: Brangus at the pub or saleyard */}
        <div className="mx-auto mt-16 max-w-3xl px-6 lg:px-8">
          <ImagePlaceholder
            description="Brangus laughing mid-yarn at a country pub or leaning on the saleyard rails with a Great Northern in hand. Full larrikin energy. Warm, candid, the bloke everyone gravitates to. The artist should feel the humour and the warmth."
            aspect="wide"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          THE VOICE
          Everything about how he sounds. Vocal qualities, accent,
          delivery, language, range, and anti-patterns.
          ───────────────────────────────────────────────────────────── */}
      <section id="voice" className="scroll-mt-20 bg-white/[0.015] py-20">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="mb-10 text-xs font-medium uppercase tracking-[0.25em] text-brand">
            The Voice
          </h2>

          <p className="mb-12 font-serif text-[26px] font-medium leading-[1.45] text-white sm:text-[28px]">
            Brangus is a big, solid bull. You should feel his size through the sound alone.
          </p>

          {/* Vocal qualities */}
          <div className="mb-14 space-y-8">
            {[
              {
                quality: 'Deep and resonant',
                detail: 'Low register with chest voice and natural sub-bass warmth. The voice has weight, body, substance.',
              },
              {
                quality: 'Weathered but not rough',
                detail: 'Texture and grain from decades of outdoor work, dust, sun, and early mornings. Not harsh or scratchy. Smooth and rough at the same time. The voice equivalent of well-worn leather.',
              },
              {
                quality: 'Strong yet reassuring',
                detail: 'Could command a room if needed, but his default is calm, steady, approachable. Strength in the foundation, not the volume. A firm handshake that is also warm.',
              },
            ].map((item) => (
              <div key={item.quality} className="border-l-2 border-brand/30 pl-6">
                <p className="mb-1.5 font-serif text-[17px] font-semibold text-white">{item.quality}</p>
                <p className="text-[15px] leading-[1.8] text-text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>

          <p className="mb-16 rounded-xl border border-white/[0.06] px-5 py-4 text-sm italic leading-relaxed text-text-muted">
            Reference (territory, not imitation): Sam Elliott&apos;s warmth and gravity, but Australian, rural, less cinematic. The biggest bloke at the saleyard who somehow has the gentlest way of explaining things.
          </p>

          {/* Accent + Delivery */}
          <div className="mb-16 grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-white">Accent</h3>
              <ul className="space-y-2.5 text-[15px] leading-relaxed text-text-secondary">
                <li>Rural/regional Queensland</li>
                <li>North QLD ideal, broad rural QLD works</li>
                <li>Natural and lived-in, not performed</li>
                <li>Not a city bloke doing country</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-white">Delivery</h3>
              <ul className="space-y-2.5 text-[15px] leading-relaxed text-text-secondary">
                <li>Conversational and relaxed</li>
                <li>Confident but not cocky</li>
                <li>Dry wit, deadpan humour</li>
                <li>Direct, short sentences, no waffle</li>
                <li>Natural pacing, not rushed</li>
              </ul>
            </div>
          </div>

          {/* Vocal Range */}
          <h3 className="mb-5 font-serif text-sm font-semibold uppercase tracking-wider text-white">
            Vocal Range
          </h3>
          <div className="mb-14 divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] bg-white/[0.02]">
            {[
              ['Default', 'Low-to-mid range, warm, grounded, natural chest resonance.'],
              ['Excited', 'Lifts slightly, faster pace. "Tell you what, those numbers are looking sharp."'],
              ['Serious', 'Drops, slows, measured. "Look, I\'m not going to dress this up."'],
              ['Banter', 'Deadpan. Comedy from what he says, not voice changes.'],
              ['Encouraging', 'Warm, genuine. A mate saying "good on ya" and meaning it.'],
            ].map(([mood, desc]) => (
              <div key={mood} className="flex gap-5 px-5 py-3.5">
                <span className="w-24 shrink-0 text-sm font-medium text-brand">{mood}</span>
                <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>

          {/* Language - how he talks */}
          <h3 className="mb-5 font-serif text-sm font-semibold uppercase tracking-wider text-white">
            Language
          </h3>
          <p className="mb-6 text-[15px] leading-[1.8] text-text-secondary">
            Natural Australian English with rural and livestock vocabulary. The slang should feel organic, not forced.
          </p>
          <div className="mb-14 grid gap-6 sm:grid-cols-2">
            {[
              {
                label: 'Openers',
                items: ['"Here\'s the go"', '"Tell you what"', '"Look"', '"Right-o"', '"Yeah"', '"Straight up"'],
              },
              {
                label: 'Natural slang',
                items: ['"reckon"', '"mate"', '"no worries"', '"fair dinkum"', '"too easy"', '"dead set"', '"sweet as"', '"good on ya"'],
              },
              {
                label: 'Livestock',
                items: ['"on the hoof"', '"turn them off"', '"top end of the market"', '"solid line"', '"tidy little lot"', '"in good nick"'],
              },
              {
                label: 'Reactions',
                items: ['"Not bad at all"', '"That\'s a tidy return"', '"Bit skinny"', '"Better than a poke in the eye"'],
              },
            ].map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-white/[0.04] px-2.5 py-1 text-sm text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* What he does NOT sound like */}
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400/70">
              What he does not sound like
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-muted">
              <span>City newsreader</span>
              <span className="text-white/10">|</span>
              <span>Over-the-top ocker</span>
              <span className="text-white/10">|</span>
              <span>Corporate smooth</span>
              <span className="text-white/10">|</span>
              <span>Hard sell</span>
              <span className="text-white/10">|</span>
              <span>Monotone or flat</span>
            </div>
          </div>
        </div>

        {/* IMAGE: Brangus looking thoughtful */}
        <div className="mx-auto mt-16 max-w-3xl px-6 lg:px-8">
          <ImagePlaceholder
            description="Brangus looking out over a dry paddock at golden hour, leaning on a fence rail with a furrowed brow. The measured, steady side of the character. Not grim, just a bloke thinking something through. Warm light, dust in the air."
            aspect="wide"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SAMPLE SCRIPTS
          The working part. Eight scripts, each testing a different
          register. Numbered, tagged by mood, easy to reference.
          ───────────────────────────────────────────────────────────── */}
      <section id="scripts" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-brand">
            Sample Scripts
          </h2>
          <p className="mb-4 font-serif text-xl leading-[1.6] text-white sm:text-[22px]">
            Eight short scripts, each testing a different register. Read all of them, then <strong>pick three that you connect with</strong> and record those.
          </p>
          <p className="mb-10 text-sm text-text-muted">
            Which three you choose tells us something too.
          </p>

          <ScriptNav />

          <div className="space-y-4">
            <SampleScript
              number={1}
              title="App Introduction"
              duration="~30s"
              register="Warm"
              purpose="Marketing video intro. Warm, confident, welcoming."
              script={`G'day. I'm Brangus.\n\nI've spent thirty years in the yards across Queensland and New South Wales. Seen droughts, booms, and everything in between. Reckon I've forgotten more about cattle prices than most blokes ever learn.\n\nNow I'm working with Stockman's Wallet to help you keep track of your herd, your numbers, and your bottom line. Think of me as the bloke you ring when you need a straight answer.\n\nNo fluff. No jargon. Just the good oil on what your livestock are actually worth.`}
            />

            <SampleScript
              number={2}
              title="Feature Walkthrough"
              duration="~20s"
              register="Direct"
              purpose="Explaining a feature. Conversational, direct, helpful."
              script={`Right-o, here's the go. You tell me what you're running, I'll tell you what it's worth. Steers, heifers, breeders, the lot. I pull live saleyard data so you're not guessing. And if you need to work out freight to Roma or Wagga or wherever you're pointing them, I can sort that too. Too easy.`}
            />

            <SampleScript
              number={3}
              title="Reacting to Good News"
              duration="~10s"
              register="Enthusiastic"
              purpose="Genuine enthusiasm, not over the top."
              script={`Tell you what, those young steers of yours are punching above their weight. Three-sixty a kilo. That's top end of the market right now. Good on ya, you've done the hard yards with that lot.`}
            />

            <SampleScript
              number={4}
              title="Delivering Tough News"
              duration="~15s"
              register="Measured"
              purpose="Honest, measured, still supportive. Not grim, just straight."
              script={`Look, I'm not going to sugarcoat it. The market's a bit soft this week, especially for grown heifers. Your numbers are down about eight percent from last month. Not the end of the world, but worth keeping an eye on. If you're not in a rush to sell, might be worth sitting tight for a bit.`}
            />

            <SampleScript
              number={5}
              title="Humour and Banter"
              duration="~15s"
              register="Deadpan"
              purpose="The larrikin side. Dry, deadpan, warm."
              script={`You reckon you want to know about me? Not much to tell. Just a bloke who's spent too long at saleyards and not enough time at the beach. My mate Lenny reckons I should take a holiday. I told him I'd think about it. That was three years ago.`}
            />

            {/* IMAGE: Brangus explaining something */}
            <div className="!my-8">
              <ImagePlaceholder
                description="Brangus in a working pose. Pointing at a whiteboard, gesturing with his hands, or showing someone something on a clipboard at the yards. The 'let me walk you through this' energy. Instructional, patient, authoritative but approachable."
                aspect="landscape"
              />
            </div>

            <SampleScript
              number={6}
              title="Social Media Hook"
              duration="~10s"
              register="Cheeky"
              purpose="Short-form social. Grabs attention in two seconds. Confident, cheeky."
              script={`You reckon you know what your cattle are worth? Yeah? Prove it. Open the app, punch in your numbers, and see how close you got. Bet I'm closer.`}
            />

            <SampleScript
              number={7}
              title="Instructional Voice Over"
              duration="~20s"
              register="Steady"
              purpose="How-to narration over screen recording. Clear, steady, guiding."
              script={`So you've added your herd, now let's see what they're worth. Tap into your portfolio here. See that? That's your total valuation, updated with live saleyard data. Scroll down and you can see each line broken out. Steers, heifers, breeders, all priced to their weight class. Simple as that.`}
            />

            <SampleScript
              number={8}
              title="Short Punchy Lines"
              duration="Various"
              register="Mixed"
              purpose="One-liners for bumpers, transitions, social. Test range."
              script={`"Here's the go."\n\n"Not bad for a Thursday."\n\n"Reckon that's a solid result."\n\n"Bit skinny, but she'll come good."\n\n"Wouldn't kick that price out of bed."\n\n"Let's have a look at your numbers."\n\n"Yeah, nah. Those figures don't stack up."\n\n"Flat out like a lizard drinking."`}
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          THE AUDITION
          How to nail it. This is the most important practical
          section. Elevated treatment, not an afterthought.
          ───────────────────────────────────────────────────────────── */}
      <section id="audition" className="scroll-mt-20 bg-white/[0.015] py-20">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-brand">
            How to Nail It
          </h2>
          <p className="mb-12 font-serif text-xl leading-[1.6] text-white sm:text-[22px]">
            Five things we are listening for.
          </p>

          <div className="space-y-8">
            {[
              {
                num: '01',
                bold: 'Don\'t perform him.',
                rest: 'Just be him. The less it sounds like acting, the better. We want to believe this bloke actually exists.',
              },
              {
                num: '02',
                bold: 'Make it yours.',
                rest: 'Adjust wording if something doesn\'t sit naturally. We want your version of this bloke, not a robotic read.',
              },
              {
                num: '03',
                bold: 'Lean into your background.',
                rest: 'Rural or regional experience is gold. If you grew up around cattle, saleyards, or small towns, that is your edge. Authenticity is everything.',
              },
              {
                num: '04',
                bold: 'Think long-term.',
                rest: 'This is not a one-off gig. We want a voice you\'d hear every day and never get sick of. Sustainable, not showy.',
              },
              {
                num: '05',
                bold: 'Talk to one person.',
                rest: 'Conversational, not a booth voice. Like you\'re talking to a mate over a beer, not an audience at a conference.',
              },
            ].map((note) => (
              <div key={note.num} className="flex gap-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 font-serif text-sm font-medium tabular-nums text-brand">
                  {note.num}
                </span>
                <div>
                  <p className="font-serif text-[17px] font-semibold text-white">{note.bold}</p>
                  <p className="mt-1 text-[15px] leading-[1.75] text-text-secondary">{note.rest}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SUBMIT
          Steps + usage scope + email CTA. Everything the artist
          needs to take action, in one place.
          ───────────────────────────────────────────────────────────── */}
      <section id="submit" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-brand">
            How to Submit
          </h2>
          <p className="mb-12 font-serif text-xl leading-[1.6] text-white sm:text-[22px]">
            You have read the brief. Now show us what you have got.
          </p>

          {/* The creative work */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold tabular-nums text-brand">
                1
              </span>
              <div>
                <p className="font-serif text-[17px] font-semibold text-white">Record three scripts</p>
                <p className="mt-1 text-[15px] leading-[1.75] text-text-secondary">
                  Pick three from the eight above that feel right to you. Which three you choose tells us something too.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold tabular-nums text-brand">
                2
              </span>
              <div>
                <p className="font-serif text-[17px] font-semibold text-white">Freestyle <span className="font-sans text-sm font-normal text-text-muted">(optional)</span></p>
                <p className="mt-1 text-[15px] leading-[1.75] text-text-secondary">
                  30 seconds ad-libbing as Brangus. Whatever comes naturally. This is where we hear you, not the script.
                </p>
              </div>
            </div>
          </div>

          {/* The logistics - same number style, compact descriptions */}
          <div className="space-y-3">
            <div className="flex gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold tabular-nums text-brand">
                3
              </span>
              <div className="flex items-center">
                <p className="text-[15px] text-text-secondary">Your rate card and availability</p>
              </div>
            </div>
            <div className="flex gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold tabular-nums text-brand">
                4
              </span>
              <div className="flex items-center">
                <p className="text-[15px] text-text-secondary">Any relevant rural or regional voice work</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <a
            href="mailto:brangus@stockmanswallet.com.au?subject=Brangus%20VO%20Audition"
            className="mt-12 block cursor-pointer rounded-2xl border border-brand/30 bg-brand/[0.06] px-8 py-6 text-center transition-all hover:border-brand/50 hover:bg-brand/[0.1]"
          >
            <p className="font-serif text-base font-semibold text-brand sm:text-2xl">
              brangus@stockmanswallet.com.au
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Subject: Brangus VO Audition - [Your Name]
            </p>
          </a>

          {/* Usage scope */}
          <div className="mt-12 grid gap-x-16 gap-y-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Primary use</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                Social media (Instagram, TikTok, YouTube), marketing videos, how-to content, App Store previews
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted">Secondary use</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                TV ads (15s and 30s spots), trade shows and events, podcast content
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Mostly short-form social (15-60 seconds). Instructional content may run 2-5 minutes.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
          <p className="font-serif text-lg text-white">
            The right voice brings him to life beyond the screen.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Stockman&apos;s Wallet helps Australian livestock producers track and value their herds using live market data. Brangus is the heart of the app.
          </p>
          <a href="https://stockmanswallet.com.au" className="mt-3 inline-block text-sm text-text-muted transition-colors hover:text-white">
            stockmanswallet.com.au
          </a>
        </div>
      </footer>
    </main>
  )
}
