import type { Metadata } from "next";
import { getAuthToken } from "@/lib/auth/session";
import { getUsers } from "@/lib/data/admin";
import UsersClient from "./UsersClient";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const token = await getAuthToken();
  const users = await getUsers(token);
  return <UsersClient users={users} />;
}
