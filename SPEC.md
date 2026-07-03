# SPEC.md

**Product:** Gift Card Logger
**Version:** 1.0 MVP
**Status:** Build Ready
**Audience:** Claude Code

---

# 1. Overview

Gift Card Logger is a mobile-first SaaS that enables professional gift card resellers to convert photographs of gift cards into rows in Google Sheets.

Google Sheets is the customer's inventory system.

Gift Card Logger is **not** an inventory management application.

Its only responsibility is moving information from photographs into Google Sheets as quickly and accurately as possible.

The primary workflow should require the fewest possible taps.

---

# 2. Product Principles

These principles override implementation preferences.

### P-001

The application exists for one workflow.

Take Photo → Review → Save → Repeat

If a feature does not improve this workflow, it does not belong in the MVP.

### P-002

Mobile is the primary platform.

Desktop is supported but not optimized first.

### P-003

Google Sheets is the source of truth.

The application is never the inventory database.

### P-004

The application should never ask the user to configure something that can be automated.

### P-005

Simple implementations are preferred over clever implementations.

### P-006

Every screen shall have exactly one primary action.

---

# 3. Target Customer

Professional gift card resellers.

Typical workflow:

* Purchase gift cards.
* Open application.
* Photograph one or more cards.
* Verify OCR.
* Save.
* Continue with next photograph.

Users frequently process many cards consecutively.

---

# 4. Out of Scope

Do not build:

* Inventory history
* Inventory search
* Inventory editing
* Analytics
* Dashboards
* Reports
* Broker integrations
* Duplicate detection
* OCR confidence
* CSV export
* Teams
* Roles
* Admin panel
* Notifications
* Settings
* Themes
* Public API
* Multiple subscription plans
* Annual subscriptions
* AI provider abstraction
* Retry queues
* Background jobs

---

# 5. Technology Stack

Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

Backend

* Next.js API Routes

Database

* Supabase Postgres

Authentication

* Supabase Auth
* Google Sign-In

Billing

* Stripe

Hosting

* Vercel

AI

* Google Gemini (selected; provider logic isolated so it can be swapped easily)

Google

* Google Sheets API
* Google Drive API

---

# 6. Authentication

Authentication method: Google only.

No passwords. No email verification. No anonymous users.

After successful authentication:

* Create user record if first login.
* Redirect into application.

---

# 7. Initial Provisioning

First login only.

Application shall:

* Request Google Drive permissions.
* Automatically create spreadsheet.

Spreadsheet name: **Gift Card Inventory**

Worksheet: **Inventory**

Columns: | Date | Vendor | Card Number | PIN | Value |

Save Spreadsheet ID.

Never ask the user to create a spreadsheet manually.

---

# 8. Trial

Every account receives: five free image uploads.

Uploads are counted. Gift cards are not counted.

After fifth successful upload: block upload, display subscription screen.

Successful payment unlocks unlimited uploads.

---

# 9. Subscription

One plan. Monthly. Unlimited uploads.

No annual billing. No feature tiers.

---

# 10. Home Screen

Authenticated users immediately see:

* Primary Action: **Take Photo**
* Secondary Action: **Choose Existing Photo**

Nothing else. No statistics. No dashboard. No upload history.

---

# 11. Image Upload

One image per upload. Image may contain multiple gift cards.

Immediately after image selection:

* Upload image.
* Invoke AI.
* Display processing screen.

There is no Extract button.

---

# 12. Processing Screen

Display: "Processing Image..." and a spinner. Nothing else.

---

# 13. OCR Requirements

AI shall attempt extraction for every visible gift card.

Validated vendors: Amazon, Best Buy, Home Depot.

Unknown vendors shall still be processed.

Returned fields: Vendor, Card Number, PIN, Value.

Amazon mapping: Claim Code → Card Number, PIN → empty.

---

# 14. Review Screen

Each detected gift card becomes an editable card.

Card fields: Vendor, Card Number, PIN, Value. All fields editable.

No confidence indicators.

Bottom of screen: **Approve & Save** (primary button only).

---

# 15. Saving

Approve & Save writes each card independently.

Each card becomes one Google Sheets append.

Failure of one card shall not prevent attempting remaining cards.

---

# 16. Success Screen

If every card saves successfully, display:

**Success** — X of X cards saved.

Primary button: Take Next Photo. Secondary button: Choose Existing Photo.

No history. No statistics.

---

# 17. Failure Screen

If any save fails, display:

**Save Failed** — explain that one or more cards could not be written.

Keep extracted cards visible. Do not store server-side.

User may manually copy information into spreadsheet.

No retry infrastructure in MVP.

---

# 18. Google Sheet Schema

Worksheet: Inventory

Columns: Date, Vendor, Card Number, PIN, Value

Date format: MM/DD/YYYY. No formatting requirements.

---

# 19. Privacy

Images:

* Never written to disk.
* Never permanently stored.
* Exist only in memory during OCR.
* Deleted immediately afterwards.

Gift card information: not retained after successful save.

Database stores only:

* User
* Subscription state
* Spreadsheet ID
* Trial upload count
* Operational metadata

---

# 20. Database

## users

id, email, display_name, spreadsheet_id, trial_uploads_used, stripe_customer_id, subscription_status, created_at, updated_at

No gift card tables. No inventory tables.

---

# 21. API Endpoints

* `POST /api/ocr` — Input: image. Output: array of cards.
* `POST /api/save` — Input: array of cards. Writes rows to Google Sheets. Returns per-card success/failure.
* `POST /api/stripe/webhook` — Updates subscription state.
* `GET /api/me` — Returns authenticated user.

---

# 22. Security

* Require authentication on all API routes.
* Validate ownership of spreadsheet.
* Never expose AI API keys.
* Never expose Google credentials.
* Never expose Stripe secrets.

---

# 23. Performance Targets

* OCR: average <5 seconds.
* Application startup: <2 seconds.
* Navigation: instant.

---

# 24. Acceptance Criteria

A brand new user can:

1. Sign in with Google.
2. Application creates spreadsheet automatically.
3. Tap Take Photo.
4. Photograph gift cards.
5. OCR begins automatically.
6. Review extracted cards.
7. Edit incorrect fields.
8. Tap Approve & Save.
9. Rows appear inside Google Sheets.
10. See success screen.
11. Tap Take Next Photo.

No documentation required.

If all of the above work reliably, the MVP is complete.
