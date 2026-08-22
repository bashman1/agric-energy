import type { Metadata } from "next";
import TeamClient from "./TeamClient";

export const metadata: Metadata = { title: "Team" };

export default function PartnerTeamPage() {
  return <TeamClient />;
}
