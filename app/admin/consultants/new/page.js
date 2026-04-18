import Link from "next/link";
import { ConsultantForm } from "../../../../components/admin/ConsultantForm";

export const metadata = {
  title: "新增顾问 | 管理员工作台"
};

export default function AdminConsultantNewPage() {
  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>新增顾问</h1>
          <p className="hero-text">创建顾问账号基础资料，后续可在详情页继续维护。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/consultants">
              返回顾问列表
            </Link>
          </div>
        </div>
      </section>

      <ConsultantForm mode="create" />
    </main>
  );
}
