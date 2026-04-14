import { redirect } from "next/navigation";

export default async function LegacyAdminLeadPage({ params }) {
  const resolvedParams = await params;
  redirect(`/advisor/leads/${resolvedParams.leadId}`);
}
