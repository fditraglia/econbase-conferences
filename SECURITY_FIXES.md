# Security Fixes

This document records the critical security issues identified and fixed before deployment.

## [P0] CRITICAL: Unauthenticated Moderation Endpoints (FIXED v2)

### Issue
The original implementation had a **critical authentication bypass vulnerability**. The moderation endpoints (approve/reject) were accessible to anyone with the web app URL. An attacker could construct URLs like:
```
https://script.google.com/.../exec?action=approve&row=5
```
and approve/reject arbitrary submissions without authentication.

### Root Cause
- The `handleModeration` function accepted a `token` parameter but never validated it
- No check was performed to verify the user was an authorized moderator
- `Session.getActiveUser().getEmail()` was called but the result was not validated against the moderator list

### Fix Applied (v1 - INCOMPLETE)
Initial fix added token validation and Session.getActiveUser() checking, but introduced a NEW P0 bug (see below).

### Fix Applied (v2 - COMPLETE)
1. **Added `generateModerationToken(row, action, moderatorEmail)` function** - Generates HMAC-SHA256 tokens specific to:
   - Row number
   - Action (approve/reject)
   - **Moderator email** (NEW in v2)

2. **Moderator email embedded in URL and token**:
   - URL includes: `?action=approve&row=5&moderator=user@example.com&token=HMAC`
   - Token is HMAC of: `row|action|moderator_email|secret`
   - Each moderator gets a unique token bound to their email

3. **Token validation proves moderator identity**:
   - Validates token matches expected HMAC for that row + action + moderator
   - Moderator email comes from URL but is verified by the HMAC
   - No dependency on `Session.getActiveUser()` for authentication

4. **Moderator whitelist still checked**:
   - After token validation, moderator email is checked against `CONFIG.MODERATORS`
   - This ensures only authorized moderators received the email

5. **Session user logged optionally**:
   - `Session.getActiveUser().getEmail()` is logged if present (audit purposes)
   - But blank session user is NOT treated as an error (allows external moderators)

### Security Properties
- **Token binding**: Each token is bound to specific row + action + moderator email
- **Moderator identity verified**: Token proves the moderator received the email
- **External moderator support**: Works for moderators outside the script owner's Workspace domain
- **Defense in depth**: Token validation AND moderator whitelist checking
- **Audit trail**: All attempts logged with moderator email (from token) and session user (when available)
- **Token isolation**: One moderator cannot use another moderator's token

### Code References
- Token generation: `apps-script/Code.gs:284-293`
- Token validation: `apps-script/Code.gs:191-200`
- Moderator authentication: `apps-script/Code.gs:207-222`
- Session user logging: `apps-script/Code.gs:224-231`
- URL generation: `apps-script/Code.gs:393-402`
- Email sending: `apps-script/Code.gs:414-460`

---

## [P1] Wrong Sheet Selection in Form Trigger (FIXED)

### Issue
The `onFormSubmit` trigger used `getActiveSheet()` which returns whatever sheet tab the user last had active in the UI, not necessarily the form responses sheet. This could cause:
- Verification status written to wrong sheet
- Data corruption
- Silent failures

### Root Cause
```javascript
var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getActiveSheet();
```
This is UI-dependent and unreliable in an automated trigger context.

### Fix Applied
1. **In `onFormSubmit`**: Changed to use `e.range.getSheet()` which gets the sheet from the form submission event itself:
   ```javascript
   var sheet = e.range.getSheet();
   ```

2. **In `doGet`**: Changed to explicitly reference the responses sheet by name:
   ```javascript
   var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESPONSES_SHEET);
   ```

3. **Added configuration**: New `CONFIG.RESPONSES_SHEET` setting (default: "Form Responses 1") to explicitly specify which sheet contains the form data

4. **Added error handling**: `doGet` now checks if the sheet exists and returns a clear error if not found

### Security Properties
- **Deterministic**: Sheet selection is no longer UI-dependent
- **Explicit**: Sheet name is clearly configured
- **Fail-safe**: Returns error if configured sheet doesn't exist
- **Reliable**: Works correctly in automated trigger context

### Code References
- onFormSubmit fix: `apps-script/Code.gs:19`
- doGet fix: `apps-script/Code.gs:79-84`
- Configuration: `apps-script/Config.gs:34-36`

---

## [P0] CRITICAL: External Moderator Rejection (FIXED)

### Issue
The v1 fix for unauthenticated moderation added a check that **rejected blank `Session.getActiveUser().getEmail()` values**. This broke the entire workflow because:
- Apps Script returns blank for users **outside the script owner's Workspace domain**
- External moderators (e.g., Martin using personal Gmail) are the **expected case**
- The "fix" made legitimate moderation impossible

### Root Cause
Misunderstanding of Apps Script's authentication model:
```javascript
if (!moderatorEmail) {
  return createHtmlResponse('Unauthorized access...', false);
}
```
This code rejected external moderators, which is exactly who needs to use the system.

### Impact
- Martin (and any other external moderator) would be blocked from moderating
- Workflow broken for the primary use case
- System would only work if both moderators are in the same Workspace domain (unlikely)

### Fix Applied
1. **Removed hard dependency on `Session.getActiveUser()`** for authentication
2. **Moderator email now comes from URL and is verified by token**:
   - URL includes `moderator=user@example.com`
   - Token is HMAC that includes this moderator email
   - Valid token proves the moderator email is authentic
3. **Session user is logged but not required**:
   ```javascript
   var sessionUser = Session.getActiveUser().getEmail();
   if (sessionUser) {
     Logger.log('Session user: ' + sessionUser + ' (token verified for: ' + moderatorEmail + ')');
   } else {
     Logger.log('Session user blank (external moderator), using token-verified: ' + moderatorEmail);
   }
   ```

### Security Properties
- **Works for all moderators**: Internal and external moderators both supported
- **Token proves identity**: Even when session user is blank, token verifies moderator email
- **Audit trail preserved**: Logs both token-verified email and session user (when available)
- **No regression**: External moderators work exactly as intended

### Code References
- External moderator handling: `apps-script/Code.gs:224-231`
- Moderator parameter extraction: `apps-script/Code.gs:74`
- Token validation with moderator: `apps-script/Code.gs:191-200`

---

## Testing Checklist

Before deploying the fixed version, verify:

### Authentication Testing
- [ ] **Without token**: Try accessing approve/reject URLs without token parameter → should see "Invalid moderation link" error
- [ ] **With wrong token**: Modify token in URL → should see "Invalid or expired moderation link" error
- [ ] **With wrong moderator email**: Modify moderator parameter in URL → should see "Invalid or expired moderation link" (token won't match)
- [ ] **With valid token for different moderator**: Copy URL from one moderator's email and try with different moderator logged in → should work (token is what matters, not session user)
- [ ] **With valid token, not logged in (incognito)**: Should work correctly (external moderator case)
- [ ] **With valid token, logged in as different user**: Should work correctly (session user doesn't matter)
- [ ] **With token for non-existent moderator**: Should see "not sent to an authorized moderator" error
- [ ] **External moderator (personal Gmail)**: Should work perfectly with blank session user
- [ ] **Check logs**: Verify all attempts logged with moderator email and session user status

### Sheet Selection Testing
- [ ] **Form submission**: Submit form, verify status columns update in correct sheet
- [ ] **After changing active tab**: Switch to a different sheet tab in UI, submit form, verify updates go to responses sheet
- [ ] **Verification workflow**: Click verification link, check correct sheet is updated
- [ ] **Moderation workflow**: Click approve/reject, check correct sheet is updated
- [ ] **Wrong sheet name**: Temporarily misconfigure `RESPONSES_SHEET` → should see error in logs

### Submission ID Testing (CRITICAL)
- [ ] **Submission ID generated**: Submit form, verify column J contains ID like "1696204800000-a3f2b1"
- [ ] **Sort sheet by name**: Sort spreadsheet by conference name
- [ ] **Verification still works**: Click old verification link → should find submission by ID and verify correct one
- [ ] **Moderation still works**: Click old moderation link → should find submission by ID and moderate correct one
- [ ] **Check logs**: Verify logs show both submission ID and current row number
- [ ] **Delete submission**: Delete a row, click its old verification link → should show "Submission not found"
- [ ] **Filter sheet**: Apply filter, verify links still work
- [ ] **Insert row above**: Insert row above submission, verify links still work (row number changed but ID didn't)

### Regression Testing
- [ ] Complete end-to-end flow: submit → verify → moderate → approve
- [ ] All email notifications still work correctly
- [ ] Error messages are user-friendly
- [ ] Logs contain useful debugging information

---

## Deployment Notes

**IMPORTANT**: After deploying these fixes, any old moderation emails will have URLs without tokens. Moderators should:
1. Ignore old moderation emails (they won't work)
2. Check the spreadsheet directly for any pending submissions
3. For pending submissions, manually verify the email first, which will trigger new moderation emails with valid tokens
4. Or manually update the status in the spreadsheet if needed

**Version compatibility**: These fixes are **not backward compatible** with old moderation email links. This is intentional and correct for security.

---

---

## [P0] CRITICAL: Row-Sensitive Tokens (FIXED)

### Issue
**ALL tokens (verification and moderation) were based on mutable row numbers**. If someone sorts or filters the spreadsheet, row numbers change, causing:
- Moderation links to act on the **wrong submission**
- Verification links to fail or verify the wrong submission

### Example Attack Scenario
1. Submission A arrives at row 2, moderator email sent
2. Someone sorts sheet by conference name
3. Submission A moves to row 5, different submission now at row 2
4. Moderator clicks "APPROVE" → accidentally approves wrong conference!

### Root Cause
Tokens embedded row numbers:
```javascript
// OLD - BAD
var token = generateModerationToken(row, action, moderator);
var url = webAppUrl + '?action=approve&row=' + row + '&token=' + token;
```

Row numbers are **mutable** - they change on sort, filter, or row insertion.

### Fix Applied
1. **Added SUBMISSION_ID column** (new column J):
   - Format: `timestamp-randomHex` (e.g., `1696204800000-a3f2b1`)
   - Generated once on form submission
   - **Never changes** even if rows reorder

2. **Updated all tokens to use submission ID**:
   ```javascript
   var token = generateModerationToken(submissionId, action, moderator);
   var url = webAppUrl + '?action=approve&id=' + submissionId + '&token=' + token;
   ```

3. **Added `findRowBySubmissionId()` function**:
   - Looks up current row by scanning submission ID column
   - Returns null if not found (submission deleted)

4. **Updated all handlers**:
   - `handleVerification()` - looks up row by ID
   - `handleModeration()` - looks up row by ID
   - URLs use `?id=SUBMISSION_ID` instead of `?row=NUMBER`

### Security Properties
- **Immune to reordering**: Tokens remain valid regardless of sort/filter
- **Integrity preserved**: Moderators always act on correct submission
- **Graceful degradation**: Returns "not found" if submission deleted
- **Performance**: O(n) lookup is acceptable for submission volumes

### Impact on Sheet Structure
**IMPORTANT**: This changes the column layout!

**OLD columns**:
- A-I: Form fields
- J: Email Verified
- K: Status
- L: Moderated By
- M: Moderated At

**NEW columns**:
- A-I: Form fields
- **J: Submission ID** (NEW!)
- K: Email Verified
- L: Status
- M: Moderated By
- N: Moderated At

When setting up the sheet, you must add the "Submission ID" column header at position J.

### Code References
- Submission ID generation: `apps-script/Code.gs:309-313`
- Row lookup function: `apps-script/Code.gs:321-332`
- Token generation (verification): `apps-script/Code.gs:339-348`
- Token generation (moderation): `apps-script/Code.gs:357-366`
- Form submission handler: `apps-script/Code.gs:26, 40`
- URL generation: `apps-script/Code.gs:374, 452-453`

---

## Timeline

- **Initial issues reported**: 2025-10-11
- **Fix v1 implemented**: 2025-10-11 (incomplete - introduced new P0)
- **Fix v2 implemented**: 2025-10-11 (complete - removed Session.getActiveUser() dependency)
- **Fix v3 implemented**: 2025-10-11 (complete - stable submission IDs replace row-based tokens)
- **Status**: Fixed, awaiting deployment testing

---

## Credit

Issues identified by: Security review
Fixes implemented by: Claude Code
