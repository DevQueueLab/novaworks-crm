import type { Metadata } from "next";

import { CreateUserSheet } from "@/components/admin/user-form-sheet";
import { UsersTable } from "@/components/admin/users-table";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/dal";
import { listAdminUsers } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listAdminUsers();
  const deactivated = users.filter((user) => user.deactivatedAt !== null).length;

  return (
    <>
      <PageHeader
        title="Users"
        count={users.length}
        description={
          deactivated > 0
            ? `Create accounts, change roles and control who can sign in. ${deactivated} deactivated ${deactivated === 1 ? "account keeps its" : "accounts keep their"} history.`
            : "Create accounts, change roles and control who can sign in. Deactivated accounts keep their history."
        }
        actions={<CreateUserSheet />}
      />
      <UsersTable users={users} currentUserId={admin.id} />
    </>
  );
}
