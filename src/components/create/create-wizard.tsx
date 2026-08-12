"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LANGUAGES,
  DURATIONS,
  ASPECT_RATIOS,
  STYLES,
  VOICES,
  TONES,
} from "@/lib/constants";

export function CreateWizard() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("id");
  const [duration, setDuration] = useState(60);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [style, setStyle] = useState("2D Documentary");
  const [voice, setVoice] = useState("Male");
  const [tone, setTone] = useState("Educational");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (title.trim().length < 3) {
      setError("Judul minimal 3 karakter.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          language,
          durationSec: duration,
          aspectRatio,
          style,
          voice,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat project");
        return;
      }
      router.push(`/editor/${data.project.id}`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create New Video</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 1 of 1 — describe your idea. The AI handles everything else.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-1.5">
            <Label>Title / Idea</Label>
            <Input
              placeholder="e.g. Bagaimana Negara Pertama Kali Diciptakan?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">A strong, curious title works best.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Jelaskan bagaimana manusia mulai membentuk komunitas hingga menjadi negara."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Voice</Label>
              <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
                {VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm transition-colors",
                    duration === d.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Aspect Ratio</Label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAspectRatio(a.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-xs transition-colors",
                    aspectRatio === a.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span
                    className="rounded border border-current opacity-70"
                    style={{
                      width: a.value === "9:16" ? 12 : 24,
                      height: a.value === "9:16" ? 24 : 14,
                    }}
                  />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Style</Label>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm transition-colors",
                    tone === t.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button size="lg" className="w-full glow-ring" onClick={submit} disabled={loading}>
            {loading ? "Creating project…" : "Generate Story"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
