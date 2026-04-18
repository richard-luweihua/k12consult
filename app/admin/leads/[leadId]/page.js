import { redirect } from "next/navigation";

export default async function AdminLeadLegacyRoutePage({ params }) {
  const resolvedParams = await params;
  redirect(`/admin/cases/${resolvedParams.leadId}`);
}
