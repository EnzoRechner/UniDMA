# Supabase Edge Function: send-notification

This function sends Expo push notifications using Expo's Push API, sourcing Expo push tokens from Supabase tables.

## Deploy

1. Install the Supabase CLI
2. Authenticate: `supabase login`
3. Link your project: `supabase link --project-ref <your-project-ref>`
4. Deploy function (no JWT verification for server-initiated calls):

```
supabase functions deploy send-notification --no-verify-jwt
```

Set the following environment variables in your Supabase project (Dashboard → Project Settings → Functions → Secrets). Note: custom secrets cannot start with `SUPABASE_`.

- `EDGE_SUPABASE_URL` = your project URL, e.g. `https://<ref>.supabase.co`
- `EDGE_SERVICE_ROLE_KEY` = your Service Role key (keep secret)
- Optional: `FUNCTION_SECRET` = any random string; if set, requests must include header `x-function-secret: <that value>`

## Tables

Use `schema.sql` to create required tables:

- `device_tokens(user_id, expo_push_token, is_active, platform, updated_at)`
- `notification_preferences(user_id, push_enabled, booking_confirmed_enabled, booking_rejected_enabled, new_booking_staff_enabled)`
- `accounts(id, role, branch, branch_name)`
- `notification_records(...)`

## API

POST https://<project-ref>.functions.supabase.co/send-notification

Headers (if `FUNCTION_SECRET` is set):

```
x-function-secret: <FUNCTION_SECRET>
Content-Type: application/json
```

Body:

```
{
  "target": "user" | "staff",
  "userId?": "string",
  "branchId?": number,
  "branchName?": "string",
  "notificationType": "string",
  "title": "string",
  "body": "string",
  "data?": { ... }
}
```

Response:

```
{ "success": true, "sent": number, "failed": number }
```
