# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EconBase Conference Listings is a community-driven conference/workshop submission and listing service for the econometrics community. It replaces the defunct "Econometric Links" service previously run by Marius Ooms.

**Architecture:** Google Forms + Google Sheets + Google Apps Script for submission and moderation, with R scripts for data export to the website.

**Key Design Principle:** Platform-agnostic implementation that enables parallel development without blocking on main EconBase platform decisions.

## Repository Structure (Planned)

This is a new repository. The full implementation will include:

- `apps-script/` - Google Apps Script code for email verification and moderation workflow
- `api/` - R scripts for reading approved conferences from Google Sheets and exporting to JSON
- `website/` - Integration code and privacy policy
- `IMPLEMENTATION.md` - Complete technical specification (already present)

## Development Philosophy

### Security First
- **Never commit secrets** - Config.gs contains placeholders only
- `.clasp.json`, `.Renviron`, and credential files must be gitignored
- Use `openssl rand -base64 32` to generate verification secrets
- Consider using Apps Script Properties Service for production secrets

### Data Privacy
- GDPR-compliant data handling
- 12-month retention policy for submitter emails
- Privacy policy must be accessible before implementation goes live

### Platform Independence
- System is designed to work regardless of final EconBase platform choice
- Data export via JSON enables easy migration
- R scripts are stateless and can run anywhere

## Key Architecture Decisions

### Google Apps Script Workflow
1. **onFormSubmit trigger** - Generates verification token, sends email to submitter
2. **doGet web app** - Handles verification links and approve/reject buttons
3. **Email-based moderation** - One-click approve/reject workflow for moderators

### Data Flow
```
Google Form → Google Sheet → Apps Script (verification + moderation) → R Script → JSON → Website
```

### Column Structure
Sheet has both form-generated columns (A-I) and script-managed columns (J-M):
- J: Email Verified (UNVERIFIED/VERIFIED/EMAIL_FAILED)
- K: Status (PENDING/APPROVED/REJECTED)
- L: Moderated By (email of moderator who took action)
- M: Moderated At (timestamp)

## Development Commands

### Google Apps Script Deployment

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google account
clasp login

# Create new Apps Script project (one-time setup)
clasp create --title "EconBase Conference Moderation" --type sheets --rootDir ./apps-script

# Push code to Google Apps Script
cd apps-script
clasp push

# Open in Apps Script editor for deployment
clasp open
```

### R Script Development

```bash
# Test conference data export
cd api
Rscript get-conferences.R

# Test data cleanup script
Rscript cleanup-old-data.R

# Install required R packages
R -e "install.packages(c('googlesheets4', 'tidyverse', 'jsonlite'))"
```

### Configuration Setup

Before deploying, you must create local configuration:

```bash
# Generate verification secret
openssl rand -base64 32

# Create .Renviron for R scripts (in api/ directory)
echo 'GOOGLE_SHEET_ID="your_actual_sheet_id"' > api/.Renviron
```

## Critical Implementation Details

### Verification Token Security
- Tokens are SHA-256 hashes of: row + secret + timestamp
- 7-day expiration enforced
- Secret must be cryptographically random (32 bytes minimum)

### Email Template Requirements
- Verification emails must include clickable links with token
- Moderation emails must have HTML buttons (APPROVE/REJECT) that call the web app
- All emails should include privacy notice and contact information

### R Script Authentication
- Use `gs4_auth()` for interactive development
- Use service account JSON for production/automation
- Service account must have read access to the Google Sheet

### Testing Requirements
Before going live, test:
1. Form submission → verification email arrives
2. Verification link click → status updates to VERIFIED
3. Moderator email arrives with approve/reject buttons
4. Approve button → status updates, other moderator notified
5. R script correctly filters VERIFIED + APPROVED entries
6. Expired verification links show appropriate error

## Common Workflows

### Adding New Features to Apps Script
1. Edit Code.gs locally
2. Run `clasp push` to upload changes
3. Test using Apps Script editor (clasp open)
4. Verify triggers are still configured correctly

### Updating Configuration
1. Edit Config.gs locally (never commit production values)
2. Push with `clasp push`
3. For Properties Service approach: run setup function once in Apps Script editor

### Modifying Email Templates
Email templates are in Code.gs as string literals. When editing:
- Preserve HTML structure for moderation emails
- Keep URLs parameterized
- Include unsubscribe/privacy information

### Data Export Updates
If changing JSON structure:
1. Update get-conferences.R
2. Test output with: `jsonlite::prettify(jsonlite::toJSON(conferences))`
3. Update website integration code accordingly

## Important Constraints

### Google Apps Script Limits
- 6-minute execution time limit per trigger
- 100 email recipients per day (free Gmail accounts)
- Use MailApp.sendEmail() not GmailApp for web app compatibility

### Google Sheets API Quotas
- 100 read requests per 100 seconds per user
- R script should cache results and not query on every page load
- Consider hourly scheduled updates rather than real-time

### Security Boundaries
- Web app executes as script owner ("Me" in deployment settings)
- "Anyone" can access web app (needed for verification links)
- Never expose Sheet ID or API credentials in client-side code

## File Organization Guidelines

### apps-script/
- Code.gs: Main logic, keep functions focused and testable
- Config.gs: Configuration with placeholders only
- Include README.md with setup instructions
- Include DEPLOYMENT.md with pre-launch checklist

### api/
- get-conferences.R: Read and export approved conferences
- cleanup-old-data.R: GDPR compliance, 12-month retention
- .Renviron.example: Template for local configuration
- README.md with authentication setup

### website/
- privacy.html: GDPR-compliant privacy policy
- Integration code for displaying conferences
- conferences.json: Generated by R script (gitignored if large)

## Debugging Tips

### Apps Script Debugging
- Use Logger.log() liberally, view with clasp logs
- Check Executions page in Apps Script for runtime errors
- Verify trigger is firing: add timestamp log in onFormSubmit
- Test doGet URLs directly in browser with query parameters

### R Script Debugging
- Use `gs4_deauth()` then `gs4_auth()` to refresh credentials
- Check Sheet permissions if authentication fails
- Use `dplyr::glimpse()` to inspect data types after reading
- Test date filtering logic with `Sys.Date()` comparisons

### Email Delivery Issues
- Check spam folders for verification emails
- Verify "From" email matches script owner's account
- Check Apps Script quotas in project settings
- Test with gmail addresses first (best compatibility)

## Pre-Deployment Checklist Reference

Before making repository public or deploying to production:
- [ ] .gitignore configured correctly (see IMPLEMENTATION.md Security section)
- [ ] Config.gs contains only placeholder values
- [ ] No secrets in git history: `git log --all --source -- '*secret*' '*config*'`
- [ ] Verification secret generated and configured locally
- [ ] Moderator emails updated in local Config.gs
- [ ] Privacy policy published and linked in form
- [ ] End-to-end test completed successfully
- [ ] Both moderators can access Sheet and receive emails

See IMPLEMENTATION.md for complete deployment checklist.

## Resources

- **Full specification:** IMPLEMENTATION.md (960 lines covering all technical details)
- **Apps Script documentation:** https://developers.google.com/apps-script
- **googlesheets4 package:** https://googlesheets4.tidyverse.org
- **clasp CLI:** https://github.com/google/clasp

## Contact

For questions about this implementation: contact@econbase.org
- always use tidyverse best practices (what would Hadley do)
- Alwayas use the native pipe |> instead of the magrittr pipe %>%