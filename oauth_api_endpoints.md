# Read-only OAuth-aware API endpoint reference

This document is for building a CLI against read-only WCA API routes that can authenticate with a Doorkeeper OAuth bearer token.

Conventions:
- `string`: JSON string
- `integer`: JSON integer
- `boolean`: JSON boolean
- `datetime`: ISO-8601 string
- `array<T>`: JSON array of `T`
- `object`: JSON object
- `enum[...]`: string constrained to listed values

Notes:
- This file only covers read-only endpoints whose controller code can authenticate from an OAuth token.
- Some v0 routes are only partially OAuth-compatible. Those caveats are called out inline.

## Auth model

- OAuth token transport: `Authorization: Bearer <access_token>`
- Default OAuth scope: `public`
- Optional scopes: `dob`, `email`, `manage_competitions`, `openid`, `profile`, `cms`

## Shared types

### `CompetitionSummary`

Used by `GET /api/v0/competitions/mine`.

```json
{
  "id": "string",
  "name": "string",
  "website": "string|null",
  "start_date": "date|null",
  "end_date": "date|null",
  "registration_open": "datetime|null",
  "url": "string",
  "city": "string|null",
  "country_iso2": "string|null",
  "results_posted?": "boolean",
  "visible?": "boolean",
  "confirmed?": "boolean",
  "cancelled?": "boolean",
  "report_posted?": "boolean",
  "short_display_name": "string",
  "registration_status": "string|null",
  "championships": "array<object>"
}
```

### `PermissionsResponse`

Returned by `GET /api/v0/users/me/permissions`.

```json
{
  "can_attend_competitions": { "scope": "\"*\" | array<mixed>", "until": "datetime|null" },
  "can_organize_competitions": { "scope": "\"*\" | array<mixed>" },
  "can_administer_competitions": { "scope": "\"*\" | array<integer>" },
  "can_view_delegate_admin_page": { "scope": "\"*\" | array<mixed>" },
  "can_view_delegate_report": { "scope": "\"*\" | array<integer>" },
  "can_edit_delegate_report": { "scope": "\"*\" | array<integer>" },
  "can_create_groups": { "scope": "array<mixed>" },
  "can_read_groups_current": { "scope": "array<mixed>" },
  "can_read_groups_past": { "scope": "array<mixed>" },
  "can_edit_groups": { "scope": "array<mixed>" },
  "can_access_panels": { "scope": "array<mixed>" },
  "can_request_to_edit_others_profile": { "scope": "\"*\" | array<mixed>" }
}
```

### `RegistrationUser`

Embedded in registration responses.

```json
{
  "id": "integer",
  "wca_id": "string|null",
  "name": "string",
  "gender": "string",
  "country_iso2": "string",
  "country": "object|string"
}
```

If PII is enabled for the endpoint, `dob` and `email` may also be present.

### `RegistrationV2`

Base shape returned by registration endpoints.

```json
{
  "id": "integer",
  "user": "RegistrationUser",
  "user_id": "integer",
  "registrant_id": "integer|null",
  "guests": "integer",
  "payment": {
    "has_paid": "boolean",
    "payment_status": "string|null",
    "paid_amount_iso": "integer",
    "currency_code": "string",
    "updated_at": "datetime|null"
  },
  "competing": {
    "event_ids": "array<string>",
    "comments": "string|null",
    "registration_status": "enum[pending,accepted,rejected,deleted,cancelled,waiting_list,non_competing]",
    "registered_on": "datetime|null",
    "comment": "string",
    "admin_comment": "string",
    "waiting_list_position": "integer"
  }
}
```

Notes:
- Some fields are only present in admin responses: `guests`, `payment`, and most `competing.*` status metadata.
- `waiting_list_position` only appears when the registration is on the waiting list.

### `RegistrationLaneConfig`

Returned by `GET /api/v1/competitions/:id/registration_config`.

```json
[
  {
    "key": "enum[requirements,competing,payment,approval]",
    "isEditable": "boolean",
    "deadline": "datetime",
    "parameters": "object"
  }
]
```

`parameters` by step key:
- `requirements`: no `parameters`
- `competing`:
  - `events_per_registration_limit: integer|null`
  - `allow_registration_edits: boolean`
  - `guest_entry_status: string|null`
  - `guests_per_registration_limit: integer|null`
  - `guests_enabled: boolean`
  - `uses_qualification?: boolean`
  - `allow_registration_without_qualification: boolean`
  - `force_comment_in_registration: boolean`
  - `qualification_wcif: object`
  - `event_ids: array<string>`
  - `preferredEvents: array<string>`
  - `personalRecords.single: array<object>`
  - `personalRecords.average: array<object>`
- `payment`:
  - `stripePublishableKey: string|null`
  - `connectedAccountId: string|null`
- `approval`:
  - `auto_accept_enabled?: boolean`
  - `auto_accept_preference: string|null`

### `RegistrationHistoryEntry`

Returned by `GET /api/v1/registrations/:registration_id/history`.

```json
{
  "changes": "object",
  "timestamp": "datetime",
  "action": "string"
}
```

This shape is inferred from the registration history serializer in `Registration`.

### `RegistrationPaymentV2`

Returned by `GET /api/v1/registrations/:registration_id/payments`.

```json
{
  "user_id": "integer",
  "payment_id": "integer|string|null",
  "payment_provider": "string|null",
  "iso_amount_payment": "integer",
  "currency_code": "string",
  "iso_amount_refundable": "integer",
  "refunding_payments": "array<RegistrationPaymentV2>"
}
```

### `CompetitionWCIF`

Returned by WCIF endpoints.

Top-level fields:

```json
{
  "formatVersion": "string",
  "id": "string",
  "name": "string",
  "shortName": "string",
  "series": "object|null",
  "persons": "array<object>",
  "events": "array<object>",
  "schedule": "object",
  "competitorLimit": "integer|null",
  "extensions": "array<object>",
  "registrationInfo": {
    "openTime": "datetime|null",
    "closeTime": "datetime|null",
    "baseEntryFee": "integer|null",
    "currencyCode": "string|null",
    "onTheSpotRegistration": "boolean",
    "useWcaRegistration": "boolean"
  }
}
```

Authorized WCIF responses include private registration/person fields such as registration comments, guests, administrative notes, birthdate, and email.

### `LiveCompetitor`

```json
{
  "id": "integer",
  "user_id": "integer",
  "registrant_id": "integer|null",
  "name": "string",
  "country_iso2": "string"
}
```

### `LiveRoundResults`

Returned by live round read endpoints.

```json
{
  "...round_wcif_fields": "object",
  "round_id": "integer",
  "competitors": "array<LiveCompetitor>",
  "results": "array<object>",
  "state_hash": "string",
  "linked_round_ids": "array<string>|null"
}
```

The exact `results` item shape comes from the `live_results` association serializer and is not normalized in the controller.

### `LiveRoundInfo`

```json
{
  "...round_wcif_fields": "object",
  "state": "string",
  "total_competitors": "integer",
  "competitors_live_results_entered": "integer"
}
```

`total_competitors` is only present when the round is open or locked.
`competitors_live_results_entered` is only present when the round is open.

## Endpoints

### `GET /api/v0/me`

- Auth: OAuth token required
- Scope: any valid token
- Path params: none
- Query params: none
- Returns: object

```json
{
  "me": "User object for the token owner"
}
```

Notes:
- The user object includes private attributes according to token scopes via `private_attributes: doorkeeper_token.scopes`.
- Exact field inclusion depends on the application's serialization logic and granted scopes.

### `GET /api/v0/users/me/permissions`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params: none
- Query params: none
- Returns: `PermissionsResponse`

### `GET /api/v0/competitions/mine`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params: none
- Query params: none
- Returns: object

```json
{
  "past_competitions": "array<CompetitionSummary>",
  "future_competitions": "array<CompetitionSummary>",
  "bookmarked_competitions": "array<CompetitionSummary>",
  "registrations_by_competition": {
    "<competition_id>": "string"
  }
}
```

Notes:
- `registrations_by_competition` maps competition IDs to the caller's registration status string.

### `GET /api/v0/competitions?managed_by_me=true`

- Auth: OAuth token accepted
- Scope: `manage_competitions`
- Path params: none
- Query params:
  - `managed_by_me: boolean`
  - `q: string` optional search term
  - other search/filter params may be accepted by `Competition.search`, but they are not validated in this controller
- Returns: paginated array of competition search results

Return type:
- JSON array of competition objects produced by `paginate json: competitions`
- Exact fields depend on the competition search serialization path, not on an explicit serializer in this controller

CLI guidance:
- Treat this as a filtered competition list endpoint rather than a strict schema endpoint.

### `GET /api/v0/competitions/:competition_id/wcif`

- Auth: OAuth token accepted
- Scope: `manage_competitions`
- Path params:
  - `competition_id: string`
- Query params: none
- Returns: `CompetitionWCIF`

Notes:
- Caller must be allowed to manage the competition.
- This is the authorized WCIF, so private registration/person fields are included.

### `GET /api/v1/competitions/:competition_id/registrations/:user_id`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `competition_id: string`
  - `user_id: integer`
- Query params: none
- Returns: `RegistrationV2`

Authorization:
- Caller must be the target user or be able to manage the competition.

### `GET /api/v1/registrations/:id`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `id: integer`
- Query params: none
- Returns: `RegistrationV2`

Authorization:
- Caller must be the registration owner or competition manager.

### `GET /api/v1/competitions/:id/registration_config`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `id: string`
- Query params: none
- Returns: `array<RegistrationLaneConfig>`

### `GET /api/v1/competitions/:competition_id/registrations/admin`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `competition_id: string`
- Query params: none
- Returns: `array<RegistrationV2>`

Notes:
- This is an admin view, so `admin: true` and `pii: true` are enabled.
- User objects may include `dob` and `email`.

### `GET /api/v1/registrations/:id/payment_ticket`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `id: integer`
- Query params:
  - `iso_donation_amount: integer` optional, defaults to `0`
- Returns: object

```json
{
  "client_secret": "string"
}
```

Notes:
- This creates or reuses a Stripe payment intent and returns its client secret.
- The route is only valid when payment integrations are enabled, registration is still open, and there are outstanding fees.

### `GET /api/v1/registrations/:registration_id/history`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `registration_id: integer`
- Query params: none
- Returns: `array<RegistrationHistoryEntry>`

Authorization:
- Caller must be the registration owner or competition manager.

### `GET /api/v1/registrations/:registration_id/payments`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `registration_id: integer`
- Query params: none
- Returns: object

```json
{
  "charges": "array<RegistrationPaymentV2>"
}
```

Authorization:
- Caller must be the registration owner or competition manager.

### `GET /api/v1/competitions/:competition_id/live/rounds/:round_id/next_if_quit`

- Auth: OAuth token accepted
- Scope: any valid token
- Path params:
  - `competition_id: string`
  - `round_id: string`
  - `registration_id: integer`
- Query params: none
- Returns: object

```json
{
  "status": "ok",
  "next_advancing": "array<object>"
}
```

## Public live read endpoints

These are under the OAuth-aware controller tree, but they do not require auth. They may still be useful in the same CLI.

### `GET /api/v1/competitions/:competition_id/live/rounds/:round_id`

- Auth: not required
- Path params:
  - `competition_id: string`
  - `round_id: string`
- Query params: none
- Returns: `LiveRoundResults`

### `GET /api/v1/competitions/:competition_id/live/registrations/:registration_id`

- Auth: not required
- Path params:
  - `competition_id: string`
  - `registration_id: integer`
- Query params: none
- Returns: object

```json
{
  "...user_wcif_fields": "object",
  "results": "array<object>"
}
```

Notes:
- Base fields come from `User#to_wcif(competition, registration)`.
- `results` is the caller's live results list with nested attempts included.

### `GET /api/v1/competitions/:competition_id/live/podiums`

- Auth: not required
- Path params:
  - `competition_id: string`
- Query params: none
- Returns: `array<LiveRoundResults>`

Notes:
- Each item only includes podium result data.

### `GET /api/v1/competitions/:competition_id/live/rounds`

- Auth: not required
- Path params:
  - `competition_id: string`
- Query params: none
- Returns: object

```json
{
  "rounds": "array<LiveRoundInfo>"
}
```

## Excluded OAuth-incompatible routes

These look authenticated, but the controller still depends on session `current_user` rather than token-derived user state, so they are not safe to treat as bearer-token CLI endpoints without further changes:

- `GET /api/v0/auth/results`
- `GET /api/v0/users/me`
- `GET /api/v0/users/me/personal_records`
- `GET /api/v0/users/me/preferred_events`
- `GET /api/v0/users/me/bookmarks`
- `/api/v0/user_roles/*`
- `/api/v0/user_groups/*`
- `/api/v0/wrt/persons/*`
- `/api/v0/wfc/xero_users/*`
- `/api/v0/wfc/dues_redirects/*`

## Excluded mutating routes

These are OAuth-aware but intentionally omitted because they change server state:

- `PATCH /api/v0/competitions/:competition_id/wcif`
- `POST /api/v1/competitions/:competition_id/registrations`
- `PATCH /api/v1/registrations/:id`
- `PUT /api/v1/registrations/:id`
- `PATCH /api/v1/competitions/:competition_id/registrations/bulk_auto_accept`
- `PATCH /api/v1/competitions/:competition_id/registrations/bulk_update`
- `PUT /api/v1/competitions/:competition_id/live/rounds/:round_id/open`
- `PUT /api/v1/competitions/:competition_id/live/rounds/:round_id/clear`
- `DELETE /api/v1/competitions/:competition_id/live/rounds/:round_id/:registration_id`
- `PUT /api/v1/competitions/:competition_id/live/rounds/:round_id/:registration_id`
- `POST /api/v1/competitions/:competition_id/live/rounds/:round_id`
- `PATCH /api/v1/competitions/:competition_id/live/rounds/:round_id`
