"use client";

import { useState } from "react";
import { apiPath } from "@/lib/paths";

const statuses = ["待派单", "已派单", "顾问已接收", "跟进中", "已转化", "暂不跟进", "回流公海", "已关闭"];
const v2FlowStatuses = [
  ["report_viewed", "报告已查看"],
  ["consult_intent_submitted", "咨询意向已提交"],
  ["admin_following", "管理员跟进中"],
  ["awaiting_user_info", "待补资料"],
  ["consult_ready_for_assignment", "可转顾问"],
  ["consult_assigned", "已转顾问"],
  ["follow_up", "顾问跟进中"],
  ["nurturing", "进入培育池"],
  ["closed", "成交关闭"]
];
const adminFlowStatuses = [
  "report_viewed",
  "consult_intent_submitted",
  "admin_following",
  "awaiting_user_info",
  "consult_ready_for_assignment",
  "consult_assigned",
  "nurturing",
  "closed"
];
const advisorFlowStatuses = ["consult_assigned", "follow_up", "nurturing", "closed"];
const v2FlowStatusLabelMap = Object.fromEntries(v2FlowStatuses);
const v2FlowNoteTemplates = {
  report_viewed: "用户已查看报告，等待进一步确认咨询意向。",
  consult_intent_submitted: "家长已明确咨询意向，建议尽快确认首咨时间窗口。",
  admin_following: "已建立管理员跟进任务，正在联系家长确认咨询条件。",
  awaiting_user_info: "已联系家长，等待补充关键资料后再进入下一步判断。",
  consult_ready_for_assignment: "关键信息已齐备，案例满足转顾问条件，建议安排顾问接手。",
  consult_assigned: "已完成顾问分配，后续由顾问推进首咨与行动计划。",
  follow_up: "顾问已接单并进入持续跟进阶段。",
  nurturing: "当前不进入正式咨询，已转入培育池并安排后续触达节奏。",
  closed: "案例已成交关闭，后续如用户有新需求可重新激活。"
};
const intentLevels = [
  ["high", "高意愿"],
  ["medium", "中意愿"],
  ["low", "低意愿"]
];
const targetTimelineOptions = [
  ["this_semester", "这学期"],
  ["sep_intake", "今年 9 月"],
  ["next_year", "明年及以后"],
  ["uncertain", "尚不确定"]
];
const budgetLevelOptions = [
  ["local_oriented", "本地导向预算"],
  ["medium_private", "中等私立/直资预算"],
  ["international", "国际学校预算"],
  ["unspecified", "暂未明确"]
];
const consultFocusOptions = [
  ["school_matching", "选校匹配"],
  ["pathway_logic", "路径判断"],
  ["english_gap", "英文衔接"],
  ["interview_prep", "面试准备"],
  ["logistics_visa", "手续与证件"],
  ["comprehensive", "综合判断"]
];
const missingInfoOptions = [
  ["academic_reports", "成绩单"],
  ["standardized_scores", "标准化成绩"],
  ["identity_proof", "身份证明"],
  ["address_proof", "住址证明"]
];
const slaStatusOptions = [
  ["in_progress", "进行中"],
  ["met", "已达标"],
  ["violated", "已超时"]
];
const closeReasonOptions = [
  ["completed_plan", "已完成阶段目标"],
  ["paused_by_user", "用户暂缓推进"],
  ["converted_other_service", "已转入其他服务"],
  ["not_fit", "当前不匹配"],
  ["other", "其他"]
];

function formatDatetimeLocalInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoStringOrEmpty(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function toggleArrayValue(currentValues, nextValue) {
  const source = Array.isArray(currentValues) ? currentValues : [];
  return source.includes(nextValue) ? source.filter((item) => item !== nextValue) : [...source, nextValue];
}

function resolveFlowStatuses(workspace, currentStatus) {
  const allowList = workspace === "admin" ? adminFlowStatuses : advisorFlowStatuses;
  const scoped = v2FlowStatuses.filter(([key]) => allowList.includes(key));

  if (!currentStatus || scoped.some(([key]) => key === currentStatus)) {
    return scoped;
  }

  const fallbackLabel = v2FlowStatusLabelMap[currentStatus] || currentStatus;
  return [[currentStatus, fallbackLabel], ...scoped];
}

export function LeadWorkbench({ lead, consultants, workspace = "advisor" }) {
  const initialV2Status = lead.caseRecord?.status || lead.adminFollowUpRecord?.status || "report_viewed";
  const isAdminWorkspace = workspace === "admin";
  const flowStatuses = resolveFlowStatuses(workspace, initialV2Status);
  const initialRecord = lead.adminFollowUpRecord || {};
  const initialConsultationSummary = lead.caseRecord?.consultationSummary || {};
  const initialPostConsultation = lead.caseRecord?.postConsultation || {};
  const initialClosure = lead.caseRecord?.closure || {};
  const initialNurturing = lead.caseRecord?.nurturing || {};
  const [status, setStatus] = useState(lead.status);
  const [v2Status, setV2Status] = useState(initialV2Status);
  const [assignedConsultantId, setAssignedConsultantId] = useState(lead.assignedConsultantId ?? "");
  const [intentLevel, setIntentLevel] = useState(initialRecord.intentLevel || "medium");
  const [targetTimeline, setTargetTimeline] = useState(initialRecord.targetTimeline || "uncertain");
  const [budgetLevel, setBudgetLevel] = useState(initialRecord.budgetLevel || "unspecified");
  const [consultFocus, setConsultFocus] = useState(Array.isArray(initialRecord.consultFocus) ? initialRecord.consultFocus : []);
  const [missingInfo, setMissingInfo] = useState(Array.isArray(initialRecord.missingInfo) ? initialRecord.missingInfo : []);
  const [handoffSummary, setHandoffSummary] = useState(initialRecord.handoffSummary || "");
  const [adminInternalNotes, setAdminInternalNotes] = useState(initialRecord.adminInternalNotes || "");
  const [slaStatus, setSlaStatus] = useState(initialRecord.slaStatus || "in_progress");
  const [firstContactAt, setFirstContactAt] = useState(formatDatetimeLocalInput(initialRecord.firstContactAt));
  const [consultationScheduledAt, setConsultationScheduledAt] = useState(
    formatDatetimeLocalInput(lead.caseRecord?.consultationScheduledAt)
  );
  const [consultationFinalPath, setConsultationFinalPath] = useState(initialConsultationSummary.finalPath || "");
  const [consultationSchoolBand, setConsultationSchoolBand] = useState(initialConsultationSummary.schoolBand || "");
  const [consultationRiskActions, setConsultationRiskActions] = useState(initialConsultationSummary.riskActions || "");
  const [consultationNextAction, setConsultationNextAction] = useState(initialConsultationSummary.nextAction || "");
  const [consultationSummaryNote, setConsultationSummaryNote] = useState(initialConsultationSummary.consultantNote || "");
  const [followUpSummary, setFollowUpSummary] = useState(initialPostConsultation.summary || "");
  const [followUpNextStep, setFollowUpNextStep] = useState(initialPostConsultation.nextStep || "");
  const [followUpOwner, setFollowUpOwner] = useState(initialPostConsultation.owner || "");
  const [closeReason, setCloseReason] = useState(initialClosure.reason || "");
  const [closeNote, setCloseNote] = useState(initialClosure.note || "");
  const [nurturingReason, setNurturingReason] = useState(initialNurturing.reason || "");
  const [nurturingNextAction, setNurturingNextAction] = useState(initialNurturing.nextAction || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(payload, successMessage) {
    setSaving(true);
    setMessage("");

    try {
      const endpoint = isAdminWorkspace ? `/api/admin/cases/${lead.id}` : `/api/advisor/cases/${lead.id}`;
      const response = await fetch(apiPath(endpoint), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      setMessage(successMessage);
      window.location.reload();
    } catch {
      setSaving(false);
      setMessage("保存失败，请稍后重试。");
    }
  }

  function applyV2Template(statusKey) {
    const template = v2FlowNoteTemplates[statusKey];

    if (!template) {
      return;
    }

    setNote((current) => {
      if (!current.trim()) {
        return template;
      }

      if (current.includes(template)) {
        return current;
      }

      return `${current}\n${template}`;
    });
  }

  function hasCloseReasonReady() {
    return Boolean(closeReason.trim());
  }

  function hasNurturingReady() {
    return Boolean(nurturingReason.trim() && nurturingNextAction.trim());
  }

  return (
    <div className="workbench-grid">
      <section className="card advisor-action-card">
        <p className="eyebrow">V2 Flow</p>
        <h3>{isAdminWorkspace ? "管理员先完成筛选与交接，再进入顾问阶段。" : "顾问按咨询交付节奏推进案例。"}</h3>
        <p className="inline-note">当前 V2 状态：{v2FlowStatusLabelMap[v2Status] || v2Status}</p>
        <div className="option-grid">
          {flowStatuses.map(([key, label]) => (
            <button
              className={v2Status === key ? "option-chip active" : "option-chip"}
              key={key}
              type="button"
              disabled={saving}
              onClick={() => {
                if (key === "closed" && !hasCloseReasonReady()) {
                  setMessage("请先填写成交结论，再标记成交关闭。");
                  return;
                }

                if (key === "nurturing" && !hasNurturingReady()) {
                  setMessage("请先填写未成交原因和后续培育动作，再转入资源库。");
                  return;
                }

                setV2Status(key);
                applyV2Template(key);
                save(
                  {
                    v2Status: key,
                    consultationScheduledAt: toIsoStringOrEmpty(consultationScheduledAt),
                    followUpSummary,
                    followUpNextStep,
                    followUpOwner,
                    closeReason,
                    closeNote,
                    nurturingReason,
                    nurturingNextAction
                  },
                  `V2 状态已更新为「${label}」。`
                );
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="inline-note">点选状态时会自动填充对应备注模板，你可在下方继续补充后保存跟进。</p>
      </section>

      {isAdminWorkspace ? (
        <section className="card advisor-action-card">
          <p className="eyebrow">Admin Qualification</p>
          <h3>用结构化字段把案例筛选结论沉淀下来。</h3>
          <div className="control-stack">
            <label className="field-block">
              <span className="field-label">咨询意愿等级</span>
              <select className="select-input" value={intentLevel} onChange={(event) => setIntentLevel(event.target.value)}>
                {intentLevels.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">推进时间判断</span>
              <select className="select-input" value={targetTimeline} onChange={(event) => setTargetTimeline(event.target.value)}>
                {targetTimelineOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">预算接受度</span>
              <select className="select-input" value={budgetLevel} onChange={(event) => setBudgetLevel(event.target.value)}>
                {budgetLevelOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">咨询重点（可多选）</span>
              <div className="option-grid">
                {consultFocusOptions.map(([value, label]) => (
                  <button
                    className={consultFocus.includes(value) ? "option-chip active" : "option-chip"}
                    key={value}
                    type="button"
                    onClick={() => setConsultFocus((current) => toggleArrayValue(current, value))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">缺失资料（可多选）</span>
              <div className="option-grid">
                {missingInfoOptions.map(([value, label]) => (
                  <button
                    className={missingInfo.includes(value) ? "option-chip active" : "option-chip"}
                    key={value}
                    type="button"
                    onClick={() => setMissingInfo((current) => toggleArrayValue(current, value))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <label className="field-block">
              <span className="field-label">交接摘要（给顾问）</span>
              <textarea
                className="text-area"
                rows={4}
                placeholder="简要说明用户背景、已确认信息、建议顾问优先处理的问题。"
                value={handoffSummary}
                onChange={(event) => setHandoffSummary(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">管理员内部备注（不对顾问展示）</span>
              <textarea
                className="text-area"
                rows={3}
                placeholder="记录仅管理员内部可见的信息。"
                value={adminInternalNotes}
                onChange={(event) => setAdminInternalNotes(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">首次联系时间</span>
              <input
                className="select-input"
                type="datetime-local"
                value={firstContactAt}
                onChange={(event) => setFirstContactAt(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">SLA 状态</span>
              <select className="select-input" value={slaStatus} onChange={(event) => setSlaStatus(event.target.value)}>
                {slaStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="secondary-button"
              disabled={saving}
              type="button"
              onClick={() =>
                save(
                  {
                    intentLevel,
                    targetTimeline,
                    budgetLevel,
                    consultFocus,
                    missingInfo,
                    handoffSummary,
                    adminInternalNotes,
                    slaStatus,
                    firstContactAt: toIsoStringOrEmpty(firstContactAt),
                    markQualified: ["consult_ready_for_assignment", "consult_assigned", "follow_up", "closed"].includes(v2Status)
                  },
                  "管理员跟进字段已保存。"
                )
              }
            >
              保存管理员跟进字段
            </button>
          </div>
        </section>
      ) : null}

      {!isAdminWorkspace ? (
        <section className="card advisor-action-card">
          <p className="eyebrow">Consultation Output</p>
          <h3>沉淀关键判断，供后续跟进与收口使用。</h3>
          <div className="control-stack">
            <label className="field-block">
              <span className="field-label">咨询时间（可选）</span>
              <input
                className="select-input"
                type="datetime-local"
                value={consultationScheduledAt}
                onChange={(event) => setConsultationScheduledAt(event.target.value)}
              />
            </label>

            <label className="field-block">
              <span className="field-label">最终路径建议（必填）</span>
              <input
                className="select-input"
                type="text"
                value={consultationFinalPath}
                onChange={(event) => setConsultationFinalPath(event.target.value)}
                placeholder="例如：先走双语过渡 + 次年申请目标校。"
              />
            </label>

            <label className="field-block">
              <span className="field-label">目标学校层级</span>
              <input
                className="select-input"
                type="text"
                value={consultationSchoolBand}
                onChange={(event) => setConsultationSchoolBand(event.target.value)}
                placeholder="例如：Band 2-1 / 中高梯队国际学校。"
              />
            </label>

            <label className="field-block">
              <span className="field-label">风险控制动作</span>
              <textarea
                className="text-area"
                rows={3}
                value={consultationRiskActions}
                onChange={(event) => setConsultationRiskActions(event.target.value)}
                placeholder="例如：先补英语评估，2周内完成衔接计划。"
              />
            </label>

            <label className="field-block">
              <span className="field-label">3个月第一步动作（必填）</span>
              <textarea
                className="text-area"
                rows={3}
                value={consultationNextAction}
                onChange={(event) => setConsultationNextAction(event.target.value)}
                placeholder="例如：本周完成学校清单 + 资料准备清单。"
              />
            </label>

            <label className="field-block">
              <span className="field-label">顾问补充说明</span>
              <textarea
                className="text-area"
                rows={3}
                value={consultationSummaryNote}
                onChange={(event) => setConsultationSummaryNote(event.target.value)}
                placeholder="记录会中关键决策点和家长反馈。"
              />
            </label>

            <button
              className="secondary-button"
              disabled={saving}
              type="button"
              onClick={() =>
                save(
                  {
                    consultationScheduledAt: toIsoStringOrEmpty(consultationScheduledAt),
                    consultationFinalPath,
                    consultationSchoolBand,
                    consultationRiskActions,
                    consultationNextAction,
                    consultationSummaryNote
                  },
                  "咨询结论已保存。"
                )
              }
            >
              保存咨询结论
            </button>
          </div>
        </section>
      ) : null}

      <section className="card advisor-action-card">
        <p className="eyebrow">Outcome</p>
        <h3>{isAdminWorkspace ? "用于补充收口字段与状态决策。" : "跟进结果决定案例收口方向。"} </h3>
        <div className="control-stack">
          <label className="field-block">
            <span className="field-label">跟进摘要</span>
            <textarea
              className="text-area"
              rows={3}
              value={followUpSummary}
              onChange={(event) => setFollowUpSummary(event.target.value)}
              placeholder="例如：家长已确认下一步节奏，等待材料齐备后执行。"
            />
          </label>

          <label className="field-block">
            <span className="field-label">下一步动作</span>
            <textarea
              className="text-area"
              rows={3}
              value={followUpNextStep}
              onChange={(event) => setFollowUpNextStep(event.target.value)}
              placeholder="例如：下周二前提交资料，周四复盘。"
            />
          </label>

          <label className="field-block">
            <span className="field-label">跟进责任人</span>
            <input
              className="select-input"
              type="text"
              value={followUpOwner}
              onChange={(event) => setFollowUpOwner(event.target.value)}
              placeholder="例如：顾问 Ryan / 管理员 Alice"
            />
          </label>

          <label className="field-block">
            <span className="field-label">成交结论（标记 closed 必填）</span>
            <select className="select-input" value={closeReason} onChange={(event) => setCloseReason(event.target.value)}>
              <option value="">请选择成交结论</option>
              {closeReasonOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">成交备注</span>
            <textarea
              className="text-area"
              rows={3}
              value={closeNote}
              onChange={(event) => setCloseNote(event.target.value)}
              placeholder="补充关闭背景，便于后续复盘。"
            />
          </label>

          <label className="field-block">
            <span className="field-label">未成交原因（标记 nurturing 必填）</span>
            <textarea
              className="text-area"
              rows={3}
              value={nurturingReason}
              onChange={(event) => setNurturingReason(event.target.value)}
              placeholder="例如：预算窗口未匹配/家庭决策延后。"
            />
          </label>

          <label className="field-block">
            <span className="field-label">后续培育动作（标记 nurturing 必填）</span>
            <textarea
              className="text-area"
              rows={3}
              value={nurturingNextAction}
              onChange={(event) => setNurturingNextAction(event.target.value)}
              placeholder="例如：3 周后回访，补充学校梯队调整建议。"
            />
          </label>

          <button
            className="secondary-button"
            disabled={saving}
            type="button"
            onClick={() =>
              save(
                {
                  followUpSummary,
                  followUpNextStep,
                  followUpOwner,
                  closeReason,
                  closeNote,
                  nurturingReason,
                  nurturingNextAction
                },
                "收口信息已保存。"
              )
            }
          >
            保存收口信息
          </button>
        </div>
      </section>

      {isAdminWorkspace ? (
        <section className="card advisor-action-card">
          <p className="eyebrow">Assignment Control</p>
          <h3>先确认状态与顾问归属。</h3>
          <div className="control-stack">
            <label className="field-block">
              <span className="field-label">线索状态</span>
              <select className="select-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">指派顾问</span>
              <select
                className="select-input"
                value={assignedConsultantId}
                onChange={(event) => setAssignedConsultantId(event.target.value)}
              >
                <option value="">暂不指派</option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name} · {consultant.focusLabel}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="primary-button"
              disabled={saving}
              type="button"
              onClick={() =>
                save(
                  {
                    status,
                    assignedConsultantId
                  },
                  "状态与顾问分配已更新。"
                )
              }
            >
              保存派单与状态
            </button>
          </div>
        </section>
      ) : null}

      <section className="card advisor-action-card">
        <p className="eyebrow">Follow-Up Log</p>
        <h3>把这次沟通里真正影响转化的信息留下来。</h3>
        <label className="field-block">
          <span className="field-label">新增跟进备注</span>
          <textarea
            className="text-area"
            rows={5}
            placeholder="例如：已在今晚 8 点完成首咨，家长重点关心时间窗口和预算。"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          disabled={saving || !note.trim()}
          type="button"
          onClick={() =>
            save(
              {
                followUpAuthor: isAdminWorkspace ? "管理员" : lead.assignment?.consultantName || "顾问",
                followUpNote: note
              },
              "跟进记录已添加并同步更新。"
            )
          }
        >
          保存跟进
        </button>
        {message ? <p className="inline-message">{message}</p> : null}
      </section>
    </div>
  );
}
