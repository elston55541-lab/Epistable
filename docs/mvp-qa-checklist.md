# Epistable MVP QA Checklist

Use this checklist before a release, after large product changes, or before a customer demo.

## Test Setup

- App URL: preview or production URL being tested
- Factory admin: `admin@jodhpurfactory.com`
- Test password: `TempAdmin123!`
- Known test slab: `SLB-MNUI5BS0WVH`
- Known test quote: `QTE-QA-MP9GZ4JI`
- Browser: run once on desktop width and once on mobile width

## 1. Authentication

- Open the app and sign in as the factory admin.
- Confirm login lands on the factory dashboard.
- Reload the page.
- Confirm the session is restored and does not log out unexpectedly.
- Sign out.
- Confirm the login page appears again.

Pass condition: login, reload, and logout work without hanging or losing session incorrectly.

## 2. Factory Dashboard

- Sign in as factory admin.
- Confirm Home loads without full-page blocking after login.
- Confirm setup checklist, next actions, KPIs, and sales signals render.
- Open each admin tab: Sales, Quotes, Team, Suppliers, Buyers, Inquiries, Disputes, Alerts.
- Refresh the browser on one admin tab.

Pass condition: each tab opens, data refreshes, and any failure shows a visible retry/error state.

## 3. Scan To Certificate

- Open Scan.
- Select stone type and supplier mode.
- Add or confirm evidence photos if available.
- Enter measurements.
- Add defects or mark no defect.
- Run AI grading.
- Save the slab.
- Open History.
- Open the saved slab details.
- Open QR/certificate.

Pass condition: saved slab appears in History, has grade/details/photos, and certificate opens publicly.

## 4. Public Slab Certificate

- Open `/slab/SLB-MNUI5BS0WVH`.
- Confirm the certificate loads without requiring login.
- Confirm the page shows grade, price, factory, measurements, defects, photo evidence, inventory status, and verification checklist.
- Use Copy Summary.
- Use Print / Save PDF.
- Submit an inquiry with name plus email or phone.
- Submit a dispute/mismatch report with required details.

Pass condition: certificate is buyer-readable, shareable, printable, and public forms create records or show clear errors.

## 5. Buyer Inventory

- From factory dashboard, open Public Inventory Preview.
- Confirm Premium and Standard slabs appear.
- Test filters: grade, stone, supplier, export, status, max price, search.
- Save a slab to shortlist.
- Copy shortlist.
- Open a slab certificate from inventory.
- Request a quote from an available slab.

Pass condition: buyers can find slabs, shortlist them, inspect certificates, and request quotes.

## 6. Inquiries To Quote

- Return to factory admin.
- Open Inquiries.
- Confirm the buyer request appears.
- Open the inquiry.
- Set priority or follow-up if needed.
- Create quote with area, rate, validity, and notes.
- Confirm inquiry/slab moves to reserved where expected.

Pass condition: an inquiry can become a quote without manual database edits.

## 7. Buyer Quote Response

- Open the public quote link or `/quote/QTE-QA-MP9GZ4JI`.
- Confirm quote details, buyer checklist, total, validity, and slab certificate link.
- Copy quote summary.
- Accept quote or request changes using a test quote.
- Confirm the page shows a clear success/error state.

Pass condition: buyer can respond from a public quote page and the factory can see the updated status.

## 8. Order Tracking

- In factory admin, open Quotes or Sales.
- Confirm accepted quotes show next fulfillment action.
- Move fulfillment through payment pending, payment received, dispatch scheduled, dispatched, delivered, sold.
- Confirm buyer quote/order page reflects the status.

Pass condition: quote acceptance can become a tracked order and eventually a sold slab.

## 9. Access Management

- As owner or factory admin, create a test user profile.
- Confirm invite instructions are visible.
- Edit role/status.
- Suspend and restore access.
- Confirm suspended users cannot proceed normally.

Pass condition: admins can manage user access without database edits.

## 10. Mobile Smoke Test

- Open login on mobile width.
- Sign in.
- Check Home, Scan, History, Buyer Inventory, Certificate, and Quote page.
- Confirm no text overlaps, controls are tappable, and fixed bars do not hide primary actions.

Pass condition: the core MVP path is usable on mobile.

## Release Gate

Do not release if any of these fail:

- Login or session restore is broken.
- New slab cannot be saved.
- Public certificate cannot load.
- Buyer quote request cannot be created.
- Factory cannot create or update a quote.
- Accepted quote cannot be tracked.
- Any critical user flow hangs without a visible error or retry option.
