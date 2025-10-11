# R API Scripts

This directory contains R scripts for reading approved conferences from Google Sheets and exporting data for website display.

## Prerequisites

1. **R and required packages:**
```r
install.packages(c("googlesheets4", "tidyverse", "jsonlite"))
```

2. **Google Sheets authentication:**
   - For local development: Interactive OAuth (googlesheets4 will prompt)
   - For automation: Service account JSON key

## Configuration

### Local Development (.Renviron)

Create a `.Renviron` file in this directory (gitignored):

```bash
GOOGLE_SHEET_ID="your_actual_google_sheet_id_here"
```

To find your Sheet ID:
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Copy the {SHEET_ID} portion

**IMPORTANT:** Never commit .Renviron to git. Use .Renviron.example as a template.

### Service Account Setup (for automation)

1. Create a service account in Google Cloud Console:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Create new service account
   - Download JSON key file

2. Share your Google Sheet with the service account email:
   - Service account email looks like: `name@project-id.iam.gserviceaccount.com`
   - Give "Viewer" access (read-only)

3. Save the JSON key file outside your repository:
   - Good location: `~/secrets/econbase-conferences-sa.json`
   - Never commit this file to git

4. Set environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/secrets/econbase-conferences-sa.json"
```

## Scripts

### get-conferences.R

Reads approved conferences and generates JSON for website consumption.

**Usage:**
```bash
cd api
Rscript get-conferences.R
```

**What it does:**
1. Authenticates with Google Sheets
2. Reads the "Responses" sheet
3. Filters for:
   - Email Verified = "VERIFIED"
   - Status = "APPROVED"
   - Start Date >= today
4. Sorts by start date (ascending)
5. Formats dates for display
6. Writes JSON to `../website/data/conferences.json`

**Output format:**
```json
[
  {
    "name": "Conference Name",
    "start_date": "2025-06-15",
    "end_date": "2025-06-17",
    "location": "Chicago, USA",
    "url": "https://example.com",
    "description": "Brief description...",
    "submission_deadline": "2025-03-01"
  }
]
```

### cleanup-old-data.R

Removes or anonymizes conference data older than 12 months (GDPR compliance).

**Usage:**
```bash
cd api
Rscript cleanup-old-data.R
```

**What it does:**
1. Finds conferences where start_date < (today - 365 days)
2. Clears the submitter email column
3. Logs how many entries were cleaned

**Note:** This preserves conference information while removing personal data (emails).

## Scheduling

### Option 1: Cron (Unix/Linux/macOS)

Edit crontab:
```bash
crontab -e
```

Add entries:
```cron
# Update conferences every hour
0 * * * * cd /path/to/econbase-conferences/api && Rscript get-conferences.R >> /tmp/conferences.log 2>&1

# Cleanup old data monthly (1st of month at 3am)
0 3 1 * * cd /path/to/econbase-conferences/api && Rscript cleanup-old-data.R >> /tmp/cleanup.log 2>&1
```

### Option 2: GitHub Actions

See IMPLEMENTATION.md for complete GitHub Actions workflow example.

Benefits:
- No server needed
- Automatic git commits
- Works with GitHub Pages
- Built-in secrets management

### Option 3: Manual

For low-traffic sites or during testing:
```bash
# Run whenever you want to update
cd api
Rscript get-conferences.R
```

## Authentication Methods

### Interactive (local development)

First run will open browser for OAuth:
```r
library(googlesheets4)
gs4_auth()  # Opens browser, you log in
```

Token is cached in `~/.R/gargle/gargle-oauth/` for future runs.

### Non-interactive (service account)

Set environment variable before running:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
Rscript get-conferences.R
```

Or in R:
```r
library(googlesheets4)
gs4_auth(path = "/path/to/service-account.json")
```

### Non-interactive (OAuth token)

For GitHub Actions or other CI:
```r
gs4_auth(token = gargle::token_fetch(
  scopes = "https://www.googleapis.com/auth/spreadsheets.readonly",
  token = rawToChar(base64enc::base64decode(Sys.getenv("GOOGLE_SHEETS_TOKEN")))
))
```

## Testing

### Test reading data
```r
library(googlesheets4)
library(tidyverse)

# Set up
sheet_id <- Sys.getenv("GOOGLE_SHEET_ID")
gs4_auth()

# Read raw data
raw_data <- read_sheet(sheet_id, sheet = "Responses")
glimpse(raw_data)

# Check column names match expectations
expected_cols <- c("Timestamp", "Conference Name", "Start Date",
                   "End Date", "Location", "Website URL",
                   "Description", "Submission Deadline",
                   "Submitter Email", "Email Verified", "Status",
                   "Moderated By", "Moderated At")

all(expected_cols %in% names(raw_data))
```

### Test filtering logic
```r
# Test that filtering works
filtered <- raw_data %>%
  filter(
    `Email Verified` == "VERIFIED",
    Status == "APPROVED",
    `Start Date` >= Sys.Date()
  )

nrow(filtered)  # Should only include approved, upcoming conferences
```

### Test JSON output
```r
# Run the full script
source("get-conferences.R")

# Verify output
library(jsonlite)
conferences <- read_json("../website/data/conferences.json")
str(conferences)

# Check all dates are in future
all(as.Date(sapply(conferences, `[[`, "start_date")) >= Sys.Date())
```

## Troubleshooting

### Authentication errors

```r
# Clear cached credentials and re-authenticate
gs4_deauth()
gs4_auth()
```

### Permission denied

- Check that your Google account (or service account) has access to the Sheet
- Verify Sheet ID is correct
- Check Sheet is not in a restricted folder

### Column names don't match

- Google Forms generates column names from question text
- Check actual column names: `names(read_sheet(sheet_id))`
- Update script if form questions were changed

### Date parsing issues

```r
# Check date formats in Sheet
dates <- read_sheet(sheet_id, sheet = "Responses") %>%
  select(`Start Date`, `End Date`, `Submission Deadline`)

glimpse(dates)

# googlesheets4 should auto-detect Date columns
# If not, may need to parse manually
```

### Empty output

Check filtering logic:
```r
# How many total rows?
nrow(read_sheet(sheet_id))

# How many verified?
read_sheet(sheet_id) %>% count(`Email Verified`)

# How many approved?
read_sheet(sheet_id) %>% count(Status)

# How many in future?
read_sheet(sheet_id) %>%
  mutate(is_future = `Start Date` >= Sys.Date()) %>%
  count(is_future)
```

## Environment Variable Reference

- `GOOGLE_SHEET_ID` - Required. The ID of your Google Sheet
- `GOOGLE_APPLICATION_CREDENTIALS` - Optional. Path to service account JSON for automation
- `GOOGLE_SHEETS_TOKEN` - Optional. Base64-encoded OAuth token for CI/CD

## Resources

- [googlesheets4 documentation](https://googlesheets4.tidyverse.org/)
- [gargle authentication](https://gargle.r-lib.org/articles/get-api-credentials.html)
- [Service accounts guide](https://cloud.google.com/iam/docs/service-accounts)
