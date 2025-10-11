# Google Apps Script

This directory contains the Google Apps Script code for email verification and moderation workflow.

## Setup

### Prerequisites

1. Install clasp (Google Apps Script CLI):
```bash
npm install -g @google/clasp
```

2. Login to your Google account:
```bash
clasp login
```

### Creating the Apps Script Project

1. Create a new Google Form with the fields specified in IMPLEMENTATION.md
2. Link the form to a new Google Sheet
3. In the Sheet, add column headers for columns J-N:
   - J: Submission ID (CRITICAL - enables row-reorder resilience)
   - K: Email Verified
   - L: Status
   - M: Moderated By
   - N: Moderated At

4. Initialize the clasp project:
```bash
cd apps-script
clasp create --title "EconBase Conference Moderation" --type sheets
```

5. Note the Script ID from the `.clasp.json` file that was created (this file is gitignored)

6. Push the code to Google Apps Script:
```bash
clasp push
```

7. Open in the Apps Script editor:
```bash
clasp open
```

### Configuration

**IMPORTANT: Never commit production configuration values!**

Before deploying, you must update `Config.gs` locally with:

1. **Generate a verification secret:**
```bash
openssl rand -base64 32
```

2. **Update Config.gs locally** (do not commit):
   - Replace `MODERATOR_1_EMAIL` with your email address
   - Replace `MODERATOR_2_EMAIL` with Martin's email address
   - Replace `VERIFICATION_SECRET` with the generated secret
   - Replace `YOUR_SHEET_ID_HERE` with your actual Google Sheet ID (from the Sheet URL)

3. Push your local configuration:
```bash
clasp push
```

### Setting Up Triggers

In the Apps Script editor:

1. Click the clock icon (Triggers)
2. Click "Add Trigger"
3. Configure:
   - Function: `onFormSubmit`
   - Event source: From spreadsheet
   - Event type: On form submit
4. Save

### Deploying as Web App

In the Apps Script editor:

1. Click "Deploy" → "New deployment"
2. Click the gear icon, select "Web app"
3. Configure:
   - Description: "EconBase Conference Moderation v1"
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the web app URL (you'll need this for testing)

### Testing

1. Submit a test entry through your Google Form
2. Check that you receive a verification email
3. Click the verification link
4. Check that moderators receive the moderation email
5. Click APPROVE or REJECT
6. Verify the Sheet updates correctly

## Files

- `Code.gs` - Main script logic (verification, moderation, email sending)
- `Config.gs` - Configuration constants (with placeholders in git)
- `appsscript.json` - Apps Script manifest
- `DEPLOYMENT.md` - Deployment checklist

## Troubleshooting

### No emails received
- Check spam/junk folders
- Verify the script owner's email quota (100/day for free Gmail)
- Check Apps Script execution logs: `clasp logs`

### Trigger not firing
- Check the Triggers page in Apps Script editor
- Verify the form is properly linked to the Sheet
- Check Executions page for error messages

### Authentication errors
- Re-run `clasp login` to refresh credentials
- Check that the script has necessary permissions

## Alternative Configuration Method: Properties Service

For better security in production, consider using Apps Script Properties Service instead of hardcoded values in Config.gs:

1. Create a one-time setup function in Apps Script:
```javascript
function setupSecrets() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MODERATOR_1', 'your@email.com');
  props.setProperty('MODERATOR_2', 'martin@email.com');
  props.setProperty('VERIFICATION_SECRET', 'your-generated-secret');
}
```

2. Run `setupSecrets()` once from the editor
3. Delete the function
4. Update Config.gs to read from properties (see IMPLEMENTATION.md Security section)

## Resources

- [Apps Script Documentation](https://developers.google.com/apps-script)
- [clasp Documentation](https://github.com/google/clasp)
- [MailApp Service](https://developers.google.com/apps-script/reference/mail/mail-app)
