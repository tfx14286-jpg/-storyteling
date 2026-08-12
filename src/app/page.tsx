import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: "📝", title: "AI Script & Storyboard", desc: "From a single idea, the AI writes a human-sounding script, splits it into scenes and builds a full storyboard." },
  { icon: "🎨", title: "Consistent Characters", desc: "Style Bible, Character Bible and Environment Bible keep faces, clothing and art style identical across every scene." },
  { icon: "🎬", title: "Scene Animation", desc: "Every image is turned into motion with cinematic camera moves, parallax depth and smooth transitions." },
  { icon: "🎙️", title: "Voice & Subtitles", desc: "Automatic voice-over, synced subtitles, background music and sound effects — all timed to each scene." },
  { icon: "🎞️", title: "Auto Editing & Render", desc: "The AI directs pacing, builds the timeline and renders a final MP4 ready for YouTube, TikTok or Reels." },
  { icon: "🔁", title: "Regenerate Anything", desc: "Regenerate one image, one animation, one voice line or the whole scene — never redo the entire video." },
];

const STEPS = [
  { n: "01", title: "Write your idea", desc: "One line. One title. Choose language, style, voice and duration." },
  { n: "02", title: "AI produces the story", desc: "Script, storyboard, characters and style guide are generated automatically." },
  { n: "03", title: "Review & refine", desc: "Edit any scene, regenerate visuals, change camera or narration." },
  { n: "04", title: "Generate the full video", desc: "One click. Images, animation, voice, music, subtitles and final MP4." },
];

const FAQS = [
  { q: "Do I need any video editing skills?", a: "No. StoryMotion AI handles script, visuals, voice, music and editing automatically. You just review and export." },
  { q: "Can I control the style of the video?", a: "Yes — choose from 2D Documentary, Cartoon, Hand Drawn, Anime, Cinematic, Watercolor and more. You can edit every scene afterwards." },
  { q: "Which platforms can I publish to?", a: "Export in 16:9 for YouTube, 9:16 for TikTok/Shorts/Reels, or 1:1 for Instagram Feed." },
  { q: "How consistent are the characters?", a: "Character consistency is the core of the platform — every scene is generated from the same Character Bible, style and reference images." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* bg glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[-200px] top-[40%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">S</span>
          <span className="text-base font-semibold tracking-tight">
            StoryMotion <span className="gradient-text">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6">
        {/* HERO */}
        <section className="flex flex-col items-center py-20 text-center">
          <span className="glass rounded-full px-3 py-1 text-xs text-muted-foreground">
            AI Video Studio · Storyboard · Animator · Voice · Editor
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Create Cinematic <span className="gradient-text">Story Videos</span> With AI
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Turn a simple idea into a complete animated storytelling video — script, scenes, characters, voice, music and editing handled automatically by AI.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Button asChild size="lg" className="glow-ring">
              <Link href="/register">Create Video</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          {/* Demo frame */}
          <div className="mt-14 w-full max-w-3xl">
            <div className="glass rounded-2xl p-2 shadow-2xl">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-destructive live-dot" />
                  <p className="text-sm text-muted-foreground">AI generated video preview</p>
                  <div className="h-24 w-44 rounded-lg bg-gradient-to-br from-primary/40 to-accent/20 animate-fade-up" />
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                <span>How the First Nations Were Created · 00:42</span>
                <span className="text-primary">Ready to export</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Everything handled by AI</h2>
          <p className="mt-3 text-center text-muted-foreground">One idea in. A complete storytelling video out.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass rounded-xl p-5 transition-colors hover:border-primary/40">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border bg-card p-5">
                <span className="text-3xl font-bold text-primary/30">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PIPELINE */}
        <section className="py-16">
          <div className="glass rounded-2xl p-8">
            <h2 className="text-center text-2xl font-bold">The production pipeline</h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
              {["Topic", "AI Script", "Scene Breakdown", "Storyboard", "Style Bible", "Character Bible", "Image Generation", "Consistency Check", "Image to Video", "Voice Over", "Subtitles", "Music & SFX", "Timeline", "Render", "Final MP4"].map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">{step}</span>
                  {i < 14 && <span className="text-primary/50">→</span>}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">FAQ</h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium marker:content-none">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Start your first video</h2>
          <p className="mt-3 text-muted-foreground">Free credits on signup — try the full pipeline.</p>
          <Button asChild size="lg" className="mt-6 glow-ring">
            <Link href="/register">Create Video</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} StoryMotion AI. Built for storytellers.
      </footer>
    </div>
  );
}
