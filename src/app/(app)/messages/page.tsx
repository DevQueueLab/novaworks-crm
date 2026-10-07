import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";

export default async function MessagesPage() {
  await requireUser();
  redirect("/messages/general");
}
