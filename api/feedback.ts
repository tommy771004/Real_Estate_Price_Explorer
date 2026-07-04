import { persistIntake, validateFeedbackPayload } from "../server/intake";

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, error: "Method not allowed" });
  }

  const validated = validateFeedbackPayload(request.body ?? {});
  if (!validated.ok) return response.status(400).json({ success: false, error: validated.error });

  const result = await persistIntake("feedback", validated.data);
  return response.status(result.status).json(result);
}
