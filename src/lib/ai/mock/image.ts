import { seededRandom } from "@/lib/rate-limit";
import type { ImageGenParams, ImageGenResult, ImageProvider } from "../types";

type WH = { w: number; h: number };

function ratioDim(ratio: string): WH {
  switch (ratio) {
    case "9:16":
      return { w: 1024, h: 1820 };
    case "1:1":
      return { w: 1400, h: 1400 };
    default:
      return { w: 1820, h: 1024 };
  }
}

function hex(c: number[]): string {
  const p = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${p(c[0])}${p(c[1])}${p(c[2])}`;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildSvg(p: ImageGenParams, w: number, h: number): string {
  const rng = seededRandom(p.seed ?? 1);
  const prompt = p.prompt.toLowerCase();

  // Palette families
  const palettes = [
    { sky1: [255, 196, 120], sky2: [255, 236, 200], land: [122, 164, 90], land2: [70, 110, 70], accent: [216, 120, 70], sun: [255, 230, 160] },
    { sky1: [120, 160, 220], sky2: [200, 226, 255], land: [96, 140, 96], land2: [52, 92, 60], accent: [180, 96, 60], sun: [255, 245, 210] },
    { sky1: [70, 90, 150], sky2: [140, 170, 220], land: [70, 96, 80], land2: [40, 60, 52], accent: [200, 150, 90], sun: [240, 220, 190] },
    { sky1: [210, 130, 90], sky2: [255, 220, 180], land: [120, 92, 60], land2: [80, 60, 44], accent: [90, 60, 44], sun: [255, 210, 150] },
  ];
  const pal = palettes[Math.floor(rng() * palettes.length)];

  const skyTop = hex(pal.sky1);
  const skyBot = hex(pal.sky2);
  const landA = hex(pal.land);
  const landB = hex(pal.land2);
  const sunCol = hex(pal.sun);

  const hasCity = /city|town|building|tower|urban/.test(prompt);
  const hasWater = /water|river|sea|ocean|lake/.test(prompt);
  const hasFire = /fire|war|battle|clash/.test(prompt);
  const hasForest = /forest|tree|jungle|wood/.test(prompt);
  const nChars = /char_00|leader|storyteller|person|man|woman|people|crowd/.test(prompt) ? 1 + Math.floor(rng() * 2) : 0;

  const sunR = Math.min(w, h) * 0.09;
  const sunX = w * (0.72 + rng() * 0.2);
  const sunY = h * (0.2 + rng() * 0.15);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
  parts.push(`<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="100%" stop-color="${skyBot}"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${sunCol}" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="${sunCol}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${sunCol}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.8 0.8 0.8 0 0"/></filter>
  </defs>`);

  parts.push(`<rect width="${w}" height="${h}" fill="url(#sky)"/>`);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${sunR * 2.4}" fill="url(#sun)"/>`);

  if (hasFire) {
    // Dramatic red glow
    parts.push(`<circle cx="${w / 2}" cy="${h * 0.55}" r="${Math.min(w, h) * 0.4}" fill="#ff5a3c" opacity="0.18"/>`);
  }

  // Distant hills
  const hillY = h * 0.62;
  for (let i = 0; i < 3; i++) {
    const baseY = hillY + i * h * 0.06;
    const amp = h * 0.12;
    parts.push(
      `<path d="M0 ${baseY + amp} Q ${w * 0.25} ${baseY - amp} ${w * 0.5} ${baseY} T ${w} ${baseY + amp} L ${w} ${h} L 0 ${h} Z" fill="${i % 2 ? landB : landA}" opacity="${0.85 - i * 0.18}"/>`
    );
  }

  if (hasCity) {
    // Skyline silhouette
    let x = 0;
    let city = "";
    while (x < w) {
      const bw = w * (0.05 + rng() * 0.06);
      const bh = h * (0.12 + rng() * 0.25);
      city += `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" rx="${bw * 0.08}"/>`;
      x += bw + w * 0.01;
    }
    parts.push(`<g fill="${landB}" opacity="0.95">${city}</g>`);
  }

  if (hasForest) {
    // Tree silhouettes
    let tree = "";
    for (let i = 0; i < 12; i++) {
      const tx = rng() * w;
      const tH = h * (0.1 + rng() * 0.12);
      const tW = tH * 0.7;
      const ty = h * 0.58 - tH;
      tree += `<ellipse cx="${tx}" cy="${ty}" rx="${tW}" ry="${tH}" fill="${landB}"/>`;
    }
    parts.push(`<g>${tree}</g>`);
  }

  if (hasWater) {
    const wy = h * 0.66;
    parts.push(`<rect x="0" y="${wy}" width="${w}" height="${h - wy}" fill="#5c86a8" opacity="0.7"/>`);
    for (let i = 0; i < 6; i++) {
      const y = wy + h * (0.04 + i * 0.035);
      parts.push(`<rect x="${w * (0.1 + rng() * 0.4)}" y="${y}" width="${w * 0.3}" height="4" rx="2" fill="#ffffff" opacity="0.25"/>`);
    }
  }

  // Character silhouettes
  if (nChars > 0) {
    let chars = "";
    for (let i = 0; i < nChars; i++) {
      const cx = w * (0.3 + i * 0.28 + rng() * 0.08);
      const baseY = hasWater ? h * 0.66 : h * 0.6;
      const ch = h * 0.16;
      chars += `
        <ellipse cx="${cx}" cy="${baseY - ch * 0.72}" rx="${ch * 0.34}" ry="${ch * 0.36}" fill="#2c2a33"/>
        <path d="M${cx - ch * 0.3} ${baseY} L${cx - ch * 0.32} ${baseY - ch * 0.55} Q${cx} ${baseY - ch * 0.85} ${cx + ch * 0.32} ${baseY - ch * 0.55} L${cx + ch * 0.3} ${baseY} Z" fill="#2c2a33"/>
        <rect x="${cx - ch * 0.26}" y="${baseY - ch * 0.5}" width="${ch * 0.52}" height="${ch * 0.72}" rx="${ch * 0.16}" fill="#3a3743"/>`;
    }
    parts.push(`<g>${chars}</g>`);
  }

  // Foreground
  parts.push(`<rect x="0" y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="${mixColor(landB)}" opacity="0.9"/>`);
  parts.push(`<rect x="0" y="${h * 0.82}" width="${w}" height="6" fill="${landA}" opacity="0.6"/>`);

  // Grain + vignette
  parts.push(`<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.08"/>`);
  parts.push(`<rect width="${w}" height="${h}" fill="url(#vignette)"/>`);

  parts.push(`</svg>`);
  return parts.join("\n");
}

function mixColor(hexIn: string): string {
  return hexIn;
}

export class MockImageProvider implements ImageProvider {
  name = "Mock Image (procedural SVG)";
  kind = "mock";

  async generate(p: ImageGenParams): Promise<ImageGenResult> {
    const seed = p.seed ?? Math.floor(Math.random() * 1000000);
    const { w, h } = ratioDim(p.aspectRatio || "16:9");
    const svg = buildSvg(p, w, h);
    // Rasterize at a reasonable resolution for rendering
    const sharp = (await import("sharp")).default;
    const data = await sharp(Buffer.from(svg)).png().toBuffer();
    return { data, contentType: "image/png", seed };
  }

  async upscale(data: Buffer, contentType: string): Promise<ImageGenResult> {
    const sharp = (await import("sharp")).default;
    const img = sharp(data);
    const meta = await img.metadata();
    const scale = meta.width && meta.width < 3000 ? 2 : 1;
    const out = await img
      .resize({ width: (meta.width ?? 1024) * scale, height: (meta.height ?? 576) * scale })
      .png()
      .toBuffer();
    return { data: out, contentType, seed: Math.floor(Math.random() * 1000000) };
  }

  async testConnection() {
    return { ok: true, message: "Mock image provider available (offline, generates placeholder art)" };
  }
}
