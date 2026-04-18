import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultantForm } from "../../../../components/admin/ConsultantForm";
import { listConsultants } from "../../../../lib/admin-service";

export const metadata = {
  title: "编辑顾问 | 管理员工作台"
};

export const dynamic = "force-dynamic";

export default async function AdminConsultantDetailPage({ params }) {
  const { consultantId } = await params;
  const consultants = await listConsultants();
  const consultant = consultants.find((item) => item.id === consultantId);

  if (!consultant) {
    notFound();
  }

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>编辑顾问</h1>
          <p className="hero-text">更新顾问资料与状态，停用前请确保完成进行中案例转派。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/consultants">
              返回顾问列表
            </Link>
            <Link className="secondary-button" href="/admin/cases">
              前往 Case 总览
            </Link>
          </div>
        </div>
      </section>

      <ConsultantForm consultant={consultant} mode="edit" />
    </main>
  );
}
