import type { UserRole } from "@/db/schema";

/** Plain, serializable user fields handed from the server layout to the shell. */
export type ShellUser = {
  id: string;
  code: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
};
