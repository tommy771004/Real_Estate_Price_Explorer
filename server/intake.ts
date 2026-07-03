type IntakePayload = Record<string, unknown>;

export const validateFeedbackPayload = (payload: IntakePayload) => {
  const category = String(payload.category ?? "").trim();
  const content = String(payload.content ?? "").trim();
  if (!category || !content) {
    return { ok: false as const, error: "分類與內容為必填" };
  }
  return {
    ok: true as const,
    data: {
      category,
      content,
      contact: String(payload.contact ?? "").trim() || null,
      location: payload.location ?? null,
      createdAt: new Date().toISOString(),
    },
  };
};

export const validateAuditPayload = (payload: IntakePayload) => {
  const actionType = String(payload.action_type ?? "").trim();
  if (!actionType) return { ok: false as const, error: "action_type 為必填" };
  return {
    ok: true as const,
    data: {
      action_type: actionType,
      details: payload.details ?? null,
      location: payload.location ?? null,
      createdAt: new Date().toISOString(),
    },
  };
};

export const forwardIntake = async (kind: "feedback" | "audit", data: unknown) => {
  const endpoint = kind === "feedback"
    ? process.env.FEEDBACK_WEBHOOK_URL
    : process.env.AUDIT_WEBHOOK_URL;

  if (!endpoint) {
    return {
      success: false,
      status: 503,
      error: "尚未設定資料寫入端點",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: `資料寫入端點回應錯誤 (${response.status})`,
    };
  }

  return { success: true, status: 200 };
};
