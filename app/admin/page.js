import { redirect } from "next/navigation";

export default function AdminRouteRedirectPage() {
  redirect("/admin/workbench");
}
