# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Google Form & Sheet Setup
- [ ] Google Form created with all required fields (see IMPLEMENTATION.md)
- [ ] Privacy notice added to form header
- [ ] Form validation enabled (email format, URL format)
- [ ] Form linked to new Google Sheet
- [ ] Sheet columns J-M headers added manually
- [ ] Conditional formatting applied to Status and Email Verified columns
- [ ] Sheet sharing configured (view/edit for both moderators only)

### Security Configuration
- [ ] Verification secret generated: `openssl rand -base64 32`
- [ ] `.gitignore` file created and verified
- [ ] Config.gs updated locally with:
  - [ ] Actual moderator email addresses
  - [ ] Generated verification secret
  - [ ] Google Sheet ID from Sheet URL
- [ ] Verified no secrets in git history: `git log --all --source -- '*secret*' '*config*'`
- [ ] Production Config.gs NOT committed to git

### Apps Script Setup
- [ ] clasp installed globally: `npm install -g @google/clasp`
- [ ] clasp logged in: `clasp login`
- [ ] Apps Script project created and linked to Sheet
- [ ] Code pushed to Apps Script: `clasp push`
- [ ] Web app deployed with settings:
  - Execute as: Me
  - Who has access: Anyone
- [ ] Web app URL copied and saved
- [ ] Form submit trigger configured
- [ ] Script permissions authorized

### Privacy & Legal
- [ ] Privacy policy written and published
- [ ] Privacy policy URL updated in Config.gs
- [ ] Contact email configured (contact@econbase.org)
- [ ] Data retention policy documented (12 months)
- [ ] GDPR compliance verified

## Testing

### Verification Flow
- [ ] Test form submission sent
- [ ] Verification email received (check spam folder)
- [ ] Verification link clicked successfully
- [ ] Sheet updated with VERIFIED status
- [ ] Error shown for already-verified entry
- [ ] Error shown for expired token (manually test by changing timestamp)

### Moderation Flow
- [ ] Moderator email received after verification
- [ ] Email contains all conference details
- [ ] APPROVE button works and updates Sheet
- [ ] REJECT button works and updates Sheet
- [ ] Moderator name recorded in "Moderated By" column
- [ ] Timestamp recorded in "Moderated At" column
- [ ] Other moderator receives notification email
- [ ] Error shown for already-moderated entry

### Submitter Notifications
- [ ] Approval notification sent to submitter
- [ ] Email contains link to conferences page
- [ ] Email includes privacy/retention information

### Edge Cases
- [ ] Double-click on verification link handled gracefully
- [ ] Double-click on approve/reject handled gracefully
- [ ] Invalid tokens show appropriate error message
- [ ] Expired tokens (>7 days) show appropriate error
- [ ] Form validation catches malformed emails/URLs

## Post-Deployment

### Monitoring
- [ ] First real submission monitored closely
- [ ] Email delivery confirmed for all parties
- [ ] Sheet updates verified
- [ ] Execution logs checked for errors: `clasp logs`

### Documentation
- [ ] MODERATION.md shared with both moderators
- [ ] Contact email monitoring set up
- [ ] Issue tracking prepared for bug reports

### Integration
- [ ] R script configured (see api/README.md)
- [ ] Website integration tested
- [ ] "Submit Conference" link added to website
- [ ] Privacy policy link accessible from form

## Security Review

Before making repository public:
- [ ] .gitignore verified and complete
- [ ] Config.gs in repo has ONLY placeholder values
- [ ] No credentials in any committed files
- [ ] No service account JSON files in repo
- [ ] .clasp.json is gitignored
- [ ] .Renviron is gitignored
- [ ] Security section of IMPLEMENTATION.md reviewed

## Launch

- [ ] Announcement prepared for social media/mailing lists
- [ ] Moderators briefed and ready
- [ ] Both moderators can access Google Sheet
- [ ] Both moderators can receive and respond to moderation emails
- [ ] Backup/export plan for Sheet data established
- [ ] Monthly cleanup script scheduled (see api/cleanup-old-data.R)

## Post-Launch (First Week)

- [ ] Monitor submission volume
- [ ] Check for spam submissions
- [ ] Verify moderation workflow is smooth
- [ ] Collect feedback from early submitters
- [ ] Document any issues or needed improvements
- [ ] Review email delivery rates
- [ ] Check Apps Script execution quotas

## Post-Launch (First Month)

- [ ] Review moderation guidelines based on actual submissions
- [ ] Check data retention compliance
- [ ] Run first data cleanup (if 12+ months since any conference dates)
- [ ] Evaluate need for any Phase 2 features
- [ ] Survey both moderators on workflow efficiency

## Rollback Plan

If critical issues occur:

1. **Stop accepting new submissions:**
   - Temporarily close Google Form or add warning message

2. **Fix the issue:**
   - Update code locally
   - Test thoroughly
   - Push with `clasp push`
   - Re-deploy if needed

3. **Manually handle pending submissions:**
   - Check Sheet for VERIFIED but not APPROVED entries
   - Email moderators directly with details
   - Manually update statuses if needed

4. **Communicate:**
   - Email affected submitters if necessary
   - Post status update if system is down

## Emergency Contacts

- Script Owner: [Your email]
- Co-Moderator: [Martin's email]
- Technical Support: contact@econbase.org
- Google Apps Script Status: https://www.google.com/appsstatus

## Notes

- Keep this checklist updated as you learn from deployment experience
- Document any deployment issues for future reference
- Review and update after major changes to the system
