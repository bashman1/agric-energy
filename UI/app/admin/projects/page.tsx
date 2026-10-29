"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getToken } from "@/lib/auth/token";
import { getAllProjects } from "@/lib/data/projects";
import AdminProjectsClient from "./AdminProjectsClient";


export default function AdminProjectsPage() {
  return (
    <AdminDataPage title="Manage Projects" load={() => getAllProjects(getToken())}>
      {(projects, reload) => {
      const sorted = [...projects].sort((a, b) => a.title.localeCompare(b.title));
      return <AdminProjectsClient projects={sorted} onChanged={reload} />;
      }}
    </AdminDataPage>
  );
}
