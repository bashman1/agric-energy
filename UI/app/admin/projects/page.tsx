import { getAllProjects } from "@/lib/data/projects";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";
import AdminProjectsClient from "./AdminProjectsClient";


export const metadata: Metadata = { title: "Manage Projects" };

export default async function AdminProjectsPage() {
  const token = await getAuthToken();
  const projects = await getAllProjects(token);
  const sorted = [...projects].sort((a, b) => a.title.localeCompare(b.title));
  return <AdminProjectsClient projects={sorted} />;
}
