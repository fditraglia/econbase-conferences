# Review Concerns

## Blocking Issues

### [P0] Unauthenticated moderation endpoints (`apps-script/Code.gs:151`)
- Because the Apps Script web app is deployed to `ANYONE`, the `handleModeration` path accepts any `doGet` call with `action=approve|reject` and `row`, yet `token` is never validated and—prior to the latest patch—`Session.getActiveUser()` was not checked against `CONFIG.MODERATORS`.
- Impact: any unauthenticated visitor can approve or reject arbitrary submissions, creating a critical integrity breach and false audit trail.
- Fix: generate and embed signed, per-row moderation tokens in the moderator emails (e.g., HMAC of row + status + secret), validate them before updating the sheet, and log the authorised moderator identifier. Avoid relying solely on `Session.getActiveUser()` because it often returns blank for moderators outside the owner’s Workspace domain; prefer token verification or a custom signed payload tied to the moderator’s email address.

### [P1] Wrong sheet selection in form trigger (`apps-script/Code.gs:16`)
- `onFormSubmit` reopens the spreadsheet and calls `getActiveSheet()`, which resolves to whichever tab the deployer last viewed rather than the form responses sheet.
- Impact: verification and status fields can be written to the wrong worksheet, corrupting moderation state.
- Fix: reference the submission sheet explicitly—use `e.range.getSheet()` or `SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESPONSES_SHEET)`—before writing moderation metadata.

### [P0] External moderator rejection (`apps-script/Code.gs:185`)
- The follow-up change that blocks blank `Session.getActiveUser().getEmail()` now rejects all moderators outside the owner’s Workspace domain—exactly the expected case—breaking the workflow.
- Impact: legitimate moderators using personal Gmail or other domains are denied approval/rejection actions, regressing functionality compared to the previous release.
- Fix: remove the hard dependency on `Session.getActiveUser()` for authentication. Instead, rely on the signed moderation tokens noted above, or fetch moderator identity from the token itself. Optionally log the active user when present, but do not treat blank values as an automatic failure.

## Suggested Remediation Sequence
1. Introduce a secure token scheme or alternate moderator authentication and update the email templates to include the token.
2. Update `handleModeration` to validate the token, allow external moderators, and prefer logging the token-derived moderator email when `Session.getActiveUser()` is blank.
3. Replace `getActiveSheet()` in `onFormSubmit` with a deterministic sheet lookup tied to the event payload.
4. Add regression tests/manual verification steps to ensure both fixes function before redeploying the web app.
