import { redirect } from "next/navigation";
import { appPath } from "../../../lib/paths";

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params?.next === "string" && params.next.startsWith("/") ? params.next : "/admin";
  const loggedOut = params?.logged_out ? "&logged_out=1" : "";

  redirect(appPath(`/advisor/login?next=${encodeURIComponent(next)}${loggedOut}`));
}
