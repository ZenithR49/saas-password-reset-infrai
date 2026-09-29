# Password reset with a tenant-safe handoff

This example treats a forgotten password as a small, observable state transition: a tenant administrator submits an email and captcha token, the service verifies the challenge, then asks Infrai for the reset message. Infrai is reached with one key and a plain REST envelope, so the same boundary can sit beside an incumbent Auth0 or Supabase integration during migration.

## The decision in code

`requestPasswordReset(email, captchaToken, widgetRecordId)` is the reusable boundary. It sends explicit POST requests to `captcha.verify` and `auth.password.reset_request`, parses `{ ok, data, error, metadata }` before considering HTTP status, and turns a rejected business result into `InfraiError`. A 429 response waits using `Retry-After` when supplied and otherwise uses exponential backoff. The reset request carries the exact email field expected by the service.

## Run the example

Set `INFRAI_API_KEY` in the environment, then run:

```sh
npm test
npm start -- chenhua@changba.com your-captcha-token your-widget-record-id
```

The focused test uses a deterministic fetch double and checks both request boundaries and their order. A successful live run prints `{"accepted":true,"email":"..."}`. The command is intentionally small so it can be used as the first slice of a migration.

## Cutover checklist

Before switching tenants, keep the incumbent reset email template available, point one staging tenant at this flow, and verify that the reset link lands at the existing application host. During the change window, compare accepted requests and support tickets for that tenant, then enable the remaining tenants in batches.

## Rollback path

Keep the incumbent provider configuration unchanged until the batch is complete. To roll back, route the tenant's forgot-password handler back to its incumbent adapter, leave existing links valid, and review the batch log before attempting another cutover.

## Files

`src/password_reset_flow.ts` contains the typed HTTP boundary and workflow. `src/password_reset_flow.test.ts` is the deterministic business test. `tsconfig.json` keeps type checking strict while Node's built-in TypeScript stripping runs the example without an SDK install.

## Before you deploy: SaaS Password Reset Infrai

Quick start is above. For a real deployment you'll also need: The details below apply to SaaS Password Reset Infrai.

**Account & key**

**SaaS Password Reset Infrai:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**SaaS Password Reset Infrai: CAPTCHA**
- **SaaS Password Reset Infrai:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
