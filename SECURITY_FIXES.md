# Security Fixes

This document records the critical security issues identified and fixed before deployment.

## [P0] CRITICAL: Unauthenticated Moderation Endpoints (FIXED)

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

### Fix Applied
1. **Added `generateModerationToken()` function** - Generates HMAC-SHA256 tokens specific to each row and action (approve/reject)

2. **Token validation** - `handleModeration` now:
   - Validates the token matches the expected HMAC for that row and action
   - Returns error if token is invalid or missing

3. **Moderator authentication** - Added defense-in-depth checks:
   - Verifies `Session.getActiveUser().getEmail()` returns a value
   - Checks the email against `CONFIG.MODERATORS` whitelist
   - Returns 403-style error for unauthorized users
   - Logs all unauthorized access attempts

4. **Updated email templates** - Moderation URLs now include secure tokens:
   ```javascript
   var approveToken = generateModerationToken(row, 'approved');
   var approveUrl = webAppUrl + '?action=approve&row=' + row + '&token=' + approveToken;
   ```

### Security Properties
- **Token binding**: Each token is bound to a specific row and action, preventing token reuse
- **Defense in depth**: Both token validation AND moderator whitelist checking
- **Audit trail**: All unauthorized attempts are logged
- **Clear error messages**: Users are told when they're unauthorized without revealing system details

### Code References
- Token generation: `apps-script/Code.gs:238-247`
- Token validation: `apps-script/Code.gs:167-177`
- Moderator check: `apps-script/Code.gs:179-205`
- URL generation: `apps-script/Code.gs:362-367`

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

## Testing Checklist

Before deploying the fixed version, verify:

### Authentication Testing
- [ ] **Without token**: Try accessing approve/reject URLs without token parameter → should see "Invalid or expired moderation link" error
- [ ] **With wrong token**: Modify token in URL → should see error
- [ ] **With valid token but not logged in**: Open in incognito window → should see "Unauthorized access" error
- [ ] **With valid token but wrong user**: Log in as non-moderator → should see "not authorized to moderate" error
- [ ] **With valid token and authorized user**: Should work correctly
- [ ] **Check logs**: Verify unauthorized attempts are logged with user email

### Sheet Selection Testing
- [ ] **Form submission**: Submit form, verify status columns update in correct sheet
- [ ] **After changing active tab**: Switch to a different sheet tab in UI, submit form, verify updates go to responses sheet
- [ ] **Verification workflow**: Click verification link, check correct sheet is updated
- [ ] **Moderation workflow**: Click approve/reject, check correct sheet is updated
- [ ] **Wrong sheet name**: Temporarily misconfigure `RESPONSES_SHEET` → should see error in logs

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

## Timeline

- **Issue reported**: 2025-10-11
- **Fix implemented**: 2025-10-11
- **Status**: Fixed, awaiting deployment testing

---

## Credit

Issues identified by: Security review
Fixes implemented by: Claude Code
