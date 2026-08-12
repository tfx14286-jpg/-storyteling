# StoryMotion AI

Platform pembuatan video cerita animasi dengan AI — dari satu ide menjadi video storytelling lengkap: naskah, adegan, karakter, suara, musik, dan editing ditangani otomatis oleh AI.

## Memulai (Pengembangan Lokal)

Jalankan server pengembangan:

```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
# atau
bun dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

Halaman dapat diedit melalui `src/app/page.tsx` — halaman akan ter-update otomatis saat file disimpan.

Proyek ini menggunakan [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) untuk memuat font [Geist](https://vercel.com/font) secara otomatis.

## Konfigurasi Lingkungan

File `.env` sudah tersedia untuk pengembangan lokal. Atur nilainya sesuai kebutuhan:

- `DATABASE_URL` — koneksi SQLite lokal (default `file:./dev.db`).
- `ENCRYPTION_KEY` — kunci master untuk enkripsi kunci API provider (AES-256-GCM).
- `AI_MODE=mock` → seluruh pipeline berjalan dengan provider lokal (offline, tanpa API eksternal).
- `AI_MODE=live` → menggunakan provider asli yang dikonfigurasi. Provider tanpa kunci akan otomatis kembali ke mode mock.
- `TTS_PROVIDER=windows` (dev Windows) atau `mock`.

## Men-deploy di VPS dengan Docker

StoryMotion menggunakan SQLite + penyimpanan file lokal + ffmpeg, sehingga dikemas dalam satu container yang menyimpan semuanya di volume persisten.

1. Instal Docker dan Docker Compose di server.
2. Salin proyek ke server (mis. `git clone <repo>` atau `scp`).
3. Buat file environment:
   ```bash
   cp .env.docker.example .env
   # edit .env jika ingin mengaktifkan provider AI asli, bukan mode mock
   ```
4. Build dan jalankan:
   ```bash
   docker compose up -d --build
   ```
5. Buka `http://<ip-server>:3000`.

Database SQLite dan semua file yang dihasilkan tersimpan di volume `storyteling_data`, sehingga tetap aman saat container di-restart atau di-redeploy.

Perintah yang sering dipakai:

```bash
docker compose logs -f storyteling   # ikuti log
docker compose restart storyteling   # restart
docker compose down                  # hentikan (data tetap ada di volume)
docker compose up -d --build         # build ulang + redeploy setelah perubahan kode
```

### Mengaktifkan provider AI asli (opsional)

Set `AI_MODE=live` dan isi kunci provider di `.env`, lalu restart:

```bash
docker compose up -d --build
```

Provider tanpa kunci otomatis kembali ke mode mock, sehingga Anda bisa mencampurnya.

## Deploy Gratis di Oracle Cloud (Free Tier)

Aplikasi ini butuh **disk persisten + Docker + ffmpeg**, sehingga platform PaaS gratis seperti
Render/Vercel tidak cocok (database hilang saat redeploy). Pilihan paling andal yang **gratis
selamanya** adalah Oracle Cloud **Always Free**: 4 CPU ARM + 24 GB RAM + 200 GB disk, tanpa biaya.

1. Daftar di <https://signup.cloud.oracle.com> (minta kartu hanya untuk verifikasi — **tidak ditagih**).
2. Buat instance Compute:
   - Image: **Ubuntu 24.04** (paling mudah; Oracle Linux juga didukung oleh skrip).
   - Shape: pilih **Ampere A1 (ARM)** — 4 OCPU / 24 GB RAM masuk kuota Always Free.
   - Boot volume: biarkan default.
3. Sambung via SSH, lalu jalankan **satu perintah**:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/tfx14286-jpg/-storyteling/master/deploy/setup-server.sh | sudo bash
   ```

   Skrip otomatis: install Docker + Compose → clone kode → buat `.env` dengan secret acak →
   `docker compose up -d --build`. (Menggunakan `REPO_URL`/`BRANCH`/`APP_DIR` untuk mengubah
   repo, branch, atau lokasi — mis. `sudo REPO_URL=https://github.com/anda/repo.git bash setup-server.sh`.)

4. **Buka port 3000** di Oracle Cloud (langkah yang paling sering terlupa):
   Menu → Networking → Virtual cloud networks → VCN Anda → Security Lists (atau
   Network Security Groups) → tambah Aturan Ingress: `Source 0.0.0.0/0`, TCP, port `3000`.
5. Buka `http://<IP-PUBLIK>:3000` di browser. Kalau ingin tanpa port, set `PORT=80` di `.env`
   lalu `docker compose up -d`.

Pembaruan kode setelah itu cukup jalankan ulang skrip (clone ulang + rebuild) atau:

```bash
cd /opt/storyteling && git pull && docker compose up -d --build
```

> **Keamanan:** jangan biarkan nilai `AUTH_SECRET` / `ENCRYPTION_KEY` yang lama dipakai di
> produksi — skrip di atas sudah membuat secret acak baru secara otomatis.

## Mempelajari Lebih Lanjut

- [Dokumentasi Next.js](https://nextjs.org/docs) — pelajari fitur dan API Next.js.
- [Belajar Next.js](https://nextjs.org/learn) — tutorial interaktif Next.js.
- [Repositori GitHub Next.js](https://github.com/vercel/next.js) — umpan balik dan kontribusi Anda dipersilakan!
