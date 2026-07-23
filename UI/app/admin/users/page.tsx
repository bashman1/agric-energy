"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getUsers } from "@/lib/data/admin";
import UsersClient from "./UsersClient";

export default function AdminUsersPage() {
  return (
    <AdminDataPage title="Users" load={() => getUsers()}>
      {(users, reload) => {
      return <UsersClient users={users} onChanged={reload} />;
      }}
    </AdminDataPage>
  );
}
