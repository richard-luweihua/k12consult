"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPath } from "@/lib/paths";

function toCsv(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return typeof value === "string" ? value : "";
}

export function ConsultantForm({ mode = "create", consultant = null }) {
  const router = useRouter();
  const [name, setName] = useState(consultant?.name || "");
  const [email, setEmail] = useState(consultant?.email || "");
  const [mobile, setMobile] = useState(consultant?.mobile || "");
  const [title, setTitle] = useState(consultant?.title || "");
  const [focusLabel, setFocusLabel] = useState(consultant?.focusLabel || "");
  const [specialties, setSpecialties] = useState(toCsv(consultant?.specialties));
  const [gradeFocus, setGradeFocus] = useState(toCsv(consultant?.gradeFocus));
  const [capacityDaily, setCapacityDaily] = useState(String(consultant?.capacityDaily ?? 0));
  const [capacityActive, setCapacityActive] = useState(String(consultant?.capacityActive ?? 0));
  const [status, setStatus] = useState(consultant?.status || "active");
  const [priorityWeight, setPriorityWeight] = useState(String(consultant?.priorityWeight ?? 50));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const titleText = useMemo(() => (mode === "create" ? "新增顾问" : "编辑顾问"), [mode]);

  function buildPayload() {
    return {
      name,
      email,
      mobile,
      title,
      focusLabel,
      specialties,
      gradeFocus,
      capacityDaily: Number.parseInt(capacityDaily, 10),
      capacityActive: Number.parseInt(capacityActive, 10),
      status,
      priorityWeight: Number.parseInt(priorityWeight, 10)
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const target = mode === "create" ? "/api/admin/consultants" : `/api/admin/consultants/${consultant.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(apiPath(target), {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPayload())
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "保存失败");
      }

      setMessage("保存成功。");
      router.push("/admin/consultants");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!consultant?.id) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(apiPath(`/api/admin/consultants/${consultant.id}`), {
        method: "DELETE"
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "停用失败");
      }

      setMessage("顾问已停用。");
      router.push("/admin/consultants");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "停用失败");
      setSaving(false);
    }
  }

  return (
    <section className="card table-card">
      <div className="table-header">
        <div>
          <p className="eyebrow">Consultant Management</p>
          <h2>{titleText}</h2>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-block">
          <span className="field-label">姓名</span>
          <input className="text-input" onChange={(event) => setName(event.target.value)} required type="text" value={name} />
        </label>

        <label className="field-block">
          <span className="field-label">邮箱</span>
          <input className="text-input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>

        <label className="field-block">
          <span className="field-label">手机号</span>
          <input className="text-input" onChange={(event) => setMobile(event.target.value)} type="text" value={mobile} />
        </label>

        <label className="field-block">
          <span className="field-label">职称</span>
          <input className="text-input" onChange={(event) => setTitle(event.target.value)} type="text" value={title} />
        </label>

        <label className="field-block">
          <span className="field-label">顾问标签（前台展示）</span>
          <input
            className="text-input"
            onChange={(event) => setFocusLabel(event.target.value)}
            placeholder="例如：国际学校 / 英语规划"
            type="text"
            value={focusLabel}
          />
        </label>

        <label className="field-block">
          <span className="field-label">擅长标签（逗号分隔）</span>
          <input
            className="text-input"
            onChange={(event) => setSpecialties(event.target.value)}
            placeholder="international, conversion"
            type="text"
            value={specialties}
          />
        </label>

        <label className="field-block">
          <span className="field-label">年级覆盖（逗号分隔）</span>
          <input className="text-input" onChange={(event) => setGradeFocus(event.target.value)} placeholder="G6, G7" type="text" value={gradeFocus} />
        </label>

        <label className="field-block">
          <span className="field-label">日接单上限</span>
          <input className="text-input" min={0} onChange={(event) => setCapacityDaily(event.target.value)} type="number" value={capacityDaily} />
        </label>

        <label className="field-block">
          <span className="field-label">活跃案例上限</span>
          <input className="text-input" min={0} onChange={(event) => setCapacityActive(event.target.value)} type="number" value={capacityActive} />
        </label>

        <label className="field-block">
          <span className="field-label">优先权重（0-100）</span>
          <input className="text-input" max={100} min={0} onChange={(event) => setPriorityWeight(event.target.value)} type="number" value={priorityWeight} />
        </label>

        <label className="field-block">
          <span className="field-label">状态</span>
          <select className="select-input" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="active">active</option>
            <option value="on_leave">on_leave</option>
            <option value="inactive">inactive</option>
          </select>
        </label>

        <div className="hero-actions">
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "保存中..." : "保存顾问"}
          </button>
          {mode === "edit" ? (
            <button className="secondary-button" disabled={saving} onClick={handleDeactivate} type="button">
              停用顾问
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="inline-message">{message}</p> : null}
    </section>
  );
}
