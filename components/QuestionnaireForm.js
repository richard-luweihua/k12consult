"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiPath, appPath } from "@/lib/paths";
import { formSections, getFieldLabel, requiredFieldNames } from "../lib/schema";

const initialState = formSections.flatMap((section) => section.fields).reduce((acc, field) => {
  acc[field.name] = field.type === "checkbox" ? [] : "";
  return acc;
}, {});
const QUESTIONNAIRE_DRAFT_KEY = "k12_questionnaire_draft_v2";
const QUESTIONNAIRE_PENDING_SUBMIT_KEY = "k12_questionnaire_pending_submit_v2";

function isFilled(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function QuestionnaireForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [missingFieldNames, setMissingFieldNames] = useState([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const resumeMode = searchParams.get("resume") === "1";
  const missingFieldSet = useMemo(() => new Set(missingFieldNames), [missingFieldNames]);

  const progress = useMemo(() => {
    const done = requiredFieldNames.filter((fieldName) => isFilled(formData[fieldName])).length;
    return {
      done,
      total: requiredFieldNames.length,
      percent: Math.round((done / requiredFieldNames.length) * 100)
    };
  }, [formData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(QUESTIONNAIRE_DRAFT_KEY);

    if (!raw) {
      setDraftHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const next = { ...initialState };

      for (const section of formSections) {
        for (const field of section.fields) {
          const value = parsed?.[field.name];

          if (field.type === "checkbox") {
            next[field.name] = Array.isArray(value) ? value : [];
          } else if (typeof value === "string") {
            next[field.name] = value;
          }
        }
      }

      setFormData(next);
      setDraftRestored(true);
    } catch {
      window.localStorage.removeItem(QUESTIONNAIRE_DRAFT_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !draftHydrated) {
      return;
    }

    window.localStorage.setItem(QUESTIONNAIRE_DRAFT_KEY, JSON.stringify(formData));
  }, [draftHydrated, formData]);

  useEffect(() => {
    if (missingFieldNames.length === 0) {
      return;
    }

    const nextMissing = missingFieldNames.filter((fieldName) => !isFilled(formData[fieldName]));

    if (nextMissing.length !== missingFieldNames.length) {
      setMissingFieldNames(nextMissing);
    }
  }, [formData, missingFieldNames]);

  function scrollToField(fieldName) {
    if (typeof window === "undefined" || !fieldName) {
      return;
    }

    const fieldNode = document.querySelector(`[data-field-name="${fieldName}"]`);

    if (!fieldNode) {
      return;
    }

    fieldNode.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

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

    const missing = requiredFieldNames.filter((fieldName) => !isFilled(formData[fieldName]));

    if (missing.length > 0) {
      setMissingFieldNames(missing);
      setError(`仍有 ${missing.length} 项必填信息未完成，请先补齐后再生成结果。`);
      requestAnimationFrame(() => scrollToField(missing[0]));
      return;
    }

    setMissingFieldNames([]);

    if (authLoading) {
      setError("正在确认登录状态，请稍后再试。");
      return;
    }

    if (!user) {
      setError("请先登录，登录后会自动继续提交并生成报告。");

      if (typeof window !== "undefined") {
        const tracking = {
          utmSource: searchParams.get("utm_source") || "",
          utmMedium: searchParams.get("utm_medium") || "",
          utmCampaign: searchParams.get("utm_campaign") || "",
          utmContent: searchParams.get("utm_content") || "",
          entryPath: window.location.pathname,
          landingUrl: window.location.href,
          referrer: document.referrer || ""
        };

        window.localStorage.setItem(QUESTIONNAIRE_DRAFT_KEY, JSON.stringify(formData));
        window.localStorage.setItem(
          QUESTIONNAIRE_PENDING_SUBMIT_KEY,
          JSON.stringify({
            answers: formData,
            tracking,
            createdAt: new Date().toISOString()
          })
        );
      }

      const nextQuery = new URLSearchParams(searchParams.toString());
      nextQuery.set("resume", "1");
      const nextPath = appPath(`/questionnaire?${nextQuery.toString()}`);
      router.push(appPath(`/login?next=${encodeURIComponent(nextPath)}`));
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
          userId: user.id,
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

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(QUESTIONNAIRE_DRAFT_KEY);
        window.localStorage.removeItem(QUESTIONNAIRE_PENDING_SUBMIT_KEY);
      }

      router.push(appPath(`/result/${data.submissionId}/processing`));
    } catch {
      setError("系统暂时没接住这次提交，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <form className="questionnaire-v2-form" onSubmit={handleSubmit}>
      <section className="questionnaire-v2-progress">
        <p className="questionnaire-v2-progress-text">
          必填进度：{progress.done}/{progress.total}
        </p>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        {resumeMode && draftRestored ? <p className="progress-copy">已恢复上次填写内容。</p> : null}
      </section>

      {formSections.map((section) => (
        <section key={section.id} className="questionnaire-v2-section">
          <h2>{section.title}</h2>
          <div className="field-grid">
            {section.fields.map((field) => (
              <label
                className={missingFieldSet.has(field.name) ? "field-block field-block--missing" : "field-block"}
                data-field-name={field.name}
                key={field.name}
              >
                <span className="field-label">
                  {field.label}
                  {field.required ? <strong className={missingFieldSet.has(field.name) ? "required-mark required-mark--missing" : "required-mark"}> *</strong> : null}
                </span>

                {field.type === "text" ? (
                  <input
                    className={missingFieldSet.has(field.name) ? "text-input input--missing" : "text-input"}
                    type="text"
                    value={formData[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) => updateValue(field.name, event.target.value)}
                  />
                ) : null}

                {field.type === "textarea" ? (
                  <textarea
                    className={missingFieldSet.has(field.name) ? "text-area input--missing" : "text-area"}
                    rows={4}
                    value={formData[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) => updateValue(field.name, event.target.value)}
                  />
                ) : null}

                {field.type === "radio" ? (
                  <div className={missingFieldSet.has(field.name) ? "option-grid option-grid--missing" : "option-grid"}>
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
                  <div className={missingFieldSet.has(field.name) ? "option-grid option-grid--missing" : "option-grid"}>
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

                {missingFieldSet.has(field.name) ? <span className="field-missing-hint">此项为必填，请先完成。</span> : null}
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="questionnaire-v2-submit">
        {missingFieldNames.length > 0 ? (
          <div aria-live="assertive" className="questionnaire-v2-missing-alert" role="alert">
            <p className="questionnaire-v2-missing-alert-title">请先补齐以下必填项</p>
            <div className="questionnaire-v2-missing-list">
              {missingFieldNames.map((fieldName) => (
                <button
                  className="questionnaire-v2-missing-chip"
                  key={fieldName}
                  onClick={() => scrollToField(fieldName)}
                  type="button"
                >
                  {getFieldLabel(fieldName)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button className="questionnaire-v2-submit-btn" disabled={submitting} type="submit">
          {submitting ? "正在生成，请稍候..." : "提交并生成诊断报告"}
        </button>
      </section>
    </form>
  );
}
