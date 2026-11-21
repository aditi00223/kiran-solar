# Kiran API

Backend for the Kiran Solar Installation Management System.
Owner: Person 1 (Backend). Base URL while developing: `http://localhost:5000/api`

## 1. Response format (every endpoint)

Success:

```json
{ "data": { }, "error": null }
```

Failure:

```json
{ "data": null, "error": "Survey not approved yet" }
```

List endpoints also return `meta`:

```json
{
  "data": [ ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Always show `error` to the user as a friendly message.

## 2. Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | Worked / created |
| 400 | Bad input (the message says which field) |
| 401 | Not logged in, or the token expired |
| 403 | Logged in, but this role is not allowed (or a business rule blocked it) |
| 404 | Record not found |
| 409 | Duplicate record |

## 3. Logging in

Send the token with every request except the ones marked Public:

```
Authorization: Bearer <token>
```

Tokens last 12 hours.

### Demo accounts (all use the password `Solar@123`)

| Role | Email |
|---|---|
| DIRECTOR | director@kiran.in |
| SALES | sales@kiran.in, sales2@kiran.in |
| WAREHOUSE | warehouse@kiran.in |
| SUPPORT | support@kiran.in |
| TECHNICIAN | jaspreet@kiran.in, manpreet@kiran.in, amandeep@kiran.in |

## 4. Roles

`SALES`, `TECHNICIAN`, `WAREHOUSE`, `SUPPORT`, `DIRECTOR`.
Each endpoint below lists the roles allowed. Anyone else gets a 403.

## 5. Lists: paging and search

Every list endpoint accepts:

| Query | Example | Meaning |
|---|---|---|
| `page` | `?page=2` | Page number, starts at 1 (default 1) |
| `limit` | `?limit=20` | Items per page (default 10, max 50) |
| `search` | `?search=ludhiana` | Text search (what it searches is listed per endpoint) |

Some lists also accept filters such as `status`, listed per endpoint.

## 6. Status values (use the same colour for the same status everywhere)

| Thing | Values |
|---|---|
| Lead status | `NEW`, `CONTACTED`, `SURVEY_SCHEDULED`, `SURVEY_APPROVED`, `QUOTED`, `ORDERED`, `LOST` |
| Lead source | `WEB`, `CALL`, `WHATSAPP` |
| Survey status | `SCHEDULED`, `COMPLETED`, `APPROVED`, `REJECTED` |
| Quote status | `DRAFT`, `SENT`, `ACCEPTED` |
| Order status | `CONFIRMED`, `PACKED`, `DISPATCHED`, `DELIVERED`, `INSTALLED` |
| Install job status | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` |
| Ticket status | `OPEN`, `IN_PROGRESS`, `FIXED_PENDING_CONFIRMATION`, `CLOSED` |
| Subsidy stage | `APPLIED`, `DOCUMENTS_SUBMITTED`, `APPROVED`, `RECEIVED` |
| Package type | `ON_GRID`, `OFF_GRID`, `PANEL_SET`, `INSTALLATION` |

## 7. Server setup (.env values)

`DATABASE_URL`, `JWT_SECRET` (use a long random value in production), `PORT`, and `CLIENT_URL` (the frontend address, used to build the dashboard share link, for example `http://localhost:5173`, then the real Vercel address after deployment).

---

## Auth (F1)

### POST /auth/login (Public)

Request:

```json
{ "email": "sales@kiran.in", "password": "Solar@123" }
```

Response 200:

```json
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 2, "name": "Simran Kaur", "email": "sales@kiran.in", "role": "SALES" }
  },
  "error": null
}
```

Errors: 400 (missing or invalid email), 401 `Incorrect email or password`, 403 `This account has been deactivated`.

### GET /auth/me (any logged-in user)

Response 200:

```json
{
  "data": { "id": 2, "name": "Simran Kaur", "email": "sales@kiran.in", "phone": "9815023456", "role": "SALES" },
  "error": null
}
```

Use it after a page refresh to restore the logged-in user. A 401 means send the person back to the login page.

---

## Leads (F2, F3)

A lead is also the customer record. Leads are never deleted. New web enquiries are assigned to a salesperson automatically.

### POST /leads (Public)

The website enquiry form posts here. No login needed.

Request:

```json
{
  "name": "Rajinder Pal Singh",
  "phone": "9876543210",
  "email": "rajinder.pal@gmail.com",
  "address": "House 214, Model Town Extension",
  "city": "Ludhiana",
  "systemSizeKw": 3,
  "message": "Interested in a 3 kW system under the subsidy scheme."
}
```

Only `name`, `phone` and `address` are required. `source` is optional and defaults to `WEB`. Sales staff entering a lead by hand can send `"source": "CALL"` or `"WHATSAPP"` (this needs a login).

Response 201:

```json
{
  "data": {
    "id": 7,
    "name": "Rajinder Pal Singh",
    "phone": "9876543210",
    "city": "Ludhiana",
    "source": "WEB",
    "status": "NEW",
    "systemSizeKw": 3,
    "assignedTo": { "id": 2, "name": "Simran Kaur" },
    "createdAt": "2026-11-21T08:30:00.000Z"
  },
  "error": null
}
```

Errors: 400 `phone: Enter a valid 10-digit phone number`.

### GET /leads (SALES, DIRECTOR)

Query: `page`, `limit`, `search` (name, phone or city), `status`, `source`.

Response 200:

```json
{
  "data": [
    {
      "id": 7,
      "name": "Rajinder Pal Singh",
      "phone": "9876543210",
      "city": "Ludhiana",
      "source": "WEB",
      "status": "NEW",
      "systemSizeKw": 3,
      "assignedTo": { "id": 2, "name": "Simran Kaur" },
      "createdAt": "2026-11-21T08:30:00.000Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 8, "totalPages": 1 }
}
```

### GET /leads/new-count (SALES, DIRECTOR)

For the "new lead" alert badge. Poll it every 30 seconds.

Response 200:

```json
{ "data": { "count": 1 }, "error": null }
```

### GET /leads/:id (SALES, DIRECTOR)

One lead with its surveys and quotes.

Response 200:

```json
{
  "data": {
    "id": 5,
    "name": "Parminder Kaur Dhillon",
    "phone": "9988776655",
    "email": "parminder.dhillon@gmail.com",
    "address": "Sector 70, House 1183",
    "city": "Mohali",
    "source": "WEB",
    "status": "SURVEY_APPROVED",
    "systemSizeKw": 3,
    "message": "3 kW on-grid system under the subsidy.",
    "shadowFreeArea": 400,
    "monthlyBill": 5200,
    "gridSuitable": true,
    "assignedTo": { "id": 2, "name": "Simran Kaur" },
    "surveys": [
      { "id": 3, "status": "APPROVED", "roofDirection": "South-West", "tiltAngle": 22, "cableDistance": 12 }
    ],
    "quotes": [],
    "createdAt": "2026-11-07T08:30:00.000Z"
  },
  "error": null
}
```

Errors: 404 `Record not found`.

### PATCH /leads/:id/call-check (SALES)

Sales records the phone call answers (F3). The lead moves to `CONTACTED`.

Request:

```json
{ "shadowFreeArea": 400, "monthlyBill": 5200, "gridSuitable": true }
```

Response 200: the updated lead (same shape as GET /leads/:id).

Errors: 400 `monthlyBill: Must be a positive number`.

### PATCH /leads/:id (SALES, DIRECTOR)

Change the owner or mark a lead lost. Send only what you want to change. `status` can only be set to `LOST` here.

Request:

```json
{ "status": "LOST", "assignedToId": 3 }
```

Response 200: the updated lead.

Errors: 400 `status: Status can only be changed to LOST here`.

---

## Surveys (F4, F5)

### GET /users/technicians (SALES, DIRECTOR)

Fills the "assign technician" dropdown.

Response 200:

```json
{
  "data": [
    { "id": 6, "name": "Jaspreet Singh" },
    { "id": 7, "name": "Manpreet Singh" },
    { "id": 8, "name": "Amandeep Sidhu" }
  ],
  "error": null
}
```

### POST /surveys (SALES)

Schedule a roof survey. The lead moves to `SURVEY_SCHEDULED`.

Request:

```json
{ "leadId": 3, "technicianId": 6, "scheduledAt": "2026-11-24T10:00:00.000Z" }
```

Response 201:

```json
{
  "data": {
    "id": 5,
    "leadId": 3,
    "status": "SCHEDULED",
    "scheduledAt": "2026-11-24T10:00:00.000Z",
    "technician": { "id": 6, "name": "Jaspreet Singh" }
  },
  "error": null
}
```

### GET /surveys (SALES, TECHNICIAN, DIRECTOR)

Query: `page`, `limit`, `status`, `leadId`, `search` (customer name). Technicians only see their own surveys.

Response 200:

```json
{
  "data": [
    {
      "id": 4,
      "status": "APPROVED",
      "scheduledAt": "2026-11-10T10:00:00.000Z",
      "roofDirection": "South-West",
      "tiltAngle": 22,
      "cableDistance": 12,
      "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" },
      "technician": { "id": 6, "name": "Jaspreet Singh" }
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 4, "totalPages": 1 }
}
```

### GET /surveys/:id (SALES, TECHNICIAN, DIRECTOR)

Response 200: one survey, same shape as above plus `notes` and `reviewNote`.

### PATCH /surveys/:id/record (TECHNICIAN)

The technician records the roof measurements. The survey moves to `COMPLETED`.

Request:

```json
{
  "roofDirection": "South",
  "tiltAngle": 25,
  "cableDistance": 18,
  "notes": "Flat concrete roof, no shadow after 10 am."
}
```

Response 200: the updated survey.

### PATCH /surveys/:id/review (SALES, DIRECTOR)

Approve or reject a completed survey (F4). Approving moves the lead to `SURVEY_APPROVED`.

Request:

```json
{ "decision": "APPROVED", "reviewNote": "Good roof." }
```

`decision` is `APPROVED` or `REJECTED`. `reviewNote` is required when rejecting.

Response 200: the updated survey.

Errors: 400 `Survey has not been completed yet`.

### The survey gate (F5)

`POST /quotes` returns 403 with `Survey not approved yet` unless the lead has an `APPROVED` survey. The frontend should disable the Create quote button until the lead status is `SURVEY_APPROVED` and show that message.

---

## Packages (F6, F19)

### GET /packages (Public)

For the landing page and the quote builder. No login needed. Query: `type` (`ON_GRID`, `OFF_GRID`, `PANEL_SET`, `INSTALLATION`).

Response 200:

```json
{
  "data": [
    {
      "id": 3,
      "name": "3 kW On-Grid System",
      "type": "ON_GRID",
      "capacityKw": 3,
      "price": 189500,
      "description": "Grid-connected rooftop system, 3 kW. Cuts your electricity bill and is subsidy-ready.",
      "warranty": { "panelsYears": 20, "inverterYears": 2 }
    }
  ],
  "error": null
}
```

### GET /packages/:id (Public)

One package with its parts list. The quote builder uses this to show the parts the moment a package is picked.

Response 200:

```json
{
  "data": {
    "id": 3,
    "name": "3 kW On-Grid System",
    "type": "ON_GRID",
    "capacityKw": 3,
    "price": 189500,
    "items": [
      { "productId": 1, "name": "Mono PERC Solar Panel 540W", "category": "PANEL", "quantity": 6, "unitPrice": 14500 },
      { "productId": 4, "name": "On-Grid Solar Inverter 3 kW", "category": "INVERTER", "quantity": 1, "unitPrice": 38000 }
    ]
  },
  "error": null
}
```

---

## Quotes (F5, F6, F7)

### POST /quotes (SALES)

Creates a quote from a package. The parts list is copied from the package as a snapshot (F6): each line keeps the product price at the time of the quote, so later price changes never alter an existing quote.

**The quote total is the sum of its lines** (each product's unit price x quantity). It can differ from the package's listed price.

Request:

```json
{ "leadId": 5, "templateId": 3, "notes": "Includes net-metering paperwork." }
```

Response 201:

```json
{
  "data": {
    "id": 4,
    "status": "DRAFT",
    "totalAmount": 189500,
    "notes": "Includes net-metering paperwork.",
    "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655", "city": "Mohali" },
    "template": { "id": 3, "name": "3 kW On-Grid System" },
    "lines": [
      { "id": 21, "productId": 1, "description": "Mono PERC Solar Panel 540W", "quantity": 6, "unitPrice": 14500, "lineTotal": 87000 }
    ],
    "orderId": null,
    "createdAt": "2026-11-21T09:00:00.000Z"
  },
  "error": null
}
```

A lead at `SURVEY_APPROVED` moves to `QUOTED`.

**The survey gate:** if the lead has no `APPROVED` survey, this returns:

```json
{ "data": null, "error": "Survey not approved yet" }
```

with status **403**. Show that message in a toast, and keep the Create quote button disabled until the lead status is `SURVEY_APPROVED`.

Other errors: 404 `Record not found` (lead), 404 `Package not found`, 400 `This lead is marked lost`, 400 `This lead already has an order`, 400 `This package has no parts list`.

### GET /quotes (SALES, DIRECTOR)

Query: `page`, `limit`, `status`, `leadId`, `search` (customer name).

Response 200:

```json
{
  "data": [
    {
      "id": 4,
      "status": "DRAFT",
      "totalAmount": 189500,
      "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" },
      "template": { "id": 3, "name": "3 kW On-Grid System" },
      "createdAt": "2026-11-21T09:00:00.000Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

### GET /quotes/:id (SALES, DIRECTOR)

Full quote with every line. Use this for the quote view and the PDF (F7).

Response 200: same shape as the POST response. `orderId` is `null` until the quote is ordered, then it holds the order's id.

### PATCH /quotes/:id (SALES)

Edit prices or quantities, or mark it sent. Only allowed before an order exists. The total is always recalculated from the lines.

Request:

```json
{
  "lines": [ { "id": 21, "unitPrice": 14000, "quantity": 6 } ],
  "notes": "Discount applied.",
  "status": "SENT"
}
```

All fields are optional. `status` can be `DRAFT` or `SENT`. Response 200: the updated quote.

Errors: 400 `This quote already has an order and cannot be edited`, 400 `Quote line not found on this quote`.

---

## Orders and payments (F8, F9)

### POST /orders (SALES)

Confirms a quote and records the first payment. Confirming also creates the warehouse pick list and the crew job automatically (F9), so nobody needs to phone anyone.

Request:

```json
{
  "quoteId": 4,
  "payment": { "amount": 95000, "type": "ADVANCE", "method": "UPI" }
}
```

`type` is `ADVANCE` or `FULL`. `method` is optional (cash, UPI, bank transfer).

Response 201:

```json
{
  "data": {
    "id": 3,
    "status": "CONFIRMED",
    "totalAmount": 189500,
    "paid": 95000,
    "balance": 94500,
    "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" },
    "confirmedAt": "2026-11-21T09:30:00.000Z"
  },
  "error": null
}
```

The lead moves to `ORDERED`.

Errors: 400 `This quote already has an order`, 400 `Payment is more than the order total`.

### GET /orders (SALES, WAREHOUSE, DIRECTOR)

Query: `page`, `limit`, `status`, `search` (customer name).

Response 200:

```json
{
  "data": [
    {
      "id": 3,
      "status": "CONFIRMED",
      "totalAmount": 189500,
      "paid": 95000,
      "balance": 94500,
      "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" },
      "confirmedAt": "2026-11-21T09:30:00.000Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

### GET /orders/:id (SALES, WAREHOUSE, DIRECTOR)

Full order with payments, parts list, serials and the install job.

Response 200:

```json
{
  "data": {
    "id": 3,
    "status": "CONFIRMED",
    "totalAmount": 189500,
    "paid": 95000,
    "balance": 94500,
    "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655", "address": "Sector 70, House 1183", "city": "Mohali" },
    "payments": [
      { "id": 5, "amount": 95000, "type": "ADVANCE", "method": "UPI", "paidAt": "2026-11-21T09:30:00.000Z" }
    ],
    "lines": [
      { "productId": 1, "description": "Mono PERC Solar Panel 540W", "quantity": 6, "unitPrice": 14500, "lineTotal": 87000 }
    ],
    "serials": [],
    "installJob": { "id": 3, "status": "SCHEDULED", "technician": null }
  },
  "error": null
}
```

### POST /orders/:id/payments (SALES)

Record the balance or a full payment later.

Request:

```json
{ "amount": 94500, "type": "BALANCE", "method": "Bank transfer", "note": "Paid after installation" }
```

Response 201: the updated order (same shape as POST /orders).

Errors: 400 `Payment is more than the balance due`.

---

## Dispatch and delivery (F10, F11)

### GET /orders/:id/pick-list (WAREHOUSE, DIRECTOR)

What to pack for an order, and how many serial-tracked units are still unscanned. Inverters, batteries and charge controllers need a serial; panels are tracked by serial too for the 20-year warranty.

Response 200:

```json
{
  "data": {
    "orderId": 3,
    "customer": { "name": "Parminder Kaur Dhillon", "city": "Mohali" },
    "items": [
      { "productId": 4, "name": "On-Grid Solar Inverter 3 kW", "category": "INVERTER", "quantity": 1, "scanned": 0 },
      { "productId": 8, "name": "MPPT Charge Controller 40A", "category": "CONTROLLER", "quantity": 1, "scanned": 0 }
    ]
  },
  "error": null
}
```

### POST /dispatch/scan (WAREHOUSE)

Link one scanned serial to an order. Call it once per scan (camera or typed).

Request:

```json
{ "orderId": 3, "serial": "INV-3K-2026-00417" }
```

Response 201:

```json
{
  "data": {
    "serial": "INV-3K-2026-00417",
    "product": { "id": 4, "name": "On-Grid Solar Inverter 3 kW", "category": "INVERTER" },
    "orderId": 3
  },
  "error": null
}
```

Errors: 404 `Serial number not found`, 400 `This serial is already assigned to another order`, 400 `This product is not part of the order`, 400 `All units of this product are already scanned`.

### POST /orders/:id/dispatch (WAREHOUSE)

Confirm the truck is leaving. Stock reduces for every scanned unit (F18). The order moves to `DISPATCHED`.

Response 200: the updated order.

Errors: 400 `Scan all required serials before dispatch`.

### POST /orders/:id/deliver (WAREHOUSE)

Mark delivered. The warranty clock starts now for every serial: 2 years for inverter, battery and controller, 20 years for panels. The order moves to `DELIVERED`.

Response 200:

```json
{
  "data": {
    "orderId": 3,
    "status": "DELIVERED",
    "deliveredAt": "2026-11-25T11:00:00.000Z",
    "serials": [
      { "serial": "INV-3K-2026-00417", "product": "On-Grid Solar Inverter 3 kW", "warrantyStart": "2026-11-25", "warrantyEnd": "2028-11-25" },
      { "serial": "PNL-540-2026-01201", "product": "Mono PERC Solar Panel 540W", "warrantyStart": "2026-11-25", "warrantyEnd": "2046-11-25" }
    ]
  },
  "error": null
}
```

Errors: 400 `Order has not been dispatched yet`.

---

## Install jobs (F9, F12)

### GET /install-jobs (SALES, TECHNICIAN, DIRECTOR)

The crew schedule board. Query: `page`, `limit`, `status` (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`), `technicianId`. Technicians only see their own jobs.

Response 200:

```json
{
  "data": [
    {
      "id": 3,
      "status": "SCHEDULED",
      "scheduledAt": "2026-11-27T09:00:00.000Z",
      "orderId": 3,
      "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali", "address": "Sector 70, House 1183" },
      "technician": { "id": 6, "name": "Jaspreet Singh" }
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

### GET /install-jobs/:id (SALES, TECHNICIAN, DIRECTOR)

One job with the parts list and any recorded work.

Response 200: same as the list item plus `lines`, `startedAt`, `finishedAt`, `hours`, `systemSizeKw`, `photoUrls`, `signatureUrl`.

### PATCH /install-jobs/:id/assign (SALES)

Pick the technician and date.

Request:

```json
{ "technicianId": 6, "scheduledAt": "2026-11-27T09:00:00.000Z" }
```

Response 200: the updated job.

### PATCH /install-jobs/:id/complete (TECHNICIAN)

Submit the install form from the phone. Photos are uploaded to Cloudinary by the frontend first, then the URLs are sent here. The job moves to `COMPLETED` and the order to `INSTALLED`. Hours are calculated from the start and finish times (used for pay and profit).

Request:

```json
{
  "startedAt": "2026-11-27T09:10:00.000Z",
  "finishedAt": "2026-11-27T15:40:00.000Z",
  "systemSizeKw": 3,
  "photoUrls": ["https://res.cloudinary.com/kiran/image/upload/roof1.jpg"],
  "signatureUrl": "https://res.cloudinary.com/kiran/image/upload/sign5.png"
}
```

Response 200: the updated job, with `hours: 6.5`.

Errors: 400 `Finish time must be after start time`, 400 `At least one photo is required`, 400 `Customer signature is required`.

---

## Support tickets (F13)

Ticket routes are mounted directly under `/api`. Only delivered units (those with a warranty end date) can have a ticket. Whether a ticket is in warranty is worked out **once, when the ticket is created**, and saved on the ticket.

### GET /serials/search (SUPPORT, DIRECTOR)

Find a unit by serial or the customer's phone. Query: `q` (at least 3 characters). Returns up to 20 delivered units, newest first.

Response 200:

```json
{
  "data": [
    {
      "serial": "INV-3K-2026-00417",
      "product": { "id": 4, "name": "On-Grid Solar Inverter 3 kW", "category": "INVERTER" },
      "customer": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655", "city": "Mohali" },
      "warrantyStart": "2026-11-25T11:00:00.000Z",
      "warrantyEnd": "2028-11-25T11:00:00.000Z",
      "warrantyStatus": "IN"
    }
  ],
  "error": null
}
```

`warrantyStatus` is `IN` while today is on or before `warrantyEnd`, otherwise `OUT`. The dates are full timestamps; show the date part only.

Errors: 400 `q: Enter at least 3 characters of a serial or phone number`.

### POST /tickets (SUPPORT)

Request:

```json
{ "serial": "INV-3K-2026-00417", "issue": "Inverter shows fault code E04, no power." }
```

`issue` must be at least 5 characters. The serial is matched in capitals, so letter case doesn't matter.

Response 201: the full ticket (same shape as `GET /tickets/:id`).

```json
{
  "data": {
    "id": 2,
    "status": "OPEN",
    "issue": "Inverter shows fault code E04, no power.",
    "warrantyStatus": "IN",
    "customer": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655" },
    "serial": "INV-3K-2026-00417",
    "createdAt": "2028-05-14T08:00:00.000Z",
    "resolution": null,
    "customerConfirmed": false,
    "closedAt": null,
    "invoice": null
  },
  "error": null
}
```

Errors: 400 `issue: Describe the problem`, 404 `Serial number not found`, 400 `This unit has not been delivered yet`, 400 `This unit already has an open ticket (#2)`.

### GET /tickets (SUPPORT, DIRECTOR)

Query: `page`, `limit`, `status` (`OPEN`, `IN_PROGRESS`, `FIXED_PENDING_CONFIRMATION`, `CLOSED`), `search` (customer name, phone or serial).

Response 200: a list of ticket summaries with `meta`. Each item has `id`, `status`, `issue`, `warrantyStatus`, `customer`, `serial` and `createdAt` (no `resolution` or `invoice`).

Errors: 400 `status: Status must be OPEN, IN_PROGRESS, FIXED_PENDING_CONFIRMATION or CLOSED`.

### GET /tickets/:id (SUPPORT, DIRECTOR)

Response 200: the full ticket, same shape as the `POST /tickets` response. `invoice` is `null` unless an out-of-warranty repair created one.

Errors: 404 `Record not found`.

### PATCH /tickets/:id/repair (SUPPORT)

Record the fix. The ticket moves to `FIXED_PENDING_CONFIRMATION`, and `notes` are saved as `resolution`.

- **In warranty:** `partsCost` and `labourCost` are optional and default to 0. No invoice is created and the cost is zero for the customer.
- **Out of warranty:** at least one of `partsCost` or `labourCost` must be above 0. A service invoice is created automatically (invoice number like `SRV-2026-0006`).

Request:

```json
{ "partsCost": 4800, "labourCost": 1500, "notes": "Replaced charge controller." }
```

Response 200: the full ticket.

```json
{
  "data": {
    "id": 2,
    "status": "FIXED_PENDING_CONFIRMATION",
    "issue": "Inverter shows fault code E04, no power.",
    "warrantyStatus": "OUT",
    "customer": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655" },
    "serial": "INV-3K-2026-00417",
    "createdAt": "2028-05-14T08:00:00.000Z",
    "resolution": "Replaced charge controller.",
    "customerConfirmed": false,
    "closedAt": null,
    "invoice": {
      "id": 6,
      "invoiceNumber": "SRV-2026-0006",
      "partsAmount": 4800,
      "labourAmount": 1500,
      "amount": 6300,
      "status": "UNPAID"
    }
  },
  "error": null
}
```

Invoice `status` is `PAID` or `UNPAID`.

Errors: 400 `Enter the parts or labour cost to bill` (out of warranty, both costs 0), 400 `Parts cost cannot be negative`, 400 `This ticket has already been repaired`, 400 `This ticket is already closed`, 404 `Record not found`.

### PATCH /tickets/:id/close (SUPPORT)

Close the ticket. Only allowed after a repair, once the customer confirms everything works.

Request:

```json
{ "customerConfirmed": true }
```

Response 200: the full ticket with `status: "CLOSED"`, `customerConfirmed: true` and `closedAt` set.

Errors: 400 `customerConfirmed: Customer has not confirmed the fix yet` (anything but `true`), 400 `Ticket has not been repaired yet`, 400 `This ticket is already closed`, 404 `Record not found`.

---

## Stock and purchases (F18)

### GET /stock (WAREHOUSE, DIRECTOR)

Stock level per product. Query: `search`, `category`.

Response 200:

```json
{
  "data": [
    { "productId": 4, "name": "On-Grid Solar Inverter 3 kW", "category": "INVERTER", "inStock": 9, "lowStockLevel": 5, "isLow": false },
    { "productId": 1, "name": "Mono PERC Solar Panel 540W", "category": "PANEL", "inStock": 8, "lowStockLevel": 20, "isLow": true }
  ],
  "error": null
}
```

### GET /stock/low (WAREHOUSE, DIRECTOR)

Only the products below their low-stock level. Same shape as `GET /stock`.

### GET /stock/movements (WAREHOUSE, DIRECTOR)

History of purchases in and dispatches out. Query: `page`, `limit`, `productId`.

Response 200:

```json
{
  "data": [
    { "id": 12, "productId": 4, "name": "On-Grid Solar Inverter 3 kW", "type": "PURCHASE", "quantity": 10, "orderId": null, "createdAt": "2026-11-18T10:00:00.000Z" },
    { "id": 13, "productId": 4, "name": "On-Grid Solar Inverter 3 kW", "type": "DISPATCH", "quantity": -1, "orderId": 3, "createdAt": "2026-11-25T08:30:00.000Z" }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
}
```

### GET /suppliers (WAREHOUSE, DIRECTOR)

Fills the supplier dropdown. Returns `id`, `name` and `city` only.

Response 200: `{ "data": [ { "id": 1, "name": "Punjab Solar Traders", "city": "Ludhiana" } ], "error": null }`

### POST /purchases (WAREHOUSE)

Add a purchase entry. Stock goes up and a stock-history row is written, all in one transaction.

Request:

```json
{ "supplierId": 1, "productId": 4, "quantity": 10, "unitCost": 31000 }
```

Response 201:

```json
{
  "data": {
    "id": 8,
    "supplier": { "id": 1, "name": "Punjab Solar Traders" },
    "productId": 4,
    "name": "On-Grid Solar Inverter 3 kW",
    "quantity": 10,
    "unitCost": 31000,
    "totalCost": 310000,
    "createdAt": "2026-11-21T10:00:00.000Z"
  },
  "error": null
}
```

Errors: 400 `quantity: Must be at least 1`, 404 `Supplier not found`, 404 `Product not found`.

### GET /purchases (WAREHOUSE, DIRECTOR)

Query: `page`, `limit`, `supplierId`. Response 200: list of purchases (same shape as above, including `name`) with `meta`.

---

## Subsidy tracker (F16)

Stages in order: `APPLIED`, `DOCUMENTS_SUBMITTED`, `APPROVED`, `RECEIVED`. Each stage after `APPLIED` records the date it was reached.

### GET /subsidies (SALES, DIRECTOR)

Query: `page`, `limit`, `stage`, `search` (customer name).

Response 200:

```json
{
  "data": [
    {
      "id": 2,
      "stage": "DOCUMENTS_SUBMITTED",
      "amount": 78000,
      "order": { "id": 3, "lead": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" } },
      "documentLinks": ["https://res.cloudinary.com/kiran/raw/upload/aadhaar5.pdf"],
      "appliedOn": "2026-11-26",
      "submittedOn": "2026-11-28",
      "approvedOn": null,
      "receivedOn": null,
      "updatedAt": "2026-11-28T09:00:00.000Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

### POST /subsidies (SALES)

Start a subsidy record for an order.

Request:

```json
{ "orderId": 3, "amount": 78000 }
```

Response 201: the new record with `stage: "APPLIED"`.

Errors: 404 `Order not found`, 400 `This order already has a subsidy record`.

### PATCH /subsidies/:id (SALES)

Move to the next stage, change the amount, or add document links. Send at least one of `stage`, `amount` or `documentLinks`.

Rules:

- Stages move **one step at a time**. They cannot skip ahead or go backwards.
- `documentLinks` are **added** to the existing links (duplicates are ignored). They do not replace them.
- At least one document link must exist before moving to `DOCUMENTS_SUBMITTED`.
- Once the stage is `RECEIVED`, the record is locked.
- Each stage change saves its date (`submittedOn`, `approvedOn`, `receivedOn`).

Request:

```json
{ "stage": "APPROVED", "amount": 78000, "documentLinks": ["https://res.cloudinary.com/kiran/raw/upload/approval5.pdf"] }
```

Response 200: the updated record.

Errors:

- 400 `Subsidy stage cannot move backwards`
- 400 `Subsidy stage must move one step at a time (next is DOCUMENTS_SUBMITTED)` (the stage named is the actual next one)
- 400 `Add at least one document link before submitting documents`
- 400 `This subsidy has already been received and cannot be changed`
- 400 `stage: Send stage, amount or documentLinks` (empty request)
- 404 `Record not found`

---

## Technician pay (F17)

Only the director sets pay rates and pays. Monthly pay = hours of every `COMPLETED` install job that finished in that month x the technician's hourly rate. Months are counted in Indian time (IST).

- **Unpaid months are live:** if the rate changes, the amount changes with it.
- **Paid months are frozen:** paying saves the hours, rate and amount. Later rate changes or new jobs never alter a paid month.

### PATCH /users/:id/pay-rate (DIRECTOR)

Set a technician's hourly rate. Must be positive, with at most 2 decimals. The user must be a technician.

Request:

```json
{ "hourlyRate": 250 }
```

Response 200:

```json
{ "data": { "id": 6, "name": "Jaspreet Singh", "hourlyRate": 250 }, "error": null }
```

Errors: 400 `hourlyRate: Must be a positive number`, 400 `hourlyRate: Use at most 2 decimal places`, 404 `Record not found` (also returned when the user is not a technician).

### GET /payroll (DIRECTOR)

Monthly pay per technician. Query: `month` (for example `2026-11`, defaults to the current month).

Paid rows have `paidAt`. Unpaid rows do not, so show the "Mark as paid" button only on rows without `paidAt`. A row with `hourlyRate: 0` cannot be paid yet, so show a warning.

Response 200:

```json
{
  "data": {
    "month": "2026-11",
    "technicians": [
      { "technicianId": 6, "name": "Jaspreet Singh", "jobs": 4, "hours": 26.5, "hourlyRate": 250, "amount": 6625, "status": "UNPAID" },
      { "technicianId": 7, "name": "Manpreet Singh", "jobs": 3, "hours": 19, "hourlyRate": 250, "amount": 4750, "status": "PAID", "paidAt": "2026-11-30T12:00:00.000Z" }
    ],
    "totalPayable": 11375,
    "totalPaid": 4750
  },
  "error": null
}
```

Errors: 400 `month: Month must look like 2026-11`.

### POST /payroll/pay (DIRECTOR)

Mark one technician's month as paid. The hours, rate and amount are saved and frozen.

Request:

```json
{ "technicianId": 6, "month": "2026-11" }
```

Response 201:

```json
{
  "data": { "technicianId": 6, "month": "2026-11", "hours": 26.5, "amount": 6625, "status": "PAID", "paidAt": "2026-11-30T12:00:00.000Z" },
  "error": null
}
```

Errors: 400 `This month is already paid for this technician`, 400 `This month has not started yet`, 400 `Nothing to pay for this month`, 400 `Set an hourly rate for this technician first`, 404 `Technician not found`.

---

## Director dashboard (F14)

All dashboard routes are DIRECTOR only, except the public shared link. All dates and ranges are counted in Indian time (IST).

How the money is worked out:

- **Revenue** = the order total.
- **Parts cost** = for each line of the order's parts list, quantity x the product's `costPrice`.
- **Technician cost** = the install job's hours x that technician's hourly rate (0 until the job is completed).
- **Profit** = revenue - parts cost - technician cost.

The summary cards cover orders confirmed in the chosen range, using the same formula as the profit table, so the cards and the table always add up.

### GET /dashboard/summary (DIRECTOR)

The summary cards. Query: `range` (`today`, `week`, `month`, default `today`). `week` runs from Monday to now.

`newLeads` = leads created in the range. `installsCompleted` = jobs finished in the range. `openRepairs` = tickets not closed (all time). `unfinishedJobs` = orders not yet `INSTALLED` (all time).

Response 200:

```json
{
  "data": {
    "range": "month",
    "from": "2026-11-01",
    "to": "2026-11-21",
    "newLeads": 14,
    "ordersConfirmed": 6,
    "installsCompleted": 4,
    "revenue": 1137000,
    "partsCost": 812000,
    "technicianCost": 31000,
    "profit": 294000,
    "openRepairs": 2,
    "unfinishedJobs": 3
  },
  "error": null
}
```

Errors: 400 `range: Range must be today, week or month`.

### GET /dashboard/profit-per-job (DIRECTOR)

The profit table. Query: `page`, `limit`, `range`, `search` (customer name).

Response 200:

```json
{
  "data": [
    {
      "orderId": 3,
      "customer": { "id": 5, "name": "Parminder Kaur Dhillon", "city": "Mohali" },
      "status": "INSTALLED",
      "revenue": 189500,
      "partsCost": 131000,
      "technicianCost": 1625,
      "profit": 56875,
      "result": "PROFIT"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 4, "totalPages": 1 }
}
```

`result` is `PROFIT` or `LOSS`. Show losses in red.

### GET /dashboard/open-repairs (DIRECTOR)

Tickets that are not closed yet, oldest first.

Response 200:

```json
{
  "data": [
    {
      "id": 2,
      "status": "OPEN",
      "issue": "Inverter shows fault code E04, no power.",
      "warrantyStatus": "IN",
      "customer": { "id": 5, "name": "Parminder Kaur Dhillon", "phone": "9988776655" },
      "daysOpen": 3
    }
  ],
  "error": null
}
```

### GET /dashboard/unfinished-jobs (DIRECTOR)

Orders that are stuck before `INSTALLED`, with the step they are waiting on.

Response 200:

```json
{
  "data": [
    {
      "orderId": 4,
      "customer": { "id": 6, "name": "Gurpreet Singh Sandhu", "city": "Ludhiana" },
      "status": "DISPATCHED",
      "waitingFor": "Delivery confirmation",
      "balance": 94500,
      "daysSinceConfirmed": 6
    }
  ],
  "error": null
}
```

### POST /dashboard/share (DIRECTOR)

Creates a read-only link to the summary so the director can share the numbers. The token is a long signed token that is valid for **7 days**. It **cannot be revoked**; it simply expires. The link address is built from `CLIENT_URL`.

Request:

```json
{ "range": "month" }
```

Response 201:

```json
{
  "data": {
    "url": "https://kiran-solar.vercel.app/shared/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-11-28T09:00:00.000Z"
  },
  "error": null
}
```

### GET /dashboard/shared/:token (Public)

What the shared link shows. The frontend page `/shared/:token` calls this with no login. Summary numbers only (revenue, costs and counts), no customer names or phone numbers.

Response 200: same as `GET /dashboard/summary`.

Errors: 404 `This link has expired or does not exist`.