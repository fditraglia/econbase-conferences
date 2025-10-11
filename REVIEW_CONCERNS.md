# Review Concerns

## Blocking Issues

### [P0] Unauthenticated moderation endpoints (`apps-script/Code.gs:151`)
- Because the Apps Script web app is deployed to `ANYONE`, the `handleModeration` path accepts any `doGet` call with `action=approve|reject` and `row`, yet `token` is never validated and `Session.getActiveUser()` is not checked against `CONFIG.MODERATORS`.
- Impact: any unauthenticated visitor can approve or reject arbitrary submissions, creating a critical integrity breach and false audit trail.
- Fix: generate and embed signed, per-row moderation tokens in the moderator emails (e.g., HMAC of row + status + secret), validate them before updating the sheet, and log the authenticated moderator email. At minimum enforce a whitelist by checking `Session.getActiveUser().getEmail()` against the moderator list and rejecting empty/anonymous sessions.

### [P1] Wrong sheet selection in form trigger (`apps-script/Code.gs:16`)
- `onFormSubmit` reopens the spreadsheet and calls `getActiveSheet()`, which resolves to whichever tab the deployer last viewed rather than the form responses sheet.
- Impact: verification and status fields can be written to the wrong worksheet, corrupting moderation state.
- Fix: reference the submission sheet explicitly—use `e.range.getSheet()` or `SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESPONSES_SHEET)`—before writing moderation metadata.

## Suggested Remediation Sequence
1. Introduce a secure token scheme or moderator authentication check and update the email templates to include the token.
2. Update `handleModeration` to verify the token or active user before mutating the sheet; add clear error responses for unauthorised access.
3. Replace `getActiveSheet()` in `onFormSubmit` with a deterministic sheet lookup tied to the event payload.
4. Add regression tests/manual verification steps to ensure both fixes function before redeploying the web app.
