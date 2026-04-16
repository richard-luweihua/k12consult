"use client";

import { useState } from "react";
import { apiPath } from "@/lib/paths";

export function WeComTester() {
  const [sending, setSending] = useState("");
  const [message, setMessage] = useState("");

  async function sendTest(priority) {
    setSending(priority);
    setMessage("");

    try {
      const response = await fetch(apiPath("/api/notifications/test"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ priority })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "发送失败");
      }

      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送失败");
    } finally {
      setSending("");
    }
  }

  return (
    <div className="wecom-tester">
      <button
        className="secondary-button"
        disabled={Boolean(sending)}
        type="button"
        onClick={() => sendTest("normal")}
      >
        {sending === "normal" ? "发送中..." : "测试普通通知"}
      </button>
      <button
        className="primary-button"
        disabled={Boolean(sending)}
        type="button"
        onClick={() => sendTest("high")}
      >
        {sending === "high" ? "发送中..." : "测试高优先级通知"}
      </button>
      {message ? <p className="inline-message">{message}</p> : null}
    </div>
  );
}
