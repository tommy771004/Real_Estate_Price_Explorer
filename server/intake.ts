type IntakePayload = Record<string, unknown>;

const normalizeLocation = (payload: IntakePayload) => {
  const nested = typeof payload.location === "object" && payload.location
    ? payload.location as IntakePayload
    : {};
  const numberOrNull = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    latitude: numberOrNull(payload.latitude ?? nested.latitude),
    longitude: numberOrNull(payload.longitude ?? nested.longitude),
    county: String(payload.county ?? nested.county ?? "").trim() || null,
    district: String(payload.district ?? nested.district ?? "").trim() || null,
    location_method: String(payload.location_method ?? nested.method ?? "unknown").trim() || "unknown",
  };
};

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
      ...normalizeLocation(payload),
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
      ...normalizeLocation(payload),
    },
  };
};

export const buildIntakeWrite = (kind: "feedback" | "audit", data: IntakePayload) => {
  if (kind === "feedback") {
    return {
      sql: `INSERT INTO feedbacks
        (category, content, contact, latitude, longitude, county, district, location_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
      params: [
        data.category, data.content, data.contact, data.latitude,
        data.longitude, data.county, data.district, data.location_method,
      ],
    };
  }
  return {
    sql: `INSERT INTO audit_logs
      (action_type, details, latitude, longitude, county, district, location_method)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
    params: [
      data.action_type, data.details, data.latitude, data.longitude,
      data.county, data.district, data.location_method,
    ],
  };
};

type QueryExecutor = (
  sql: string,
  params: unknown[],
) => Promise<{ rows: Array<{ id?: number }> }>;

export const persistIntake = async (
  kind: "feedback" | "audit",
  data: IntakePayload,
  execute?: QueryExecutor,
) => {
  try {
    const query = execute ?? (await import("./db")).queryDatabase;
    const write = buildIntakeWrite(kind, data);
    const result = await query(write.sql, write.params);
    return { success: true, status: 200, data: { id: result.rows[0]?.id ?? null } };
  } catch (error) {
    const unavailable = error instanceof Error && error.name === "DatabaseUnavailableError";
    return {
      success: false,
      status: unavailable ? 503 : 500,
      error: unavailable ? error.message : "資料庫寫入失敗",
    };
  }
};
