import { redirect } from "next/navigation";

export default async function AdvisorLeadLegacyRoutePage({ params }) {
  const resolvedParams = await params;
  redirect(`/advisor/cases/${resolvedParams.leadId}`);
}
