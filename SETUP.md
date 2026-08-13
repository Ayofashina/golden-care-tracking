# Golden Care Tracking — Airtable-backed rebuild — SETUP

This folder is a drop-in replacement for the live site at
https://goldencareclub.netlify.app/. The UI/HTML/CSS is unchanged; the data
layer was moved from browser `localStorage` (single-browser only) to a shared
Airtable base, read/written through small Netlify Functions.

## What was created in Airtable

- **Base name:** Golden Care Tracking
- **Base ID:** `appVp4KY7nSwwpsXD`
- **Workspace:** "My First Workspace"
- **Tables:**
  - `Residents` — the 5 residents (Richard Watson, Timothy Sproat, James McRennon,
    Martha Riley, James Coe) with full service-plan detail (DOB, code status,
    DNR/OLST/advance directive, precautions, allergies, etc.), plus
    `DiagnosisJSON` / `ADLJSON` / `BehavioralJSON` text fields holding the
    per-resident diagnosis, ADL, and behavioral tables as JSON (these were
    nested arrays in the original JS and are preserved exactly, byte-for-byte,
    as JSON strings rather than fully normalized into extra tables — this kept
    the migration low-risk while losing none of the data).
  - `Staff` — Ayo Fashina and Leticia Nwosu.
  - `TaskCatalog` — the 28-task compliance catalog (recurring / quarterly /
    semi-annual / annual / certification), matching the `TASKS` array in the
    original app.
  - `MonthlyTaskCompletions` — the actual checklist completion records (done,
    date, notes) keyed by month + task. All ~64 historical seed records from
    the original `seedHistoricalData()` function were migrated in.
  - `VaccineRecords` — the staff + resident vaccine tracking rows (flu/COVID
    status, dates, manufacturers, proof, verified-by), migrated from the
    `VAX_DEFAULT` object.
  - `CalendarChecks` — per-task/month/year checkbox state for the Calendar tab
    (previously `gcc_calendar_<taskId>_<month>_<year>` localStorage keys).
    Starts empty — there was no seed data for this in the live site.
  - `FormCheckboxState` — saved checkbox state for the printable forms in the
    "Generate Forms" tab (previously `gcb_<formKey>` localStorage keys).
    Starts empty.

All real resident/staff names, dates, diagnoses, ADL plans, behavioral notes,
vaccine records, and the full historical compliance-task completion log from
the live app were copied in — nothing was dropped.

**Update:** the task catalog, resident roster, and staff roster (formerly the
hardcoded `TASKS`, `SERVICE_PLAN_RESIDENTS`, `PEOPLE`/`STAFF` arrays in
`index.html`) are now also read live from Airtable, the same way the monthly
checklist / vaccine tracking / calendar checkboxes already were. Edit a
resident's service-plan detail, a staff member's info, or a task's
schedule/category directly in the `Residents`, `Staff`, or `TaskCatalog`
table in Airtable, and it shows up on the site the next time it loads —
no code change needed. This is **read-only** (Airtable → site, one direction):
the Service Plan tab's resident fields are print-only `contenteditable` spans
with no save button/handler wired up (they exist so you can tweak the text of
a printed page in the browser right before printing), so there's no in-app
"save" action for resident/staff/task data to wire up on the other end. If a
real edit/save UI for that data is added later, extend `residents.js` /
`staff.js` / `task-catalog.js` with a POST/PATCH handler mirroring
`monthly-tasks.js`.

## Files in this folder

- `index.html` — the rewritten front end. Same UI, but all localStorage
  reads/writes were replaced with calls to `/api/...` (see `netlify.toml`
  redirect below), which proxies to the Netlify Functions.
- `netlify/functions/monthly-tasks.js` — GET returns the full checklist state
  object; POST upserts one task's done/date/notes for one month.
- `netlify/functions/vaccine-data.js` — GET returns `{staff, residents}`
  vaccine rows; POST upserts all rows (mirrors how the original app always
  saved the whole vaccine object at once).
- `netlify/functions/calendar-checks.js` — GET returns a map of
  `taskId_month_year -> checked`; POST upserts one checkbox.
- `netlify/functions/form-state.js` — GET/POST the saved checkbox state for a
  single printable form.
- `netlify/functions/residents.js` — GET returns the resident roster +
  service-plan detail (read-only; edit residents directly in Airtable). Parses
  `DiagnosisJSON` / `ADLJSON` / `BehavioralJSON` back into arrays server-side.
- `netlify/functions/staff.js` — GET returns the staff roster (read-only; edit
  staff directly in Airtable).
- `netlify/functions/task-catalog.js` — GET returns the 28-item compliance
  task catalog (read-only; edit tasks directly in Airtable).
- `netlify/functions/lib/airtable.js` — shared helper that talks to the
  Airtable REST API using `AIRTABLE_TOKEN` / `AIRTABLE_BASE_ID` from
  environment variables. **No token is hardcoded anywhere in this repo.**
- `netlify.toml` — routes `/api/*` to the Netlify Functions, and points the
  build at `netlify/functions`.
- `package.json` — no external dependencies needed; the functions use Node's
  built-in global `fetch` (Node 18+, which is Netlify's current default
  Functions runtime).

## Required environment variables (set these in Netlify, not in the repo)

In the Netlify site's **Site settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `AIRTABLE_TOKEN` | A personal access token from https://airtable.com/create/tokens with `data.records:read` and `data.records:write` scopes, granted access to the "Golden Care Tracking" base (`appVp4KY7nSwwpsXD`). |
| `AIRTABLE_BASE_ID` | `appVp4KY7nSwwpsXD` |

To create the token: go to https://airtable.com/create/tokens → Create new
token → give it a name like "golden-care-tracking-netlify" → add scopes
`data.records:read` and `data.records:write` → under Access, add the
"Golden Care Tracking" base → Create token → copy the value (starts with
`pat...`) into the Netlify env var. Airtable only shows the token once.

## Deploying

Either of the two options the live site already supports:

1. **GitHub + Netlify (recommended for ongoing edits):** push the contents of
   this folder to the `golden-care-tracking` GitHub repo, then connect that
   repo in Netlify (Site settings → Build & deploy → Link repository). Netlify
   will auto-detect `netlify.toml` and deploy both the static `index.html` and
   the functions in `netlify/functions/`.
2. **Netlify Drop (matches how it's deployed today):** drag the whole
   `golden-care-rebuild` folder into https://app.netlify.com/drop. This
   deploys the static file and, because Netlify Drop also picks up
   `netlify.toml` + `netlify/functions/`, the functions should deploy too —
   but Netlify Drop projects still need the `AIRTABLE_TOKEN` /
   `AIRTABLE_BASE_ID` env vars set manually afterward in that site's Site
   settings, since Netlify Drop has no build step to inject them from
   anywhere else.

After either deploy, set the two environment variables above, then trigger a
redeploy (env var changes require a new deploy/function reload to take
effect).

## Things I could NOT do myself (need your Netlify/Airtable access)

1. **Set the `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID` environment variables in
   Netlify.** I don't have access to your Netlify account. You'll need to
   generate the Airtable personal access token yourself (link above) since
   token creation requires interactive approval in the Airtable UI.
2. **Actually deploy this folder** — either push it to the `golden-care-tracking`
   GitHub repo, or drag it into Netlify Drop. I've prepared the files but
   didn't have credentials to push to your GitHub repo or your Netlify
   account.
3. **Verify against the live site once deployed** — after deploy + env vars
   are set, open the new URL and spot-check that the August 2026 checklist,
   vaccine tracking table, and calendar tab all show the same data as
   https://goldencareclub.netlify.app/ currently shows, then switch DNS /
   replace the live Netlify Drop site.
4. **(Done in this pass)** Residents/Staff/TaskCatalog are now wired to
   Airtable on the read side — see the "Update" note above. No new env vars
   were needed; the same `AIRTABLE_TOKEN` / `AIRTABLE_BASE_ID` cover the new
   endpoints too.
