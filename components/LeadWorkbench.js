"use client";

import { useState } from "react";

const statuses = ["待派单", "已派单", "顾问已接收", "跟进中", "已转化", "暂不跟进", "回流公海"];

export function LeadWorkbench({ lead, consultants }) {
  const [status, setStatus] = useState(lead.status);
  const [assignedConsultantId, setAssignedConsultantId] = useState(lead.assignedConsultantId ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(payload, successMessage) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
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

  return (
    <div className="workbench-grid">
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
                followUpAuthor: lead.assignment?.consultantName || "顾问",
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
