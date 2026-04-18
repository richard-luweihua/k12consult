import Link from "next/link";
import { AdminCaseAssignForm } from "../../../components/admin/AdminCaseAssignForm";
import { listAdminCases } from "../../../lib/admin-service";

const v2StatusOptions = [
  ["all", "全部状态"],
  ["report_viewed", "报告已查看"],
  ["consult_intent_submitted", "咨询意向已提交"],
  ["admin_following", "管理员跟进中"],
  ["awaiting_user_info", "待补资料"],
  ["consult_ready_for_assignment", "可转顾问"],
  ["consult_assigned", "已转顾问"],
  ["follow_up", "顾问跟进中"],
  ["nurturing", "资源库"],
  ["closed", "成交关闭"]
];

function readQuery(searchParams, key) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export const metadata = {
  title: "Case 总览与指派 | 管理员工作台"
};

export const dynamic = "force-dynamic";

export default async function AdminCasesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const filters = {
    v2Status: readQuery(resolvedSearchParams, "v2Status"),
    intentLevel: readQuery(resolvedSearchParams, "intentLevel"),
    budgetLevel: readQuery(resolvedSearchParams, "budgetLevel"),
    consultantId: readQuery(resolvedSearchParams, "consultantId"),
    assigned: readQuery(resolvedSearchParams, "assigned"),
    keyword: readQuery(resolvedSearchParams, "keyword")
  };
  const { leads, consultants } = await listAdminCases(filters);
  const selectedStatus = filters.v2Status || "all";
  const selectedAssigned = filters.assigned || "";

  return (
    <main className="page-shell home-shell">
      <section className="hero hero--compact">
        <div className="hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>Case 总览与指派中心</h1>
          <p className="hero-text">统一查看全部案例，按状态筛选并快速指派顾问。</p>
          <div className="hero-actions">
            <Link className="secondary-button" href="/admin/workbench">
              返回管理工作台
            </Link>
            <Link className="secondary-button" href="/admin/consultants">
              管理顾问
            </Link>
          </div>
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>筛选案例</h2>
          </div>
          <span className="inline-note">筛选后共 {leads.length} 条</span>
        </div>
        <form className="auth-form" method="get">
          <label className="field-block">
            <span className="field-label">关键词</span>
            <input className="text-input" defaultValue={filters.keyword} name="keyword" placeholder="家长、学生、案例 ID" type="text" />
          </label>

          <label className="field-block">
            <span className="field-label">状态</span>
            <select className="select-input" defaultValue={selectedStatus} name="v2Status">
              {v2StatusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">是否已指派</span>
            <select className="select-input" defaultValue={selectedAssigned} name="assigned">
              <option value="">全部</option>
              <option value="true">已指派</option>
              <option value="false">未指派</option>
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">顾问</span>
            <select className="select-input" defaultValue={filters.consultantId} name="consultantId">
              <option value="">全部顾问</option>
              {consultants.map((consultant) => (
                <option key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </option>
              ))}
            </select>
          </label>

          <div className="hero-actions">
            <button className="primary-button" type="submit">
              应用筛选
            </button>
            <Link className="secondary-button" href="/admin/cases">
              重置
            </Link>
          </div>
        </form>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Case Queue</p>
            <h2>案例列表</h2>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="empty-state">
            <p>当前筛选下没有案例。</p>
          </div>
        ) : (
          <div className="lead-table">
            <div className="lead-row lead-row--head">
              <span>家长 / 学生</span>
              <span>状态</span>
              <span>咨询意愿</span>
              <span>预算</span>
              <span>当前顾问</span>
              <span>指派操作</span>
              <span>最近更新</span>
              <span>操作</span>
            </div>

            {leads.map((lead) => (
              <div className="lead-row" key={lead.id}>
                <span>
                  {lead.answers?.contactName || "未填写"}
                  <small>{lead.answers?.studentName || "未填写"}</small>
                </span>
                <span>
                  {lead.v2Status}
                  <small>{lead.status}</small>
                </span>
                <span>{lead.adminFollowUpRecord?.intentLevel || "未评估"}</span>
                <span>{lead.adminFollowUpRecord?.budgetLevel || "未评估"}</span>
                <span>
                  {lead.assignment?.consultantName || "待分配"}
                  <small>{lead.assignment?.consultantId || "未指派"}</small>
                </span>
                <span>
                  <AdminCaseAssignForm
                    consultants={consultants}
                    currentConsultantId={lead.assignment?.consultantId || lead.assignedConsultantId || ""}
                    leadId={lead.id}
                  />
                </span>
                <span>
                  {new Date(lead.updatedAt || lead.createdAt).toLocaleDateString("zh-CN")}
                  <small>{new Date(lead.updatedAt || lead.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small>
                </span>
                <Link className="secondary-button" href={`/admin/cases/${lead.id}`}>
                  进入详情
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
