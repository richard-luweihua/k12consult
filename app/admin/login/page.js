import { redirect } from "next/navigation";
import { appPath } from "../../../lib/paths";

export default function LegacyAdminLoginPage() {
  redirect(appPath("/advisor/login"));
}
