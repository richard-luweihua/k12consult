import Link from "next/link";
import { listConsultants } from "../../../lib/admin-service";
import { listLeads, resolveCurrentV2Status } from "../../../lib/data";

function buildConsultantStats(leads) {
  const map = new Map();

  for (const lead of leads) {
    const consultantId = lead.assignment?.consultantId || lead.assignedConsultantId || lead.assigned_consultant_id;

    if (!consultantId) {
      continue;
    }

    const v2Status = resolveCurrentV2Status(lead);
    const isActiveCase = !["closed", "nurturing"].includes(v2Status);
    const updatedAt = new Date(lead.updatedAt || lead.updated_at || lead.createdAt || 0).getTime();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (!map.has(consultantId)) {
      map.set(consultantId, {
        activeCases: 0,
        todayAssigned: 0
      });
    }

    const stats = map.get(consultantId);

    if (isActiveCase) {
      stats.activeCases += 1;
    }

    if (v2Status === "consult_assigned" && updatedAt >= todayStart.getTime()) {
      stats.todayAssigned += 1;
    }
  }

  return map;
}

export const metadata = {
  title: "顾问管理 | 管理员工作台"
};

export const dynamic = "force-dynamic";

export default async function AdminConsultantsPage() {
  const [consultants, { leads }] = await Promise.all([listConsultants(), listLeads()]);
  const statsMap = buildConsultantStats(leads);

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>管理顾问</h1>
          <p className="hero-text">维护顾问资料、状态、产能，支持后续派单与转派。</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/admin/consultants/new">
              新增顾问
            </Link>
            <Link className="secondary-button" href="/admin/workbench">
              返回管理工作台
            </Link>
            <Link className="secondary-button" href="/admin/cases">
              Case 总览
            </Link>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Consultant List</p>
            <h2>顾问列表</h2>
          </div>
          <span className="inline-note">共 {consultants.length} 位</span>
        </div>

        {consultants.length === 0 ? (
          <div className="empty-state">
            <p>暂时没有顾问，请先新增。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>姓名 / 邮箱</span>
              <span>状态</span>
              <span>活跃案例数</span>
              <span>今日新增派单</span>
              <span>产能参数</span>
              <span>最近更新</span>
              <span>操作</span>
            </div>

            {consultants.map((consultant) => {
              const stats = statsMap.get(consultant.id) || { activeCases: 0, todayAssigned: 0 };
              return (
                <div className="lead-row" key={consultant.id}>
                  <span>
                    {consultant.name}
                    <small>{consultant.email || consultant.id}</small>
                  </span>
                  <span>
                    {consultant.status || "active"}
                    <small>{consultant.title || "-"}</small>
                  </span>
                  <span>{stats.activeCases}</span>
                  <span>{stats.todayAssigned}</span>
                  <span>
                    日上限 {consultant.capacityDaily ?? 0}
                    <small>活跃上限 {consultant.capacityActive ?? 0}</small>
                  </span>
                  <span>
                    {consultant.updatedAt ? new Date(consultant.updatedAt).toLocaleDateString("zh-CN") : "-"}
                    <small>{consultant.priorityWeight != null ? `权重 ${consultant.priorityWeight}` : "未设权重"}</small>
                  </span>
                  <Link className="secondary-button" href={`/admin/consultants/${consultant.id}`}>
                    编辑
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
