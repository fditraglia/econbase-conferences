# Next Steps

This file tracks the immediate next steps for deploying the EconBase Conference Listings system.

## Phase 1: Google Form & Sheet Setup

- [ ] **Create Google Form**
  - Add all required fields from IMPLEMENTATION.md section "Google Form Fields"
  - Add privacy notice to form header
  - Enable email and URL validation
  - Test form submission
  - Copy form URL for website integration

- [ ] **Set Up Google Sheet**
  - Form should auto-create sheet, or link manually
  - Rename first sheet to "Responses"
  - Manually add column headers for columns J-M:
    - J: Email Verified
    - K: Status
    - L: Moderated By
    - M: Moderated At
  - Set up conditional formatting (optional but helpful):
    - Status = APPROVED → Green background
    - Status = REJECTED → Red background
    - Status = PENDING → Yellow background
    - Email Verified = VERIFIED → Light blue background
  - Configure sharing: You + Martin as editors, no one else
  - Copy Sheet ID from URL (needed for Config.gs and .Renviron)

## Phase 2: Apps Script Configuration & Deployment

- [ ] **Generate Secrets**
  - Run: `openssl rand -base64 32`
  - Save the output securely (you'll need it for Config.gs)

- [ ] **Update Config.gs Locally**
  - Open `apps-script/Config.gs`
  - Replace `MODERATOR_1_EMAIL` with your email
  - Replace `MODERATOR_2_EMAIL` with Martin's email
  - Replace `VERIFICATION_SECRET` with generated secret
  - Replace `YOUR_SHEET_ID_HERE` with actual Sheet ID
  - Verify `RESPONSES_SHEET` matches your sheet name (check in Google Sheets)
  - **DO NOT commit these changes to git**

- [ ] **Install clasp and Deploy**
  ```bash
  npm install -g @google/clasp
  clasp login
  cd apps-script
  clasp create --title "EconBase Conference Moderation" --type sheets
  clasp push
  ```

- [ ] **Deploy as Web App**
  - Run: `clasp open`
  - In Apps Script editor: Deploy → New deployment
  - Type: Web app
  - Execute as: Me
  - Who has access: Anyone
  - Click Deploy
  - Copy web app URL and save it

- [ ] **Set Up Form Submit Trigger**
  - In Apps Script editor, click clock icon (Triggers)
  - Add Trigger:
    - Function: `onFormSubmit`
    - Event source: From spreadsheet
    - Event type: On form submit
  - Save

- [ ] **Authorize Permissions**
  - Apps Script will ask for permissions the first time
  - Review and authorize

## Phase 3: Testing

Follow the testing checklist in `apps-script/DEPLOYMENT.md`:

- [ ] **Test Verification Flow**
  - Submit test form entry
  - Check verification email received
  - Click verification link
  - Verify Sheet updated with VERIFIED status
  - Check moderator email received

- [ ] **Test Moderation Flow**
  - Click APPROVE in moderator email
  - Verify Sheet updated with APPROVED status
  - Check other moderator received notification
  - Check submitter received approval email

- [ ] **Test Edge Cases**
  - Click verification link twice (should show "already verified")
  - Click approve twice (should show "already approved")
  - Test with expired link (manually adjust timestamp in Sheet)

## Phase 4: R Scripts Setup

- [ ] **Install R Packages**
  ```bash
  R -e "install.packages(c('googlesheets4', 'tidyverse', 'jsonlite'))"
  ```

- [ ] **Configure Authentication**
  - For local development: Run R script, it will prompt for OAuth
  - For production/automation: Set up service account (see api/README.md)

- [ ] **Create .Renviron**
  ```bash
  cd api
  cp .Renviron.example .Renviron
  # Edit .Renviron and add your Sheet ID
  ```

- [ ] **Create R Scripts**
  - Write `get-conferences.R` (reads approved conferences, outputs JSON)
  - Write `cleanup-old-data.R` (GDPR compliance, removes old emails)
  - See IMPLEMENTATION.md for code examples

- [ ] **Test R Scripts**
  ```bash
  cd api
  Rscript get-conferences.R
  # Verify ../website/data/conferences.json was created
  ```

- [ ] **Schedule R Scripts**
  - Set up cron job, GitHub Actions, or manual execution
  - See api/README.md for options

## Phase 5: Privacy Policy

- [ ] **Write Privacy Policy**
  - Use template from IMPLEMENTATION.md
  - Customize for EconBase
  - Include: data collected, purpose, retention (12 months), rights, contact

- [ ] **Publish Privacy Policy**
  - Create `website/privacy.html`
  - Upload to EconBase website
  - Get final URL

- [ ] **Update Links**
  - Update `CONFIG.URLS.PRIVACY_POLICY` in Config.gs
  - Update form header with privacy policy link
  - Redeploy Apps Script: `clasp push`

## Phase 6: Website Integration

- [ ] **Choose Integration Method**
  - See website/README.md for examples
  - Vanilla JavaScript, React, or server-side

- [ ] **Implement Conference Display**
  - Fetch from `conferences.json`
  - Display upcoming conferences
  - Link to conference websites

- [ ] **Add Submission Link**
  - Link to Google Form from website
  - Label: "Submit a Conference" or similar

- [ ] **Test Integration**
  - Verify conferences display correctly
  - Test empty state (no conferences)
  - Check responsive design

## Phase 7: Launch

- [ ] **Final Review**
  - Complete full checklist in `apps-script/DEPLOYMENT.md`
  - Verify no secrets in git history
  - Test end-to-end flow one more time

- [ ] **Soft Launch**
  - Announce to small group first
  - Monitor closely for issues
  - Be ready to fix bugs quickly

- [ ] **Public Announcement**
  - Post to relevant mailing lists
  - Social media announcement
  - Update EconBase homepage

- [ ] **Monitor**
  - Watch for spam submissions
  - Check email delivery rates
  - Verify moderation workflow is smooth
  - Collect feedback

## Phase 8: Post-Launch

- [ ] **Schedule Cleanup**
  - Set up monthly cron job for `cleanup-old-data.R`
  - Verify it runs successfully

- [ ] **Documentation**
  - Share MODERATION.md with Martin
  - Document any issues encountered
  - Update README with launch date

- [ ] **Evaluate**
  - After first month, review submission volume
  - Check if moderation guidelines need updates
  - Consider Phase 2 features if needed

## Quick Reference

**Key Files to Update Locally (Not Committed):**
- `apps-script/Config.gs` - Production moderator emails, secret, Sheet ID
- `api/.Renviron` - Sheet ID for R scripts
- `.clasp.json` - Auto-generated by clasp (gitignored)

**Key Commands:**
```bash
# Apps Script
clasp push                    # Upload code
clasp open                    # Open in browser
clasp logs                    # View execution logs

# R
Rscript api/get-conferences.R        # Generate JSON
Rscript api/cleanup-old-data.R       # Clean old data

# Testing
python3 -m http.server 8000   # Test website locally
```

**Important URLs to Save:**
- Google Form URL: _______________
- Google Sheet ID: _______________
- Apps Script Web App URL: _______________
- Privacy Policy URL: _______________

## Questions or Issues?

- Review IMPLEMENTATION.md for detailed specifications
- Check DEPLOYMENT.md for complete checklist
- See README files in each directory for specific help
- Contact: contact@econbase.org
