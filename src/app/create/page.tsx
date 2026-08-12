import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { CreateWizard } from "@/components/create/create-wizard";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <CreateWizard />
    </AppShell>
  );
}
