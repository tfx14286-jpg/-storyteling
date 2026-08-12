import { prisma } from "../src/lib/db";

async function main() {
  const u = await prisma.user.create({
    data: { email: "t@t.com", passwordHash: "x", name: "T" },
  });
  await prisma.user.delete({ where: { id: u.id } });
  console.log("DB OK");
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
