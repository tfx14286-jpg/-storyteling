#!/bin/sh
set -e

# Terapkan skema ke database SQLite saat pertama kali dijalankan (idempoten).
# Harus berjalan sebelum aplikasi dimulai agar tabel sudah ada untuk Prisma client.
echo "==> Menerapkan skema database (prisma db push)..."
node /app/node_modules/prisma/build/index.js db push

echo "==> Memulai Next.js di 0.0.0.0:${PORT:-3000}..."
exec node /app/node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
