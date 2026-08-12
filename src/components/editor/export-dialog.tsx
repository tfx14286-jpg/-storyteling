"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { RESOLUTIONS, FPS_OPTIONS, SOCIAL_PRESETS } from "@/lib/constants";

export type ExportOptions = {
  resolution: string;
  fps: number;
  aspectRatio: string;
  subtitles: boolean;
  watermark: boolean;
};

const DIAGONAL =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm";

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (opts: ExportOptions) => void;
}) {
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [subtitles, setSubtitles] = useState(true);
  const [watermark, setWatermark] = useState(false);

  if (!open) return null;

  const ratioInfo = RESOLUTIONS.find((r) => r.value === resolution);
  const width = ratioInfo ? (aspectRatio === "9:16" ? ratioInfo.height : ratioInfo.width) : 1920;
  const height = ratioInfo ? (aspectRatio === "9:16" ? ratioInfo.width : ratioInfo.height) : 1080;

  return (
    <div className={DIAGONAL} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg animate-fade-up rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export video</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Render the final MP4. Costs credits from your balance.</p>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Platform preset</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOCIAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setAspectRatio(p.ratio)}
                  className={
                    aspectRatio === p.ratio
                      ? "rounded-lg border border-primary bg-primary/10 px-3 py-2 text-left"
                      : "rounded-lg border border-border px-3 py-2 text-left hover:border-primary/50"
                  }
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground">{p.ratio}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Resolution</Label>
              <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                {RESOLUTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>FPS</Label>
              <Select value={String(fps)} onChange={(e) => setFps(Number(e.target.value))}>
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Aspect ratio</Label>
              <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Vertical</option>
                <option value="1:1">1:1 Square</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Input readOnly value={`${width} × ${height}`} aria-label="Output dimensions" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm">Subtitles</span>
              <input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm">Watermark</span>
              <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            ~20 credits · {fps} fps · {aspectRatio}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onExport({ resolution, fps, aspectRatio, subtitles, watermark })}>
              Export MP4
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
