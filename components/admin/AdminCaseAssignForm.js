"use client";

import { useMemo, useState } from "react";
import { apiPath } from "@/lib/paths";

export function AdminCaseAssignForm({ leadId, currentConsultantId = "", consultants = [] }) {
  const [assignedConsultantId, setAssignedConsultantId] = useState(currentConsultantId || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sortedConsultants = useMemo(
    () =>
      [...consultants].sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "zh-CN")),
    [consultants]
  );

  async function handleAssign() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(apiPath(`/api/admin/cases/${leadId}/assign`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ assignedConsultantId })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "指派失败");
      }

      setMessage("指派成功，已进入顾问阶段。");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "指派失败");
      setSaving(false);
    }
  }

  return (
    <div className="field-block" style={{ gap: "8px" }}>
      <select
        className="select-input"
        disabled={saving}
        onChange={(event) => setAssignedConsultantId(event.target.value)}
        value={assignedConsultantId}
      >
        <option value="">请选择顾问</option>
        {sortedConsultants.map((consultant) => (
          <option key={consultant.id} value={consultant.id}>
            {consultant.name} {consultant.title ? `· ${consultant.title}` : ""}
          </option>
        ))}
      </select>
      <button className="secondary-button" disabled={saving || !assignedConsultantId} onClick={handleAssign} type="button">
        {saving ? "提交中..." : "指派"}
      </button>
      {message ? <small className="inline-note">{message}</small> : null}
    </div>
  );
}
