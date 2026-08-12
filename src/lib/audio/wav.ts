// Minimal WAV (PCM16 mono) generation and mixing — pure JS, no native deps.

export const SAMPLE_RATE = 44100;

export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buffer;
}

export function silence(seconds: number): Float32Array {
  return new Float32Array(Math.floor(seconds * SAMPLE_RATE));
}

export function tone(
  freq: number,
  seconds: number,
  volume = 0.4,
  attack = 0.01,
  release = 0.1
): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const a = Math.floor(attack * SAMPLE_RATE);
  const r = Math.floor(release * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    let env = 1;
    if (i < a) env = i / a;
    else if (i > n - r) env = Math.max(0, (n - i) / r);
    out[i] = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * volume * env;
  }
  return out;
}

// Simple ambient music pad: a chord with slow amplitude variation + detune.
export function ambientMusic(category: string, seconds: number): Float32Array {
  const chords: Record<string, number[]> = {
    Documentary: [220, 261.63, 329.63, 392], // A minor
    Emotional: [196, 246.94, 293.66, 392],
    Epic: [110, 164.81, 220, 329.63],
    Suspense: [110, 155.56, 233.08, 293.66],
    Funny: [523.25, 587.33, 659.25, 783.99],
    Historical: [146.83, 196, 220, 293.66],
    Cinematic: [174.61, 220, 261.63, 349.23],
  };
  const base = chords[category] || chords.Documentary;
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const voices = base.map((f, vi) => ({
    f,
    detune: (vi % 2 === 0 ? 0.4 : -0.5) * Math.random(),
    phase: Math.random() * Math.PI * 2,
  }));
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const slow = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.05 * t + Math.random());
    const swell = Math.min(1, t / 2) * Math.min(1, (seconds - t) / 2);
    let s = 0;
    for (const v of voices) {
      const f = v.f * (1 + v.detune * 0.002);
      s += Math.sin(2 * Math.PI * f * t + v.phase) * 0.4;
      s += Math.sin(2 * Math.PI * f * 2 * t + v.phase) * 0.1;
    }
    out[i] = (s / voices.length) * 0.22 * slow * Math.max(0, swell);
  }
  return out;
}

// Procedural SFX from a label.
export function sfx(label: string, seconds: number): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const l = label.toLowerCase();
  if (/bird|wind|nature/.test(l)) {
    // Chirps + wind
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      out[i] = Math.random() * 0.06 * Math.sin(2 * Math.PI * 3 * t);
      if (Math.random() < 0.0006) {
        const f = 2000 + Math.random() * 3000;
        for (let j = i; j < Math.min(n, i + SAMPLE_RATE * 0.1); j++) {
          out[j] += Math.sin(2 * Math.PI * f * ((j - i) / SAMPLE_RATE)) * 0.2 * (1 - (j - i) / (SAMPLE_RATE * 0.1));
        }
      }
    }
  } else if (/fire|crackle/.test(l)) {
    for (let i = 0; i < n; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-((i % 300) / 300) * 4);
    }
  } else if (/drum|beat|impact/.test(l)) {
    for (let i = 0; i < n; i += SAMPLE_RATE / 2) {
      const f = 90 + Math.random() * 40;
      for (let j = i; j < Math.min(n, i + SAMPLE_RATE * 0.35); j++) {
        const env = Math.exp(-((j - i) / SAMPLE_RATE) * 12);
        out[j] += Math.sin(2 * Math.PI * f * ((j - i) / SAMPLE_RATE)) * 0.5 * env;
      }
    }
  } else if (/water|river|flow/.test(l)) {
    for (let i = 0; i < n; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.1 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * (i / SAMPLE_RATE)));
    }
  } else if (/crowd|people|murmur/.test(l)) {
    for (let i = 0; i < n; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.07;
    }
  } else if (/footstep|walk/.test(l)) {
    let phase = 0;
    for (let i = 0; i < n; i++) {
      if (phase > SAMPLE_RATE * 0.5) phase = 0;
      const env = Math.exp(-(phase / SAMPLE_RATE) * 20);
      out[i] = Math.sin(2 * Math.PI * 120 * (phase / SAMPLE_RATE)) * 0.3 * env;
      phase += 1;
    }
  } else if (/paper|page/.test(l)) {
    for (let i = 0; i < n; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.12;
    }
  } else {
    // soft ambient noise
    for (let i = 0; i < n; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.03;
    }
  }
  return out;
}

// Mix tracks with individual gains and offsets (into the longest track).
export function mixTracks(tracks: { data: Float32Array; gain: number; offsetSec: number }[], duration: number): Float32Array {
  const n = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (const t of tracks) {
    const off = Math.floor(t.offsetSec * SAMPLE_RATE);
    for (let i = 0; i < t.data.length; i++) {
      const j = i + off;
      if (j >= 0 && j < n) out[j] += t.data[i] * t.gain;
    }
  }
  for (let i = 0; i < n; i++) {
    if (out[i] > 1) out[i] = 1;
    else if (out[i] < -1) out[i] = -1;
  }
  return out;
}

export function padToDuration(data: Float32Array, seconds: number): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  if (data.length >= n) return data.slice(0, n);
  const out = new Float32Array(n);
  out.set(data);
  return out;
}

export function applyFadeInOut(data: Float32Array, fadeSec = 0.5): Float32Array {
  const n = data.length;
  const f = Math.floor(fadeSec * SAMPLE_RATE);
  const out = data.slice();
  for (let i = 0; i < f && i < n; i++) {
    out[i] *= i / f;
    out[n - 1 - i] *= i / f;
  }
  return out;
}

export interface DecodedWav {
  samples: Float32Array;
  sampleRate: number;
}

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bits: number;
  dataOffset: number;
  dataSize: number;
  duration: number;
}

// Robust RIFF/WAV chunk scan. Handles non-standard headers (e.g. Windows
// System.Speech emits a WAVE_FORMAT_EXTENSIBLE fmt chunk, shifting the data
// chunk past offset 36).
export function parseWavInfo(buffer: Buffer): WavInfo {
  if (buffer.length < 12) throw new Error("Invalid WAV: file too short");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Invalid WAV: missing RIFF/WAVE header");
  }
  let fmt: { sampleRate: number; channels: number; bits: number } | null = null;
  let dataOffset = -1;
  let dataSize = 0;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && size >= 16) {
      fmt = {
        channels: buffer.readUInt16LE(offset + 8 + 2),
        sampleRate: buffer.readUInt32LE(offset + 8 + 4),
        bits: buffer.readUInt16LE(offset + 8 + 14),
      };
    } else if (id === "data") {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!fmt || dataOffset < 0) throw new Error("Invalid WAV: missing fmt or data chunk");
  const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bits / 8);
  return { ...fmt, dataOffset, dataSize, duration: bytesPerSecond > 0 ? dataSize / bytesPerSecond : 0 };
}

export function decodeWav(buffer: Buffer): DecodedWav {
  const { sampleRate, channels, bits, dataOffset, dataSize } = parseWavInfo(buffer);
  const bytesPerSample = bits / 8;
  const frames = Math.floor(dataSize / (bytesPerSample * channels));
  const samples = new Float32Array(frames);
  let offset = dataOffset;
  if (bits === 16) {
    for (let i = 0; i < frames; i++) {
      let v = 0;
      for (let c = 0; c < channels; c++) {
        const s = buffer.readInt16LE(offset) / 32768;
        offset += 2;
        v += s;
      }
      samples[i] = v / channels;
    }
  } else if (bits === 8) {
    for (let i = 0; i < frames; i++) {
      let v = 0;
      for (let c = 0; c < channels; c++) {
        const s = (buffer.readUInt8(offset) - 128) / 128;
        offset += 1;
        v += s;
      }
      samples[i] = v / channels;
    }
  } else {
    throw new Error(`Unsupported WAV bit depth: ${bits}`);
  }
  return { samples, sampleRate };
}
