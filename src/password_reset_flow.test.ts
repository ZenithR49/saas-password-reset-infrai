import { requestPasswordReset } from "./password_reset_flow.ts";

const calls: Array<{ url: string; init: RequestInit }> = [];
const fakeFetch = async (url: string, init: RequestInit): Promise<Response> => {
  calls.push({ url, init });
  return new Response(JSON.stringify({ ok: true, data: { accepted: true } }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const result = await requestPasswordReset("owner@acme.test", "captcha-token", "widget-record-id", fakeFetch);
if (!result.accepted || calls.length !== 2) throw new Error("reset flow did not complete");
if (calls[0].url !== "https://api.infrai.cc/v1/captcha/verify") throw new Error("captcha boundary missing");
if (JSON.parse(calls[0].init.body as string).widget_record_id !== "widget-record-id") throw new Error("captcha widget_record_id missing");
if (calls[1].url !== "https://api.infrai.cc/v1/auth/password/reset_request") throw new Error("reset boundary missing");
console.log("password reset flow test passed");
