# Gift Card Manager

Internal web application for managing digital gift cards, tracking availability and usage, checking remaining balances, and maintaining an audit trail.

## Overview

The Gift Card Manager is designed for internal operational use where gift card codes need to be stored, issued to suppliers or service providers, tracked after use, and reconciled against their remaining balance.

The application provides two access levels:

- **User**: can view available gift cards, copy voucher details, check balances, and mark cards as used.
- **Admin**: has full access, including upload, edit, delete, restore, audit log access, and user administration.

## Main Features

### Gift Card Management

- Store gift card code, PIN, value, currency, batch, recipient/vendor and notes
- Import multiple cards by paste, CSV or Excel
- Copy code, PIN and value together as one package
- Mask PINs by default
- Mark gift cards as used
- Restore used cards
- Edit active cards
- Delete cards
- Keep CHF, EUR and other currencies separate

### Balance Tracking

The dashboard supports manual balance reconciliation against the official external balance-check service.

The workflow is:

1. Click **Check**
2. The gift card code is copied automatically
3. The official balance-check page opens
4. Complete the external CAPTCHA
5. Paste the code
6. Read the returned remaining balance
7. Return to the Gift Card Manager
8. Enter and save the remaining balance

The application derives the display status from the latest recorded balance:

- **Available**: remaining balance equals the original value
- **Partially used**: remaining balance is greater than 0 but lower than the original value
- **Used**: remaining balance is 0 or the card has been manually marked as used

The dashboard always sorts cards in this order:

1. Available
2. Partially used
3. Used

Within each group, the newest cards appear first.

### Dashboard

The dashboard shows:

- Number of available cards
- Number of partially used cards
- Number of used cards
- Total remaining value by currency
- Search across code, recipient/vendor, batch and notes
- Status filters
- Remaining balance
- Last balance-check timestamp
- Usage date
- Administrative actions

### User Management

Admins can manage users from the internal user-management page.

Roles:

#### User

Can:

- View gift cards
- Copy gift card details
- View PINs
- Check balances
- Mark cards as used

Cannot:

- Upload gift cards
- Edit cards
- Delete cards
- Restore cards
- Access the audit log
- Manage users

#### Admin

Can perform all user actions plus:

- Upload gift cards
- Edit gift cards
- Delete gift cards
- Restore cards
- View the audit log
- Invite users
- Change user roles
- Manage user access

### Audit Log

Administrative and gift card changes are recorded in the database audit log.

The audit log is intended to provide traceability for actions such as:

- Card creation
- Card updates
- Marking a card as used
- Restoring a card
- Deleting a card

The application does not provide a way to edit or delete audit records.

## Technology Stack

- **Next.js**
- **React**
- **TypeScript**
- **Supabase**
  - Authentication
  - PostgreSQL database
  - Row-level security
- **Vercel**
  - Hosting
  - Automatic deployments from GitHub
- **Lucide React**
  - UI icons
- **SheetJS / XLSX**
  - Excel import support

## Project Structure

```text
app/
├── admin/
│   ├── audit/
│   └── users/
├── api/
│   └── admin/
│       └── users/
├── auth/
│   └── callback/
├── forgot-password/
├── login/
├── reset-password/
├── globals.css
├── layout.tsx
└── page.tsx

components/
└── GiftCardDashboard.tsx

lib/
└── supabase/

public/
└── on-logo-black.svg

supabase/
└── SQL migration / setup files
```

## Environment Variables

The application requires Supabase environment variables in Vercel.

Typical variables include:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Do not commit real production secrets to GitHub.

The `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Start the production build locally:

```bash
npm start
```

## Deployment

The project is deployed through Vercel.

Recommended workflow:

1. Make changes in GitHub
2. Commit to `main`
3. Vercel detects the commit automatically
4. Wait until the deployment status shows **Ready**
5. Test using the stable production domain

Avoid using temporary preview deployment URLs for normal login testing.

## Supabase Setup

The application relies on the following Supabase areas:

- Authentication
- `profiles`
- `gift_cards`
- audit tables/functions/triggers
- role and access policies

Gift card records include fields such as:

```text
id
code
pin
value
currency
status
batch_label
recipient
note
used_at
used_by
created_at
remaining_balance
last_balance_check
```

The exact database schema should be maintained through SQL migration/setup files in the `supabase/` directory.

## Authentication

Authentication is handled by Supabase.

Supported flows include:

- Email/password login
- User invitations
- Forgot password
- Password reset
- Admin/user role assignment

Production redirect URLs must be configured correctly in Supabase Authentication settings.

## Security Notes

This application contains sensitive voucher credentials.

Important controls:

- Access requires authentication
- PINs are masked by default
- Admin functionality is restricted by role
- Administrative actions are audited
- Production secrets must never be exposed client-side
- The Supabase service-role key must never be placed in browser code
- Voucher data should not be shared outside approved internal workflows

The external balance-check CAPTCHA must not be bypassed or automated.

## Mobile Support

The dashboard is responsive.

On smaller screens:

- The wide desktop table changes into stacked gift card cards
- Horizontal table scrolling is avoided
- Actions remain accessible
- Filters and statistics reflow for smaller displays

## Gift Card Import Format

### Paste

Example:

```text
638889001467108225188    2717
638889001595108225194    2412
```

### CSV / Excel

Recommended columns:

```text
code
pin
value
currency
batch
```

Only `code` and `pin` are mandatory when a default value and currency are entered during import.

## Operational Notes

A gift card being marked as used in the application means it has been issued or recorded as used operationally.

The balance check is the more reliable method for determining the actual remaining voucher value.

For this reason, the latest recorded remaining balance should be treated as the operational source of truth for dashboard value reporting.

## Current Limitations

- Balance checking is not fully automated because the official external service requires CAPTCHA verification
- Remaining balances therefore require a manual confirmation step
- User invitation emails are subject to Supabase email rate limits unless a custom SMTP provider is configured
- Temporary Vercel preview URLs may occasionally trigger browser security warnings; use the stable production domain for normal operation

## Branding

The application uses the official On logo supplied for this internal project.

Brand assets are stored in:

```text
public/
```

## Maintenance

When changing the application:

1. Update the relevant TypeScript or CSS file
2. Commit the change to GitHub
3. Confirm the Vercel production deployment succeeds
4. Test login
5. Test role permissions
6. Test gift card actions
7. Test audit logging
8. Test balance checking
9. Test on mobile

## Status

Internal operational tool.

Not intended for public or customer-facing use.
