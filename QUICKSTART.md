# Quick Start Guide

Complete step-by-step instructions to deploy the EconBase Conference Listings system from scratch.

**Estimated time:** 1-2 hours for full setup and testing

## Overview

You're setting up a conference submission system with:
- Public Google Form for submissions
- Google Sheet as database
- Google Apps Script for verification + moderation (bound to the spreadsheet)
- R scripts to export data as JSON
- Website integration to display conferences

## Prerequisites

Before starting, ensure you have:

- [ ] Google account (for Forms, Sheets, Apps Script)
- [ ] R installed (version 4.0+) - for data export
- [ ] Git installed
- [ ] OpenSSL (usually pre-installed on Mac/Linux) - for generating secrets
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
   - Validation: Enable "Response validation" → "Text" → "URL"
   - Error message: "Please enter a valid URL"

   **Field 6: Brief Description**
   - Type: Paragraph
   - Required: Yes
   - Validation: Enable "Response validation" → "Length" → "Maximum character count" → 500
   - Error message: "Description must be 500 characters or less"

   **Field 7: Submission Deadline**
   - Type: Date
   - Required: No
   - Description: "For CFPs (Call for Papers) - leave blank if not applicable"

   **Field 8: Your Email Address**
   - Type: Short answer
   - Required: Yes
   - Validation: Enable "Response validation" → "Text" → "Email"
   - Error message: "Please enter a valid email address"

6. **Enable responses:** At the top of the form editor, make sure the toggle shows "Accepting responses" (not "Not accepting responses")

7. Click "Responses" tab → Click "Link to Sheets" button → Select "Create a new spreadsheet" → Give it a name (e.g., "EconBase Conference Submissions") → Click "Create"

8. **Copy the form URL:** Click "Send" button → Click the link icon (🔗) → Copy the URL and save it

### 1.2 Configure Google Sheet

The spreadsheet should open automatically after linking.

1. **Get the Sheet ID** - Look at the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```
   Copy `YOUR_SHEET_ID_HERE` and save it securely (password manager or secure note)

2. **Add column headers** for columns J-N (click on each cell and type):
   - Click **J1**, type: `Submission ID`
   - Click **K1**, type: `Email Verified`
   - Click **L1**, type: `Status`
   - Click **M1**, type: `Moderated By`
   - Click **N1**, type: `Moderated At`

3. **(Optional but helpful)** Set up conditional formatting:
   - Select column L (Status)
   - Format → Conditional formatting
   - Format cells if... "Text is exactly" → "APPROVED" → Green background
   - Add another rule: "Text is exactly" → "REJECTED" → Red background
   - Add another rule: "Text is exactly" → "PENDING" → Yellow background
   - Select column K (Email Verified)
   - Add rule: "Text is exactly" → "VERIFIED" → Light blue background

4. **Share with co-moderator** (optional):
   - Click "Share" button (top right)
   - Add Martin's email (or other moderator) as Editor
   - Set general access to "Restricted"

5. **Verify the sheet tab name:** Look at the bottom left - the tab should say "Form Responses 1" (this is the default). If different, note the actual name.

## Step 2: Generate Security Secret

1. Open terminal
2. Generate a verification secret:
   ```bash
   openssl rand -base64 32
   ```
3. **Copy the output** and save it securely (password manager)
4. Example output: `dGVzdC1zZWNyZXQtZm9yLWV4YW1wbGUtdXNlLW9ubHk=`

## Step 3: Create Bound Apps Script

**Important:** The Apps Script must be "bound" to the spreadsheet (not standalone) for form triggers to work properly.

1. **Open your Google Sheet** (the conference submissions spreadsheet)

2. Click **Extensions → Apps Script** from the top menu

3. A new Apps Script editor opens with default code

4. **Delete all the default code** in the editor

5. **Copy all contents** from your local `apps-script/Code.gs` file

6. **Paste** into the Apps Script editor

7. Click the **+ icon** next to "Files" on the left sidebar

8. Choose **"Script"**

9. Name it: `Config`

10. **Delete** any placeholder code in Config.gs

11. **Copy all contents** from your local `apps-script/Config.gs` file

12. **Paste** into the Config.gs tab in the browser

13. **Update Config.gs with your actual values:**
    - Replace `MODERATOR_1_EMAIL` with your actual email
    - Replace `MODERATOR_2_EMAIL` with Martin's actual email
    - Replace `CHANGE_THIS_RANDOM_STRING_BEFORE_DEPLOYMENT` with the secret from Step 2
    - Replace `YOUR_SHEET_ID_HERE` with the Sheet ID from Step 1.2
    - If your sheet tab name is NOT "Form Responses 1", update `RESPONSES_SHEET` value
    - **Leave `WEB_APP_URL` as placeholder for now** - we'll update it in Step 4

14. Click **Save** (Ctrl+S or disk icon)

15. At the top, change the project name from "Untitled project" to: **"EconBase Conference Moderation"**

## Step 4: Deploy as Web App

1. Click **Deploy → New deployment**

2. Click the **gear icon ⚙️** next to "Select type"

3. Select **"Web app"**

4. Configure:
   - Description: "EconBase Conference Listings v1"
   - Execute as: **"Me"** (should show your email)
   - Who has access: **"Anyone"**

5. Click **"Deploy"**

6. **Authorize permissions:**
   - Click "Authorize access"
   - Choose your Google account
   - You'll see "Google hasn't verified this app" - click **"Advanced"**
   - Click **"Go to EconBase Conference Moderation (unsafe)"** (it's your own code, it's safe)
   - **Grant ALL permissions** - the script needs:
     - Access to spreadsheets (to update verification status)
     - Send email as you (for verification and moderation emails)
     - Connect to external service (for web app)
   - Click **"Allow"**

7. **Copy the Web App URL** that appears - looks like:
   ```
   https://script.google.com/macros/s/LONG_RANDOM_STRING/exec
   ```

8. **Update Config.gs with the Web App URL:**
   - Go back to the Apps Script editor
   - Open **Config.gs**
   - Find the line: `WEB_APP_URL: "PLACEHOLDER_UPDATE_AFTER_DEPLOYMENT",`
   - Replace it with: `WEB_APP_URL: "paste-the-url-you-just-copied",`
   - **Save** (Ctrl+S)

**Why we need WEB_APP_URL:** The built-in `ScriptApp.getService().getUrl()` function can return incorrect URLs in certain situations (especially with bound scripts). Hardcoding the URL ensures all verification and moderation links always point to the correct deployment.

**Future maintenance:** If you ever redeploy the web app, copy the new URL and update `WEB_APP_URL` in Config.gs.

## Step 5: Set Up Form Submission Trigger

1. In the Apps Script editor, click the **clock icon ⏰** on the left sidebar (Triggers)

2. Click **"+ Add Trigger"** (bottom right)

3. Configure:
   - Choose which function to run: **`onFormSubmit`**
   - Choose which deployment should run: **`Head`**
   - Select event source: **`From spreadsheet`**
   - Select event type: **`On form submit`**
   - Failure notification settings: **`Notify me daily`**

4. Click **"Save"**

5. **Authorize again** (same Advanced → Allow process as before)

6. You should now see the trigger listed with a checkmark

## Step 6: Test the Workflow

### 6.1 Test Form Submission & Verification

1. **Open your Google Form** (the URL you saved in Step 1.1)

2. **Fill out with test data:**
   - Conference Name: "Test Conference"
   - Start Date: (pick tomorrow's date)
   - End Date: (leave blank or pick a date)
   - Location: "Test City, USA"
   - Website URL: "https://example.com"
   - Description: "This is a test submission to verify the system works"
   - Submission Deadline: (leave blank)
   - Your Email: **your-email@gmail.com** (use the email you're logged into Google with)

3. Click **"Submit"**

4. **Check your email** (within 1-2 minutes):
   - Check inbox AND spam/junk folder
   - Look for: "Please verify your conference submission: Test Conference"
   - From: "EconBase Conference Listings"

5. **Check the Google Sheet:**
   - Open your spreadsheet
   - Row 2 should have your submission
   - Column J: Should contain a Submission ID (e.g., `1760592682745-febb21`)
   - Column K: Should show "UNVERIFIED"
   - Column L: Should show "PENDING"

### 6.2 Test Email Verification

1. **Open the verification email**

2. **Click the verification link** (the blue "Verify Email Address" button)

3. You should see a success page: "Thank you! Your email has been verified."

4. **Check the Google Sheet again:**
   - Column K: Should now show "VERIFIED"
   - Column L: Should still show "PENDING"

5. **Check for moderator email:**
   - Both you and the other moderator should receive: "📋 New Conference for Review: Test Conference"
   - Email contains all conference details
   - Has green **APPROVE** and red **REJECT** buttons

### 6.3 Test Moderation

1. **Click APPROVE** in the moderator email (either your email or the other moderator's)

2. You should see: "Conference approved successfully!"

3. **Check the Google Sheet:**
   - Column L: Should now show "APPROVED"
   - Column M: Should show the moderator's email address
   - Column N: Should show the timestamp

4. **Check for notifications:**
   - Other moderator should receive: "✅ Test Conference" (notification that you approved it)
   - Submitter should receive: "Your conference has been approved: Test Conference"

### 6.4 Test Edge Cases

1. **Click verification link again:**
   - Should see: "This email has already been verified"

2. **Click APPROVE again** (use the link from the moderator email):
   - Should see: "This conference has already been approved"

3. **Sort the spreadsheet** (by conference name):
   - Click column B header → Data → Sort sheet A→Z
   - Notice the rows reorder but Submission IDs stay with their rows

4. **Try clicking moderation link after sorting:**
   - Should still work correctly - finds submission by ID, not row number

### 6.5 Check Execution Logs (if issues occur)

If anything didn't work:

1. In Apps Script editor, click **"Executions"** icon on left sidebar (▶️)
2. View recent executions
3. Click any to see logs and errors
4. Look for error messages or missing log entries

**Common issues:**
- No verification email → Check spam, check Executions for errors, verify trigger is set up
- "Invalid action" error on links → Check `WEB_APP_URL` in Config.gs matches the deployed URL
- Columns J-N not populated → Trigger didn't fire, check trigger setup

## Step 7: Set Up R Scripts (Optional - for website integration)

### 7.1 Install R Packages

1. Open R or RStudio

2. Install required packages:
   ```r
   install.packages(c("googlesheets4", "tidyverse", "jsonlite"))
   ```

### 7.2 Configure R Authentication

1. Navigate to api directory:
   ```bash
   cd api
   ```

2. Create `.Renviron` file:
   ```bash
   cp .Renviron.example .Renviron
   ```

3. Edit `.Renviron` and add your Sheet ID:
   ```bash
   GOOGLE_SHEET_ID="YOUR_SHEET_ID_HERE"
   ```
   Replace with the Sheet ID from Step 1.2

### 7.3 Create R Scripts

The R scripts should already exist in your repo. If not, see `api/README.md` for templates.

### 7.4 Test R Script

1. **First time setup** - authenticate with Google:
   ```bash
   Rscript get-conferences.R
   ```

2. A browser window will open:
   - Choose your Google account
   - Click "Allow"
   - Close browser window

3. Script should output:
   ```
   Updated conferences.json with N entries
   ```

4. **Verify output:**
   ```bash
   ls ../website/data/
   # Should show: conferences.json

   cat ../website/data/conferences.json
   # Should show JSON with your approved test conference
   ```

### 7.5 Schedule R Script (Optional)

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

Create a privacy policy page on your website. Template:

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

### 8.2 Update Google Form

1. Open your Google Form for editing
2. Update the form header to include your actual privacy policy URL:
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
- [ ] Verification links work
- [ ] Moderation links work
- [ ] Privacy policy is published and accessible
- [ ] Form link is on website
- [ ] Conferences display on website (if using R scripts)
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
- **Check Apps Script Executions:** Apps Script editor → Executions icon → look for errors
- **Verify trigger is set up:** Clock icon in Apps Script editor, should see `onFormSubmit` trigger
- **Check email quota:** Free Gmail = 100 emails/day, Google Workspace = 1500/day
- **Check sheet columns:** Verify columns J-N have headers and data is being written

### Verification link shows "Invalid action" or Drive error
- **Check `WEB_APP_URL` in Config.gs** - it should match the deployed URL exactly
- **Get the correct URL:** Deploy → Manage deployments, copy the Web App URL
- **Update Config.gs and save**
- **Submit form again** to get a new verification email with correct URL

### "Invalid verification link" error
- **Check token:** URL should have `?action=verify&id=...&token=...`
- **Check expiry:** Links expire after 30 days (configurable in Config.gs)
- **Check Sheet:** Verify row exists with that Submission ID
- **Check logs:** Executions → click on the execution → view logs

### Moderator email not received
- **Verify email is VERIFIED first:** Check Sheet column K = "VERIFIED"
- **Check moderator emails in Config.gs:** Must match exactly (case-insensitive)
- **Check spam folder**
- **Check Executions logs:** Look for "Moderators notified" or error messages

### "Invalid or expired moderation link"
- **Check token is present** in URL
- **Verify moderator email** matches one in CONFIG.MODERATORS
- **Check if already moderated:** Look at Sheet Status column

### Columns J-N not populated after form submission
- **Trigger didn't fire** - check trigger is set up correctly (clock icon)
- **Check Executions** for errors
- **Verify trigger type** is "On form submit" not "On open" or "On edit"
- **Check script is bound to the sheet:** Extensions → Apps Script should show the script

### Sorting sheet breaks moderation
- **This should NOT happen** with the current implementation
- Submission IDs (column J) should contain stable IDs like `1696204800000-a3f2b1`
- If Submission IDs are missing, the `onFormSubmit` function isn't running properly

### Changes to Code.gs not reflected
- **Save the file:** Ctrl+S or disk icon
- **Check you're editing the bound script:** Extensions → Apps Script from the sheet (not a standalone script)
- **Redeploy if needed:** Deploy → Manage deployments → Edit → Deploy (only if you changed `doGet` or web app behavior)

## Security Notes

**What's safe to commit to git:**
- ✅ Code.gs and Config.gs templates (with placeholders)
- ✅ Documentation
- ✅ R scripts
- ✅ `.gitignore`

**What must NEVER be committed:**
- ❌ Config.gs with actual moderator emails and secret
- ❌ Sheet IDs
- ❌ Web App URLs
- ❌ `.Renviron` with actual values

**The repository contains:**
- Template Config.gs with placeholders
- You configure it locally in the Apps Script editor (browser)
- The configured version lives only in Google's cloud, never in git

## Quick Reference

**Key Values to Save Securely:**
- Google Form URL: `___________________________`
- Google Sheet ID: `___________________________`
- Web App URL: `___________________________`
- Verification Secret: `___________________________`

**Key Files (in browser, not git):**
- Apps Script Code.gs - contains all logic
- Apps Script Config.gs - contains your secrets (updated locally in browser)

## Success!

If you've made it through all the steps and tests pass, congratulations! Your conference listing system is live. 🎉

**Maintenance:**
- Check Sheet periodically for new submissions (you'll get emails)
- Run data cleanup monthly: `Rscript api/cleanup-old-data.R` (GDPR compliance)
- Update privacy policy if you change data practices
- Monitor for spam and adjust moderation criteria as needed

## Getting Help

- **Technical Documentation:** See `IMPLEMENTATION.md` (960 lines)
- **Security Info:** See `SECURITY_FIXES.md`
- **Apps Script Details:** See `apps-script/README.md`
- **R Scripts:** See `api/README.md`
- **Questions:** contact@econbase.org
