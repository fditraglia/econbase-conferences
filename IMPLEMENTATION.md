# EconBase Conference Listings - Implementation Specification

## Overview

A conference/workshop listing service for the econometrics community, replacing the defunct "Econometrics Links" previously run by Marius Ooms. This service allows community members to submit upcoming events, with email verification and moderation workflow.

## Architecture Decision

**Approach:** Google Forms + Google Sheets + Google Apps Script

**Rationale:**
- Platform-agnostic (works regardless of final EconBase platform choice)
- Enables parallel development (doesn't block on main site decisions)
- Low operational overhead (Google handles infrastructure)
- Free (no hosting/database/email service costs)
- Simple data portability (CSV export for future migration)
- Professional and proven (used widely in academic contexts)

**Components:**
1. **Input:** Google Form (public submission)
2. **Storage:** Google Sheet (submission database)
3. **Processing:** Google Apps Script (verification + moderation)
4. **API:** R script reading from Sheet via `googlesheets4`
5. **Display:** EconBase website consumes API output

## User Flows

### Submitter Flow

1. User visits EconBase website, clicks "Submit Conference"
2. Fills Google Form with conference details
3. Receives verification email immediately
4. Clicks verification link in email
5. Sees confirmation: "Email verified, sent to moderators"
6. Receives notification when approved (optional enhancement)

### Moderator Flow

1. Someone submits conference → verification email sent to submitter
2. Submitter verifies → moderators (you + Martin) get email with:
   - Conference details in email body
   - Clickable "APPROVE" and "REJECT" buttons
3. Moderator clicks APPROVE or REJECT (one-click action)
4. Other moderator gets notification: "X approved/rejected Y conference"
5. Submitter gets notification if approved

### Public Display Flow

1. R script runs on schedule (e.g., hourly via cron)
2. Reads Sheet, filters for VERIFIED + APPROVED entries
3. Generates JSON/HTML for website consumption
4. Website displays upcoming conferences

## Google Form Fields

**Required fields:**
1. Conference/Workshop Name (short answer)
2. Start Date (date)
3. End Date (date) - optional, for multi-day events
4. Location (short answer) - e.g., "Chicago, USA" or "Online"
5. Website URL (short answer, URL validation)
6. Brief Description (paragraph, 500 char limit)
7. Submission Deadline (date) - optional, for CFPs
8. Your Email Address (short answer, email validation) - for verification

**Form header text:**
```
Submit Your Conference or Workshop

Help the econometrics community discover your event! Submissions are reviewed before publication.

Privacy Notice: We collect your email to verify submissions and send notifications. Your email will not be published. See our privacy policy at econbase.org/privacy

By submitting, you confirm you have authority to publicize this event.
```

## Google Sheet Structure

**Columns:**
| Column | Name | Type | Source | Description |
|--------|------|------|--------|-------------|
| A | Timestamp | Datetime | Auto | Form submission time |
| B | Conference Name | Text | Form | Name of event |
| C | Start Date | Date | Form | Event start date |
| D | End Date | Date | Form | Event end date (optional) |
| E | Location | Text | Form | City/country or "Online" |
| F | Website URL | URL | Form | Event website |
| G | Description | Text | Form | Brief description |
| H | Submission Deadline | Date | Form | CFP deadline (optional) |
| I | Submitter Email | Email | Form | For verification/notification |
| J | Submission ID | Text | Script | Stable unique ID (timestamp-randomHex) |
| K | Email Verified | Text | Script | UNVERIFIED/VERIFIED/EMAIL_FAILED |
| L | Status | Text | Script | PENDING/APPROVED/REJECTED |
| M | Moderated By | Email | Script | Which moderator took action |
| N | Moderated At | Datetime | Script | When moderation occurred |

**Access Control:**
- View/Edit: You + Martin only
- Responses: From form only

## Apps Script Implementation

### File Structure
```
econbase-conference-moderation/
├── .clasp.json           # Clasp configuration
├── appsscript.json       # Apps Script manifest
├── Code.gs               # Main script
├── Config.gs             # Configuration constants
├── README.md             # Setup/deployment instructions
└── DEPLOYMENT.md         # Deployment checklist
```

### Code.gs - Core Functions

**Key functions to implement:**

1. `onFormSubmit(e)` - Triggered on form submission
   - Extract form values
   - Set UNVERIFIED + PENDING status
   - Generate verification token (SHA-256 hash of row + secret + timestamp)
   - Send verification email to submitter
   - Log success/failure

2. `doGet(e)` - Handle web app requests
   - Route to: `handleVerification()`, `handleApprove()`, or `handleReject()`
   - Return HTML responses

3. `handleVerification(sheet, row, token)` - Process verification clicks
   - Validate token matches expected hash
   - Check expiration (7 days)
   - Mark as VERIFIED
   - Notify moderators
   - Return success/error HTML

4. `handleApprove(sheet, row)` - Process approval clicks
   - Check not already moderated
   - Set status to APPROVED
   - Record moderator and timestamp
   - Notify other moderator
   - Notify submitter
   - Return confirmation HTML

5. `handleReject(sheet, row)` - Process rejection clicks
   - Similar to approve but sets REJECTED
   - No submitter notification (debatable - could add)

6. `notifyModerators(...)` - Send moderation request email
   - HTML email with conference details
   - Clickable APPROVE/REJECT buttons
   - Link to spreadsheet

7. `notifyOtherModerator(moderator, action, conferenceName)` - Coordination
   - Determine other moderator
   - Send status update

8. `notifySubmitterApproved(email, conferenceName)` - Confirmation
   - Thank submitter
   - Link to public listing

### Config.gs - Configuration

**Note:** This file contains placeholder values that must be updated before deployment. See Security section below.

```javascript
// Configuration constants
// IMPORTANT: Update these values before deploying (see DEPLOYMENT.md)
var CONFIG = {
  MODERATORS: [
    "MODERATOR_1_EMAIL",  // Replace with actual email before deployment
    "MODERATOR_2_EMAIL"   // Replace with actual email before deployment
  ],
  
  // Generate a random secret string before deployment:
  // openssl rand -base64 32
  VERIFICATION_SECRET: "CHANGE_THIS_RANDOM_STRING",
  
  // Google Sheet ID (get from Sheet URL after creation)
  SHEET_ID: "YOUR_SHEET_ID_HERE",
  
  VERIFICATION_EXPIRY_DAYS: 7,
  
  COLUMNS: {
    TIMESTAMP: 1,
    CONFERENCE_NAME: 2,
    START_DATE: 3,
    END_DATE: 4,
    LOCATION: 5,
    URL: 6,
    DESCRIPTION: 7,
    SUBMISSION_DEADLINE: 8,
    SUBMITTER_EMAIL: 9,
    SUBMISSION_ID: 10,        // Stable ID - NEVER changes even if rows reorder
    EMAIL_VERIFIED: 11,
    STATUS: 12,
    MODERATED_BY: 13,
    MODERATED_AT: 14
  },
  
  EMAIL: {
    FROM_NAME: "EconBase Conference Listings",
    REPLY_TO: "contact@econbase.org"
  },
  
  URLS: {
    PRIVACY_POLICY: "https://econbase.org/privacy",
    CONFERENCES_PAGE: "https://econbase.org/conferences"
  }
};
```

### Email Templates

**Verification Email (to submitter):**
```
Subject: Please verify your conference submission: {CONFERENCE_NAME}

Thank you for submitting your conference to EconBase!

Conference: {CONFERENCE_NAME}
Date: {START_DATE} - {END_DATE}
Location: {LOCATION}

To complete your submission, please verify your email address by clicking:
{VERIFY_URL}

This link will expire in 7 days.

If you did not submit this conference, please ignore this email.

---
EconBase Conference Listings
https://econbase.org
```

**Moderation Request (to moderators):**
```
Subject: 📋 New Conference for Review: {CONFERENCE_NAME}

[HTML Email]

New Verified Conference Submission

{CONFERENCE_NAME}

Date: {START_DATE} - {END_DATE}
Location: {LOCATION}
Website: {URL}

Description:
{DESCRIPTION}

Submission Deadline: {DEADLINE} (if applicable)
Submitted by: {SUBMITTER_EMAIL}

[APPROVE Button] [REJECT Button]

View in spreadsheet (Row {ROW_NUMBER})
```

**Approval Notification (to submitter):**
```
Subject: Your conference has been approved: {CONFERENCE_NAME}

Good news! Your conference submission has been approved and is now listed on EconBase.

Conference: {CONFERENCE_NAME}
View at: https://econbase.org/conferences

Thank you for contributing to the econometrics community!

---
We will retain your email for 12 months after the conference date, then delete it. 
To request earlier deletion, reply to this email.

EconBase Conference Listings
```

**Status Update (to other moderator):**
```
Subject: ✅ {CONFERENCE_NAME}

{MODERATOR_EMAIL} just approved this conference:
{CONFERENCE_NAME}
```

## Apps Script Deployment

### Setup Steps

1. **Create Google Form**
   - Add all fields from specification
   - Add privacy notice header
   - Link to new Google Sheet

2. **Set up Sheet**
   - Rename first sheet to "Responses"
   - Add column headers J-N manually:
     - J: Submission ID
     - K: Email Verified
     - L: Status
     - M: Moderated By
     - N: Moderated At
   - Set up conditional formatting:
     - Status = APPROVED → Green
     - Status = REJECTED → Red
     - Status = PENDING → Yellow
     - Email Verified = VERIFIED → Light blue

3. **Initialize clasp project**
   ```bash
   npm install -g @google/clasp
   clasp login
   clasp create --title "EconBase Conference Moderation" --type sheets --rootDir ./apps-script
   ```

4. **Write and push code**
   ```bash
   cd apps-script
   # Create Code.gs, Config.gs
   clasp push
   ```

5. **Deploy as web app**
   - In Apps Script editor: Deploy → New deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Deploy
   - Copy web app URL

6. **Set up trigger**
   - Clock icon → Add Trigger
   - Function: `onFormSubmit`
   - Event source: From spreadsheet
   - Event type: On form submit
   - Save

7. **Update Config.gs**
   - Change `VERIFICATION_SECRET` to random string (see below)
   - Replace placeholder emails with actual moderator emails
   - Add Sheet ID
   - Update URLs when site is live

**Generating a secure verification secret:**
```bash
# Generate random 32-character base64 string
openssl rand -base64 32
```

Copy the output and use it as `VERIFICATION_SECRET` in Config.gs.

**IMPORTANT:** Never commit the actual secret to git. Keep Config.gs with placeholders in the public repo.

8. **Test**
   - Submit test form
   - Verify email arrives
   - Click verification link
   - Check moderator email arrives
   - Click approve/reject
   - Verify other moderator gets notification

## R API Script

### Purpose
Read approved conferences and make available to website.

### Implementation

**File:** `api/get-conferences.R`

```r
#!/usr/bin/env Rscript

library(googlesheets4)
library(tidyverse)
library(jsonlite)

# Authenticate (set up service account or OAuth)
gs4_auth()

# Configuration
SHEET_ID <- "your_google_sheet_id_here"
OUTPUT_FILE <- "../website/data/conferences.json"

# Read and filter
conferences <- read_sheet(SHEET_ID, sheet = "Responses") |>
  filter(
    email_verified == "VERIFIED",
    status == "APPROVED",
    start_date >= Sys.Date()
  ) |>
  arrange(start_date) |>
  select(
    name = conference_name,
    start_date,
    end_date,
    location,
    url = website_url,
    description,
    submission_deadline
  ) |>
  mutate(
    # Format dates for display
    start_date = format(start_date, "%Y-%m-%d"),
    end_date = if_else(is.na(end_date), NA_character_, format(end_date, "%Y-%m-%d")),
    submission_deadline = if_else(is.na(submission_deadline), NA_character_, 
                                   format(submission_deadline, "%Y-%m-%d"))
  )

# Write JSON
write_json(conferences, OUTPUT_FILE, pretty = TRUE, auto_unbox = TRUE)

# Log
cat("Updated conferences.json with", nrow(conferences), "entries\n")
```

### Scheduling

**Option 1: Cron job (if you have a server)**
```bash
# Run every hour
0 * * * * cd /path/to/repo && Rscript api/get-conferences.R
```

**Option 2: GitHub Actions (if using GitHub Pages)**
```yaml
# .github/workflows/update-conferences.yml
name: Update Conferences
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: r-lib/actions/setup-r@v2
      - name: Install packages
        run: |
          install.packages(c("googlesheets4", "tidyverse", "jsonlite"))
        shell: Rscript {0}
      - name: Update data
        run: Rscript api/get-conferences.R
        env:
          GOOGLE_SHEETS_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add website/data/conferences.json
          git commit -m "Update conferences data" || exit 0
          git push
```

**Option 3: Manual** (while prototyping)
- Just run the script when you want to update
- Good enough for low-frequency updates

## Website Integration

### Display Options

**Option 1: Simple HTML (no build step)**
```html
<div id="conferences"></div>

<script>
fetch('/data/conferences.json')
  .then(r => r.json())
  .then(data => {
    const html = data.map(conf => `
      <div class="conference">
        <h3><a href="${conf.url}">${conf.name}</a></h3>
        <p><strong>${conf.start_date}${conf.end_date ? ' - ' + conf.end_date : ''}</strong> | ${conf.location}</p>
        <p>${conf.description}</p>
        ${conf.submission_deadline ? `<p><em>Submission deadline: ${conf.submission_deadline}</em></p>` : ''}
      </div>
    `).join('');
    document.getElementById('conferences').innerHTML = html;
  });
</script>
```

**Option 2: Server-side rendering**
- If using Django/Rails/whatever: read JSON in template
- Generate HTML at build time

**Option 3: RSS Feed**
```r
# Generate RSS alongside JSON
library(xml2)

rss <- conferences |>
  head(20) |>
  mutate(
    item = map2(name, description, ~{
      read_xml(glue::glue('
        <item>
          <title>{.x}</title>
          <description>{.y}</description>
          <link>{url}</link>
          <pubDate>{format(Sys.time(), "%a, %d %b %Y %H:%M:%S %z")}</pubDate>
        </item>
      '))
    })
  )

# Write RSS file
write_xml(rss_doc, "../website/conferences.rss")
```

## Testing Plan

### Privacy Policy Page

**File:** `website/privacy.md` or `website/privacy.html`

**Content:** (See full template in conversation, key points:)
- What data collected: email + conference details
- Why: verification, moderation, notification
- Legal basis: legitimate interest (anti-spam)
- Retention: 12 months after conference date
- Rights: access, correction, deletion
- Contact: contact@econbase.org
- Processor: Google (covered by their DPA)

### Data Retention Script

**File:** `api/cleanup-old-data.R`

```r
#!/usr/bin/env Rscript

library(googlesheets4)
library(tidyverse)

gs4_auth()

SHEET_ID <- "your_sheet_id"

# Find conferences >12 months old
old_data <- read_sheet(SHEET_ID) |>
  mutate(row_num = row_number() + 1) |>  # +1 for header row
  filter(start_date < Sys.Date() - 365)

if (nrow(old_data) > 0) {
  # Option 1: Delete entire rows
  # range_delete(SHEET_ID, range = ...)
  
  # Option 2: Clear only email column (preserve conference data)
  for (row in old_data$row_num) {
    range_write(SHEET_ID, 
                data = tibble(submitter_email = NA),
                range = glue::glue("I{row}"),  # Email column
                col_names = FALSE)
  }
  
  cat("Cleaned", nrow(old_data), "old entries\n")
} else {
  cat("No old entries to clean\n")
}
```

**Schedule:** Run monthly via cron or GitHub Actions

### Form Updates

Add to Google Form description/header:
- Link to privacy policy
- Clear statement about data use
- No tracking/cookies needed (form only)

## Security and Secrets Management

### Public Repository Considerations

This repository can and should be public for transparency and collaboration. However, sensitive configuration must be handled properly.

### What's Safe to Commit

✅ **Code and structure:**
- All Apps Script logic
- R scripts
- Documentation
- Email templates
- Privacy policy
- `.gitignore`

✅ **Configuration templates:**
- `Config.gs` with placeholder values
- Column mappings
- Field names

### What Must NOT Be Committed

❌ **Secrets and credentials:**
- Actual `VERIFICATION_SECRET` value
- Moderator email addresses (use placeholders)
- Service account credentials (`.json` files)
- `.clasp.json` (contains your Apps Script project ID)
- `.Renviron` (contains R environment variables)

❌ **Personal data:**
- Exported submission data
- Any files containing real submitter information

### .gitignore Configuration

Create `.gitignore` in repository root:

```gitignore
# Google Apps Script
.clasp.json
.clasprc.json

# R
.Rhistory
.RData
.Rproj.user
*.Rproj
.Renviron
google-credentials.json

# Node
node_modules/

# Secrets
secrets/
*.key
*.pem

# Local configuration
config.local.*
local-config.gs

# Data exports (if you ever export submission data)
data/*.csv
data/*.xlsx

# OS files
.DS_Store
Thumbs.db
```

### Deployment Configuration

**Before deploying, you must:**

1. **Generate verification secret:**
   ```bash
   openssl rand -base64 32
   ```
   
2. **Update Config.gs locally** (not committed):
   - Replace `MODERATOR_1_EMAIL` with your email
   - Replace `MODERATOR_2_EMAIL` with Martin's email
   - Replace `VERIFICATION_SECRET` with generated secret
   - Add your actual Sheet ID

3. **Deploy via clasp** (this sends your local Config.gs to Google)

4. **Never commit the production Config.gs**

### Alternative: Properties Service (More Secure)

For production, consider using Apps Script Properties Service:

```javascript
// In Config.gs (committed version)
var CONFIG = {
  MODERATORS: [
    PropertiesService.getScriptProperties().getProperty('MODERATOR_1'),
    PropertiesService.getScriptProperties().getProperty('MODERATOR_2')
  ],
  
  VERIFICATION_SECRET: PropertiesService.getScriptProperties().getProperty('VERIFICATION_SECRET'),
  
  // Non-sensitive config can stay in code
  VERIFICATION_EXPIRY_DAYS: 7,
  // ... rest of config
};
```

**Set properties once via Apps Script:**
```javascript
function setupSecrets() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MODERATOR_1', 'your@email.com');
  props.setProperty('MODERATOR_2', 'martin@email.com');
  props.setProperty('VERIFICATION_SECRET', 'your-generated-secret');
}
```

Run `setupSecrets()` once, then delete the function.

### R Script Configuration

**For R scripts**, use environment variables:

Create `.Renviron` (gitignored):
```bash
# .Renviron - NOT committed to git
GOOGLE_SHEET_ID="your_actual_sheet_id"
```

In `get-conferences.R`:
```r
# Read from environment
SHEET_ID <- Sys.getenv("GOOGLE_SHEET_ID")

if (SHEET_ID == "") {
  stop("GOOGLE_SHEET_ID not set. Create .Renviron file with GOOGLE_SHEET_ID=your_id")
}
```

### Security Checklist

Before making repository public:

- [ ] Verify `.gitignore` is in place
- [ ] Check `Config.gs` has only placeholder values
- [ ] Ensure no credentials in git history: `git log --all --full-history --source -- '*secret*' '*password*' '*credential*'`
- [ ] Remove any accidentally committed secrets (use `git filter-branch` if needed)
- [ ] Document configuration steps clearly in DEPLOYMENT.md
- [ ] Test deployment from scratch using only public repo + deployment docs

### If Secrets Are Accidentally Committed

If you accidentally commit secrets:

1. **Rotate the secrets immediately** (generate new verification secret, etc.)
2. **Remove from git history:**
   ```bash
   # Nuclear option: remove file from entire history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret.file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (if already pushed)
   git push origin --force --all
   ```
3. **Update deployed version** with new secrets

### Benefits of This Approach

- ✅ **Transparency** - Community can see how it works
- ✅ **Collaboration** - Others can contribute improvements
- ✅ **Reproducibility** - Clear setup instructions
- ✅ **Security** - Secrets never exposed
- ✅ **Flexibility** - Easy to deploy multiple instances



### Manual Testing

1. **Verification flow:**
   - Submit form with test email you control
   - Receive verification email
   - Click link → see success page
   - Check Sheet: row marked VERIFIED

2. **Moderation flow:**
   - After verification, check moderator emails arrived
   - Click APPROVE → see confirmation
   - Check Sheet: row marked APPROVED
   - Check other moderator got notification

3. **Coordination:**
   - Submit second test conference
   - Have Martin verify and approve
   - Check you got notification

4. **Edge cases:**
   - Click verification link twice → "already verified"
   - Click approve twice → "already approved"
   - Try expired link (change date in Sheet) → error message
   - Submit with invalid email → form validation catches it

### R Script Testing

```r
# Test reading
source("api/get-conferences.R")

# Check output
conferences <- read_json("../website/data/conferences.json")
str(conferences)

# Verify filtering worked
all(conferences$start_date >= Sys.Date())  # Should be TRUE
all(conferences$status == "APPROVED")      # Should be TRUE
```

## Documentation

### For Moderators

**File:** `MODERATION.md`

```markdown
# Conference Moderation Guide

## How It Works

1. Someone submits a conference
2. They receive verification email
3. After they verify, you get an email with conference details
4. Click APPROVE or REJECT
5. Done!

## What to Look For

**Approve if:**
- Legitimate academic conference/workshop
- Related to econometrics, statistics, economics, data science
- Has real details (date, location, URL)

**Reject if:**
- Spam or commercial advertising
- Not related to economics/statistics/data science
- Fake/suspicious (e.g., "fascist conference in econometrics")
- Duplicate of existing listing
- Incomplete information

## Communication

When you approve/reject, the other moderator gets notified automatically.
No need to coordinate manually.

## Questions?

Email: contact@econbase.org
```

### For Developers

**File:** `README.md` (main repo)

```markdown
# EconBase Conference Listings

Community-submitted conference and workshop listings for econometrics.

## Architecture

- **Input:** Google Form
- **Storage:** Google Sheets
- **Processing:** Google Apps Script (email verification + moderation)
- **API:** R script → JSON
- **Display:** Website

See `IMPLEMENTATION.md` for detailed specification.

## Setup

See `apps-script/DEPLOYMENT.md` for Apps Script setup.

See `api/README.md` for R script setup.

## Repository Structure

```
econbase-conferences/
├── .gitignore            # See Security section
├── README.md             # Main documentation
├── IMPLEMENTATION.md     # This file
├── apps-script/          # Google Apps Script
│   ├── Code.gs          # Main logic (with placeholders)
│   ├── Config.gs        # Configuration (with placeholders)
│   ├── README.md
│   └── DEPLOYMENT.md    # Deployment instructions
├── api/                  # R scripts
│   ├── get-conferences.R
│   ├── cleanup-old-data.R
│   ├── .Renviron.example  # Template for local .Renviron
│   └── README.md
├── website/              # Integration code
│   ├── data/
│   │   └── conferences.json
│   ├── privacy.html
│   └── conferences.html
└── MODERATION.md         # Moderator guide
```

## Maintenance

- **Weekly:** Check for new submissions (automatic via email)
- **Monthly:** Run data cleanup script
- **Quarterly:** Review privacy policy for updates

## Contact

contact@econbase.org
```

## Future Enhancements

**Phase 2 (if needed):**
- Auto-approve from trusted domains (e.g., @conference.org, @economics.*)
- Add "recurring" flag for annual conferences
- Calendar export (.ics file generation)
- Tag/category system (applied econometrics, theory, methods, etc.)
- Search/filter functionality on website
- Email digest (weekly roundup of new conferences)

**Phase 3 (major refactor):**
- Migrate to native system if volume warrants
- User accounts (manage your own submissions)
- Edit/update submissions after approval
- Comments/discussion threads
- Integration with other academic platforms

## Success Metrics

**Phase 1 goals:**
- 10+ conferences listed in first 3 months
- <1 spam submission per month
- <5 minute moderation time per submission
- Zero data breaches/privacy complaints

## Deployment Checklist

**Pre-launch:**
- [ ] Google Form created with all fields
- [ ] Google Sheet linked and configured
- [ ] Apps Script deployed and tested
- [ ] Triggers configured
- [ ] Config.gs updated with actual values (locally, not committed)
- [ ] Verification secret generated and set
- [ ] Privacy policy page published
- [ ] R script tested and scheduled
- [ ] `.Renviron` created with actual Sheet ID
- [ ] Website integration tested
- [ ] Test submission end-to-end
- [ ] Both moderators can access Sheet
- [ ] Both moderators receive emails
- [ ] `.gitignore` verified - no secrets committed
- [ ] Repository can be safely made public

**Launch:**
- [ ] Announce on social media / mailing lists
- [ ] Add "Submit Conference" link to EconBase homepage
- [ ] Monitor first few submissions closely
- [ ] Document any issues

**Post-launch:**
- [ ] Schedule monthly data cleanup
- [ ] Review moderation workflow after 10 submissions
- [ ] Collect feedback from submitters
- [ ] Iterate as needed

## License

[Choose appropriate license for your project]

## Contributors

- [Your Name]
- Martin Weidner

---

**Last Updated:** 2025-10-11
**Version:** 1.0.0
