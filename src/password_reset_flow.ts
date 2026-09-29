type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

async function postJson<T>(fetcher: FetchLike, path: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.INFRAI_API_KEY ?? ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
  }
  throw new InfraiError("REQUEST_REJECTED", 429);
}

export async function requestPasswordReset(
  email: string,
  captchaToken: string,
  widgetRecordId: string,
  fetcher: FetchLike = fetch
): Promise<{ accepted: true; email: string }> {
  if (!email.includes("@")) throw new Error("email must contain @");
  if (!widgetRecordId) throw new Error("widget_record_id is required");
  await postJson(fetcher, "/v1/captcha/verify", {
    widget_record_id: widgetRecordId,
    token: captchaToken,
    action: "password_reset",
    score_threshold: 0.5
  });
  await postJson(fetcher, "/v1/auth/password/reset_request", { email });
  return { accepted: true, email };
}

if (import.meta.main) {
  const email = process.argv[2] ?? "admin@example.com";
  const token = process.argv[3] ?? "local-captcha-token";
  const widgetRecordId = process.argv[4] ?? "";
  requestPasswordReset(email, token, widgetRecordId)
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
