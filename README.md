This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on a VPS with Docker

StoryMotion uses SQLite + local file storage + ffmpeg, so it ships as a single
container that keeps everything on a persistent volume.

1. Install Docker and Docker Compose on the server.
2. Copy the project to the server (e.g. `git clone <repo>` or `scp`).
3. Create the environment file:
   ```bash
   cp .env.docker.example .env
   # edit .env if you want to enable real AI providers instead of mock mode
   ```
4. Build and start:
   ```bash
   docker compose up -d --build
   ```
5. Open `http://<server-ip>:3000`.

The SQLite database and all generated files are stored in the `storyteling_data`
volume, so they survive container restarts and redeploys.

Common commands:

```bash
docker compose logs -f storyteling   # follow logs
docker compose restart storyteling   # restart
docker compose down                  # stop (data is kept in the volume)
docker compose up -d --build         # rebuild + redeploy after code changes
```

### Enabling real AI providers (optional)

Set `AI_MODE=live` and fill in the provider keys in `.env`, then restart:

```bash
docker compose up -d --build
```

Any provider without a key automatically falls back to mock mode, so you can
mix and match.
