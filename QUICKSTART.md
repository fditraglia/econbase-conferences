# Quick Start Guide

Complete step-by-step instructions to deploy the EconBase Conference Listings system from scratch.

**Estimated time:** 2-3 hours for full setup and testing

## Overview

You're setting up a conference submission system with:
- Public Google Form for submissions
- Google Sheet as database
- Google Apps Script for verification + moderation
- R scripts to export data as JSON
- Website integration to display conferences

## Prerequisites

Before starting, ensure you have:

- [ ] Google account (for Forms, Sheets, Apps Script)
- [ ] Node.js installed (for clasp)
- [ ] R installed (version 4.0+)
- [ ] Git installed
- [ ] OpenSSL (usually pre-installed on Mac/Linux)
- [ ] Text editor
- [ ] Access to your website hosting (for final integration)

## Step 1: Google Form & Sheet Setup

### 1.1 Create Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Click "Blank" to create a new form
3. Title: "Submit a Conference or Workshop"
4. Add form header text:
   ```
   Submit Your Conference or Workshop

   Help the econometrics community discover your event! Submissions are reviewed before publication.

   Privacy Notice: We collect your email to verify submissions and send notifications. Your email will not be published. See our privacy policy at econbase.org/privacy

   By submitting, you confirm you have authority to publicize this event.
   ```

5. Add the following fields (in order):

   **Field 1: Conference/Workshop Name**
   - Type: Short answer
   - Required: Yes

   **Field 2: Start Date**
   - Type: Date
   - Required: Yes

   **Field 3: End Date**
   - Type: Date
   - Required: No
   - Description: "Leave blank for single-day events"

   **Field 4: Location**
   - Type: Short answer
   - Required: Yes
   - Description: "e.g., Chicago, USA or Online"

   **Field 5: Website URL**
   - Type: Short answer
   - Required: Yes
   - Validation: Enable "Response validation" → "Regular expression" → "Contains" → `^https?://`
   - Error message: "Please enter a valid URL starting with http:// or https://"

   **Field 6: Brief Description**
   - Type: Paragraph
   - Required: Yes
   - Validation: Enable "Response validation" → "Length" → "Maximum character count" → 500

   **Field 7: Submission Deadline**
   - Type: Date
   - Required: No
   - Description: "For CFPs - leave blank if not applicable"

   **Field 8: Your Email Address**
   - Type: Short answer
   - Required: Yes
   - Validation: Enable "Response validation" → "Regular expression" → "Email"
   - Error message: "Please enter a valid email address"

6. Click "Responses" tab → Click the Google Sheets icon → "Create a new spreadsheet"
7. **Copy the form URL** - you'll need this later for your website

### 1.2 Configure Google Sheet

1. Open the linked Google Sheet (should open automatically)
2. Note the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```
   Copy `YOUR_SHEET_ID_HERE` - you'll need this multiple times

3. **IMPORTANT**: Add column headers in row 1 for columns J-N:
   - Click cell J1, type: `Submission ID`
   - Click cell K1, type: `Email Verified`
   - Click cell L1, type: `Status`
   - Click cell M1, type: `Moderated By`
   - Click cell N1, type: `Moderated At`

4. **(Optional but helpful)** Set up conditional formatting:
   - Select column L (Status)
   - Format → Conditional formatting
   - Format cells if... "Text is exactly" → "APPROVED" → Green background
   - Add another rule: "Text is exactly" → "REJECTED" → Red background
   - Add another rule: "Text is exactly" → "PENDING" → Yellow background
   - Select column K (Email Verified)
   - Add rule: "Text is exactly" → "VERIFIED" → Light blue background

5. Configure sharing:
   - Click "Share" button
   - Add Martin's email as Editor
   - Set general access to "Restricted" (only you and Martin)

6. **Verify sheet name**: The first sheet tab should be named "Form Responses 1" (this is the default). If it's different, note the actual name.

## Step 2: Generate Security Secrets

1. Open terminal
2. Generate a verification secret:
   ```bash
   openssl rand -base64 32
   ```
3. **Copy the output** - save it somewhere secure (you'll need it in Step 3)
4. Example output: `dGVzdC1zZWNyZXQtZm9yLWV4YW1wbGUtdXNlLW9ubHk=`

## Step 3: Configure Apps Script Locally

1. Navigate to the repository:
   ```bash
   cd /path/to/econbase-conferences
   ```

2. Open `apps-script/Config.gs` in your text editor

3. Update the following values (keep the quotes):
   - Replace `MODERATOR_1_EMAIL` with your actual email
   - Replace `MODERATOR_2_EMAIL` with Martin's actual email
   - Replace `CHANGE_THIS_RANDOM_STRING_BEFORE_DEPLOYMENT` with the secret from Step 2
   - Replace `YOUR_SHEET_ID_HERE` with the Sheet ID from Step 1.2
   - If your sheet name is NOT "Form Responses 1", update `RESPONSES_SHEET` value

4. **DO NOT commit this file** - your local Config.gs should never be pushed to git

5. Example of updated Config.gs:
   ```javascript
   var CONFIG = {
     MODERATORS: [
       "francis@econbase.org",
       "martin@econbase.org"
     ],
     VERIFICATION_SECRET: "dGVzdC1zZWNyZXQtZm9yLWV4YW1wbGUtdXNlLW9ubHk=",
     SHEET_ID: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
     RESPONSES_SHEET: "Form Responses 1",
     // ... rest stays the same
   };
   ```

## Step 4: Deploy Apps Script

### 4.1 Install and Configure clasp

1. Install clasp globally:
   ```bash
   npm install -g @google/clasp
   ```

2. Login to Google:
   ```bash
   clasp login
   ```
   This will open a browser window - authorize access

3. Enable Apps Script API:
   - Visit: https://script.google.com/home/usersettings
   - Toggle "Google Apps Script API" to ON

### 4.2 Create and Deploy Script

1. Navigate to apps-script directory:
   ```bash
   cd apps-script
   ```

2. Create new Apps Script project:
   ```bash
   clasp create --title "EconBase Conference Moderation" --type sheets
   ```
   This creates a `.clasp.json` file (which is gitignored)

3. Push code to Google:
   ```bash
   clasp push
   ```
   You should see:
   ```
   └─ Code.gs
   └─ Config.gs
   └─ appsscript.json
   Pushed 3 files.
   ```

4. Open in browser:
   ```bash
   clasp open
   ```
   This opens the Apps Script editor

### 4.3 Deploy as Web App

1. In the Apps Script editor:
   - Click "Deploy" (top right) → "New deployment"
   - Click the gear icon ⚙️ next to "Select type"
   - Select "Web app"
   - Configure:
     - Description: "EconBase Conference Moderation v1"
     - Execute as: "Me (your-email@gmail.com)"
     - Who has access: "Anyone"
   - Click "Deploy"

2. **Authorize permissions**:
   - Click "Authorize access"
   - Choose your Google account
   - Click "Advanced" → "Go to EconBase Conference Moderation (unsafe)"
   - Click "Allow"

3. **Copy the Web App URL** - looks like:
   ```
   https://script.google.com/macros/s/LONG_RANDOM_STRING/exec
   ```
   Save this URL for testing

## Step 5: Set Up Triggers

1. In the Apps Script editor, click the clock icon ⏰ (Triggers) on the left sidebar

2. Click "+ Add Trigger" (bottom right)

3. Configure:
   - Choose which function to run: `onFormSubmit`
   - Choose which deployment should run: `Head`
   - Select event source: `From spreadsheet`
   - Select event type: `On form submit`
   - Failure notification settings: (default is fine)

4. Click "Save"

5. You should see the trigger listed with a checkmark

## Step 6: Test the Workflow

### 6.1 Test Form Submission & Verification

1. Open your Google Form (the URL you copied in Step 1.1)

2. Fill out with test data:
   - Conference Name: "Test Conference"
   - Start Date: (tomorrow's date)
   - Location: "Test City, USA"
   - Website URL: "https://example.com"
   - Description: "This is a test submission"
   - Your Email: (use an email you can access)

3. Click "Submit"

4. **Check verification email** (within 1-2 minutes):
   - Check inbox and spam folder
   - Subject: "Please verify your conference submission: Test Conference"
   - Contains your conference details
   - Has verification link

5. **Click the verification link**
   - Should see: "Email verified successfully!"
   - Message mentions it's been sent to moderators

6. **Check the Google Sheet**:
   - Row 2 should have your submission
   - Column J: Should contain a Submission ID (e.g., `1696204800000-a3f2b1`)
   - Column K: Should show "VERIFIED"
   - Column L: Should show "PENDING"

### 6.2 Test Moderation

1. **Check moderator emails** (both your email and Martin's):
   - Subject: "📋 New Conference for Review: Test Conference"
   - Contains all conference details
   - Has green APPROVE and red REJECT buttons

2. **Click APPROVE** (in your email)
   - Should see: "Conference approved successfully!"
   - Confirmation message appears

3. **Check the Google Sheet**:
   - Column L: Should now show "APPROVED"
   - Column M: Should show your email address
   - Column N: Should show timestamp

4. **Check Martin's email** (or other moderator):
   - Should receive notification: "✅ Test Conference"
   - Message says you approved the conference

5. **Check submitter email**:
   - Should receive approval notification
   - Subject: "Your conference has been approved: Test Conference"

### 6.3 Test Edge Cases

1. **Click verification link again**:
   - Should see: "This submission has already been verified"

2. **Click APPROVE again** (use the link from the moderator email):
   - Should see: "This conference has already been moderated"

3. **Sort the spreadsheet** (by conference name):
   - Click column B header → Data → Sort sheet A→Z
   - Notice the rows reorder but Submission IDs stay with their rows

4. **Click moderation link again** (after sorting):
   - Should still work correctly - finds submission by ID, not row number

### 6.4 Check Logs

If anything didn't work:

1. In Apps Script editor, click "Executions" icon (left sidebar)
2. View recent executions
3. Click any to see logs and errors

Or via command line:
```bash
cd apps-script
clasp logs
```

## Step 7: Set Up R Scripts

### 7.1 Install R Packages

1. Open R or RStudio

2. Install required packages:
   ```r
   install.packages(c("googlesheets4", "tidyverse", "jsonlite"))
   ```

### 7.2 Configure R Authentication

1. Navigate to api directory:
   ```bash
   cd ../api
   ```

2. Create `.Renviron` file:
   ```bash
   cp .Renviron.example .Renviron
   ```

3. Edit `.Renviron` and add your Sheet ID:
   ```bash
   GOOGLE_SHEET_ID="YOUR_SHEET_ID_HERE"
   ```
   Replace `YOUR_SHEET_ID_HERE` with the Sheet ID from Step 1.2

### 7.3 Test R Script

1. **First time setup** - authenticate with Google:
   ```bash
   Rscript get-conferences.R
   ```

2. A browser window will open asking you to authorize:
   - Choose your Google account
   - Click "Allow"
   - You can close the browser window

3. Script should run and output:
   ```
   Updated conferences.json with 1 entries
   ```

4. **Verify output**:
   ```bash
   ls ../website/data/
   # Should show: conferences.json

   cat ../website/data/conferences.json
   # Should show JSON with your approved test conference
   ```

### 7.4 Schedule R Script (Optional)

**Option A: Cron (Mac/Linux)**
```bash
# Edit crontab
crontab -e

# Add line to run every hour:
0 * * * * cd /path/to/econbase-conferences/api && Rscript get-conferences.R >> /tmp/conferences.log 2>&1
```

**Option B: Manual (for prototyping)**
- Just run `Rscript api/get-conferences.R` whenever you want to update

**Option C: GitHub Actions**
- See `api/README.md` for GitHub Actions setup

## Step 8: Privacy Policy

### 8.1 Create Privacy Policy

1. Create `website/privacy.html` (or .md depending on your site)

2. Use this template (customize as needed):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Privacy Policy - EconBase Conference Listings</title>
   </head>
   <body>
     <h1>Privacy Policy - Conference Listings</h1>

     <h2>Data Collection</h2>
     <p>We collect:</p>
     <ul>
       <li>Your email address (for verification and notifications)</li>
       <li>Conference details you submit (name, date, location, URL, description)</li>
     </ul>

     <h2>Purpose</h2>
     <p>We use this data to:</p>
     <ul>
       <li>Verify you are a real person (email verification)</li>
       <li>Review submissions for spam/appropriateness (moderation)</li>
       <li>Notify you if your submission is approved</li>
       <li>Display approved conferences on our website</li>
     </ul>

     <h2>Data Sharing</h2>
     <p>Your email is <strong>never published</strong> on our website. Only approved conference details are made public. Your email is shared with our moderators for verification purposes.</p>

     <h2>Data Retention</h2>
     <p>We retain your email for 12 months after the conference date, then automatically delete it. Conference details (without email) are retained indefinitely for archival purposes.</p>

     <h2>Your Rights</h2>
     <p>You have the right to:</p>
     <ul>
       <li>Request a copy of your data</li>
       <li>Request correction of your data</li>
       <li>Request deletion of your data</li>
     </ul>

     <h2>Contact</h2>
     <p>For privacy questions or requests: <a href="mailto:contact@econbase.org">contact@econbase.org</a></p>

     <h2>Data Processor</h2>
     <p>We use Google Forms, Google Sheets, and Google Apps Script to process submissions. Google's data processing practices are covered by their Data Processing Agreement.</p>
   </body>
   </html>
   ```

3. Upload to your website

4. Note the URL (e.g., `https://econbase.org/privacy`)

### 8.2 Update Apps Script with Privacy Policy URL

1. Open `apps-script/Config.gs` locally

2. Update `URLS.PRIVACY_POLICY` with your actual URL

3. Push changes:
   ```bash
   cd apps-script
   clasp push
   ```

### 8.3 Update Google Form

1. Open your Google Form for editing

2. Update the form header to include the actual privacy policy link:
   ```
   Privacy Notice: We collect your email to verify submissions and send notifications.
   Your email will not be published. See our privacy policy at https://econbase.org/privacy
   ```

## Step 9: Website Integration

### 9.1 Add Submission Link

Add a link to your Google Form on your website:
```html
<a href="YOUR_GOOGLE_FORM_URL">Submit a Conference</a>
```

### 9.2 Display Conferences

See `website/README.md` for integration examples. Basic HTML example:

```html
<div id="conferences-list"></div>

<script>
fetch('/data/conferences.json')
  .then(response => response.json())
  .then(conferences => {
    const html = conferences.map(conf => `
      <div class="conference">
        <h3><a href="${conf.url}" target="_blank">${conf.name}</a></h3>
        <p><strong>${conf.start_date}${conf.end_date ? ' - ' + conf.end_date : ''}</strong></p>
        <p><em>${conf.location}</em></p>
        <p>${conf.description}</p>
        ${conf.submission_deadline ?
          `<p class="deadline">Submission deadline: ${conf.submission_deadline}</p>` : ''}
      </div>
    `).join('');

    document.getElementById('conferences-list').innerHTML = html ||
      '<p>No upcoming conferences. <a href="YOUR_FORM_URL">Submit one!</a></p>';
  })
  .catch(error => {
    console.error('Error loading conferences:', error);
    document.getElementById('conferences-list').innerHTML =
      '<p>Error loading conferences. Please try again later.</p>';
  });
</script>
```

## Step 10: Launch

### 10.1 Final Checklist

- [ ] Tested full workflow end-to-end
- [ ] Both moderators can access Sheet
- [ ] Both moderators receive emails
- [ ] Privacy policy is published and accessible
- [ ] Form link is on website
- [ ] Conferences display on website
- [ ] R script generates valid JSON
- [ ] No secrets committed to git (verify: `git status`)
- [ ] `.gitignore` is working correctly

### 10.2 Clean Up Test Data

1. Open Google Sheet
2. Delete row 2 (your test submission)
3. This ensures your public launch starts with a clean sheet

### 10.3 Announce

1. Post to relevant mailing lists (econometrics, statistics, etc.)
2. Social media announcement
3. Email colleagues and ask them to share

## Troubleshooting

### No verification email received
- **Check spam folder** - might be filtered
- **Check Apps Script logs**: `clasp logs` or Executions tab
- **Verify trigger is set up**: Clock icon in Apps Script editor
- **Check email quota**: Free Gmail = 100 emails/day
- **Test trigger manually**: In editor, select `onFormSubmit` and click Run (you'll need to create a test event)

### Verification link shows error
- **Check token**: Should be in URL as `?action=verify&id=...&token=...`
- **Check expiry**: Links expire after 7 days
- **Check Sheet**: Verify row exists with that Submission ID
- **Check logs**: `clasp logs`

### Moderator email not received
- **Verify email is VERIFIED first**: Check Sheet column K
- **Check moderator emails in Config.gs**: Must match exactly
- **Check spam folder**
- **Check logs**: Look for "Sending moderation email" messages

### "Invalid or expired moderation link"
- **Check token is present** in URL
- **Verify moderator email** is in CONFIG.MODERATORS
- **Check if already moderated**: Look at Sheet Status column

### R script fails
- **Check authentication**: First run should prompt for Google login
- **Verify Sheet ID**: Check `.Renviron` file
- **Check R packages**: `library(googlesheets4)` should work without errors
- **Verify permissions**: Your Google account must have access to the Sheet
- **Check for API errors**: Read the error message carefully

### Sorting sheet breaks moderation
- **This should NOT happen** with the current implementation
- If it does, check that column J (Submission ID) contains values like `1696204800000-a3f2b1`
- If Submission IDs are missing, there's a problem with `onFormSubmit` function

### Changes not reflected in Apps Script
- After editing code locally, always run: `clasp push`
- Check you're editing the right file (local vs. online editor)
- Try `clasp pull` to see what's currently deployed

## Next Steps

1. **Monitor closely** for first few real submissions
2. **Set up monthly cleanup**: See `api/cleanup-old-data.R` (GDPR compliance)
3. **Document any issues** you encounter
4. **Collect feedback** from submitters and adjust
5. **Consider Phase 2 features** if volume justifies (see IMPLEMENTATION.md)

## Quick Reference

**Key URLs to save:**
- Google Form: `___________________________`
- Google Sheet: `___________________________`
- Web App: `___________________________`
- Privacy Policy: `___________________________`

**Key Commands:**
```bash
# Apps Script
clasp push                          # Upload code changes
clasp open                          # Open in browser
clasp logs                          # View recent logs

# R
Rscript api/get-conferences.R       # Generate JSON
Rscript api/cleanup-old-data.R      # Clean old data

# Git
git status                          # Check for uncommitted secrets
git log --oneline -5                # Recent commits
```

**Key Files (never commit with production values):**
- `apps-script/Config.gs` - Contains moderator emails and secret
- `api/.Renviron` - Contains Sheet ID
- `.clasp.json` - Contains Apps Script project ID (auto-generated)

## Getting Help

- **Technical Documentation**: See `IMPLEMENTATION.md` (960 lines)
- **Security Info**: See `SECURITY_FIXES.md`
- **Moderation Guide**: See `MODERATION.md`
- **Apps Script**: See `apps-script/README.md`
- **R Scripts**: See `api/README.md`
- **Questions**: contact@econbase.org

## Success!

If you've made it through all the steps and tests pass, congratulations! Your conference listing system is live. 🎉

Remember:
- Check Sheet periodically for new submissions (you'll get emails)
- Run data cleanup monthly (GDPR compliance)
- Update privacy policy if you change data practices
- Monitor for spam and adjust moderation criteria as needed
