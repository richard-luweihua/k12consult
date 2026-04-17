"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiPath, appPath } from "@/lib/paths";
import { formSections, requiredFieldNames } from "../lib/schema";

const initialState = formSections.flatMap((section) => section.fields).reduce((acc, field) => {
  acc[field.name] = field.type === "checkbox" ? [] : "";
  return acc;
}, {});

function isFilled(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function QuestionnaireForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => {
    const done = requiredFieldNames.filter((fieldName) => isFilled(formData[fieldName])).length;
    return Math.round((done / requiredFieldNames.length) * 100);
  }, [formData]);

  function updateValue(name, value) {
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function toggleCheckboxValue(name, value) {
    setFormData((current) => {
      const existing = Array.isArray(current[name]) ? current[name] : [];
      const next = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
      return { ...current, [name]: next };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    // 检查用户是否已登录
    if (!user) {
      setError("请先登录后再提交问卷。");
      router.push(appPath("/login"));
      return;
    }

    const missing = requiredFieldNames.filter((fieldName) => !isFilled(formData[fieldName]));

    if (missing.length > 0) {
      setError("还有必填信息未完成，请先补齐后再生成结果。");
      return;
    }

    if (!isFilled(formData.mobile) && !isFilled(formData.wechat_id)) {
      setError("手机号和微信号至少填写一项，才能解锁报告。");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(apiPath("/api/intake"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id, // 添加用户ID
          tracking: {
            utmSource: searchParams.get("utm_source") || "",
            utmMedium: searchParams.get("utm_medium") || "",
            utmCampaign: searchParams.get("utm_campaign") || "",
            utmContent: searchParams.get("utm_content") || "",
            entryPath: window.location.pathname,
            landingUrl: window.location.href,
            referrer: document.referrer || ""
          }
        })
      });

      if (!response.ok) {
        throw new Error("提交失败");
      }

      const data = await response.json();

      if (!data?.submissionId) {
        throw new Error("提交成功但未返回结果ID");
      }

      router.push(appPath(`/result/${data.submissionId}/processing`));
    } catch {
      setError("系统暂时没接住这次提交，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <form className="survey-shell" onSubmit={handleSubmit}>
      <div className="survey-sidebar card">
        <p className="eyebrow">诊断进度</p>
        <h2>用一份结构化前诊，把盲目咨询变成可执行判断。</h2>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-copy">已完成 {progress}%</p>
        <ul className="survey-checklist">
          <li>预计 8-12 分钟完成</li>
          <li>生成固定模板结果页</li>
          <li>输出下一步沟通建议</li>
        </ul>
      </div>

      <div className="survey-content">
        {formSections.map((section) => (
          <section key={section.id} className="card survey-section">
            <div className="section-header">
              <p className="eyebrow">{section.title}</p>
              <p>{section.description}</p>
            </div>

            <div className="field-grid">
              {section.fields.map((field) => (
                <label className="field-block" key={field.name}>
                  <span className="field-label">
                    {field.label}
                    {field.required ? <strong> *</strong> : null}
                  </span>
                  {field.help ? <span className="field-help">{field.help}</span> : null}

                  {field.type === "text" ? (
                    <input
                      className="text-input"
                      type="text"
                      value={formData[field.name]}
                      placeholder={field.placeholder}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                    />
                  ) : null}

                  {field.type === "textarea" ? (
                    <textarea
                      className="text-area"
                      rows={4}
                      value={formData[field.name]}
                      placeholder={field.placeholder}
                      onChange={(event) => updateValue(field.name, event.target.value)}
                    />
                  ) : null}

                  {field.type === "radio" ? (
                    <div className="option-grid">
                      {field.options.map(([value, label]) => (
                        <button
                          className={formData[field.name] === value ? "option-chip active" : "option-chip"}
                          key={value}
                          type="button"
                          onClick={() => updateValue(field.name, value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {field.type === "checkbox" ? (
                    <div className="option-grid">
                      {field.options.map(([value, label]) => {
                        const selected = Array.isArray(formData[field.name]) && formData[field.name].includes(value);

                        return (
                          <button
                            className={selected ? "option-chip active" : "option-chip"}
                            key={value}
                            type="button"
                            onClick={() => toggleCheckboxValue(field.name, value)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </label>
              ))}
            </div>
          </section>
        ))}

        <div className="submit-bar card">
          <div>
            <p className="eyebrow">提交后会发生什么</p>
            <p>系统会基于问卷先跑规则，再生成 V2 诊断草稿与风险预警，便于你快速进入下一步决策。</p>
          </div>
          <div className="submit-actions">
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button large" disabled={submitting} type="submit">
              {submitting ? "正在生成结果..." : "提交前诊并查看结果"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
