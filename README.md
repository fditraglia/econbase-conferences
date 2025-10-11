# EconBase Conference Listings

A conference/workshop listing service for the econometrics community, replacing the defunct "Econometric Links" previously run by Marius Ooms.

## Architecture

- **Input:** Google Form (public submission)
- **Storage:** Google Sheets (submission database)
- **Processing:** Google Apps Script (email verification + moderation)
- **API:** R script reading from Sheet via `googlesheets4`
- **Display:** EconBase website consumes API output

This architecture is platform-agnostic, enabling parallel development without blocking on main EconBase platform decisions.

## Repository Structure

```
econbase-conferences/
├── README.md             # This file
├── IMPLEMENTATION.md     # Complete technical specification
├── CLAUDE.md             # Guidance for Claude Code
├── .gitignore            # Excludes secrets and credentials
├── apps-script/          # Google Apps Script code
│   ├── Code.gs          # Main verification and moderation logic
│   ├── Config.gs        # Configuration (placeholders only)
│   ├── appsscript.json  # Apps Script manifest
│   ├── README.md        # Setup instructions
│   └── DEPLOYMENT.md    # Pre-deployment checklist
├── api/                  # R scripts for data export
│   ├── README.md        # R script setup and usage
│   └── .Renviron.example # Configuration template
└── website/              # Website integration
    ├── README.md        # Integration examples
    └── data/            # Generated JSON files (from R scripts)
```

## Quick Start

### 1. Set Up Google Form and Sheet

1. Create a Google Form with the fields specified in IMPLEMENTATION.md
2. Link the form to a new Google Sheet
3. Add column headers J-M to the sheet (Email Verified, Status, Moderated By, Moderated At)

### 2. Deploy Google Apps Script

```bash
# Install clasp
npm install -g @google/clasp

# Navigate to apps-script directory
cd apps-script

# Follow the setup instructions in apps-script/README.md
```

**IMPORTANT:** Before deploying, update `Config.gs` locally with:
- Your actual moderator email addresses
- A cryptographically random verification secret (generate with `openssl rand -base64 32`)
- Your Google Sheet ID
- Never commit production values to git!

See `apps-script/DEPLOYMENT.md` for complete checklist.

### 3. Set Up R Scripts

```bash
# Install R packages
R -e "install.packages(c('googlesheets4', 'tidyverse', 'jsonlite'))"

# Create .Renviron file in api/ directory
cd api
cp .Renviron.example .Renviron
# Edit .Renviron with your Sheet ID

# Test the script
Rscript get-conferences.R
```

See `api/README.md` for authentication setup and scheduling options.

### 4. Integrate with Website

See `website/README.md` for integration examples (vanilla JavaScript, React, server-side).

## User Flows

### Submitter Flow
1. User fills out Google Form with conference details
2. Receives verification email immediately
3. Clicks verification link
4. Sees confirmation: "Email verified, sent to moderators"
5. Receives notification when approved

### Moderator Flow
1. Someone submits → verification email sent to submitter
2. Submitter verifies → moderators get email with conference details
3. Moderator clicks APPROVE or REJECT (one-click action)
4. Other moderator gets notification
5. Submitter gets approval notification

### Public Display
1. R script runs on schedule (e.g., hourly)
2. Reads Sheet, filters for VERIFIED + APPROVED entries
3. Generates JSON for website
4. Website displays upcoming conferences

## Security and Privacy

This repository is public and safe to share. All sensitive configuration is handled via:
- `.gitignore` excludes all credentials and secrets
- `Config.gs` contains placeholders only
- Production values are configured locally and never committed
- See IMPLEMENTATION.md Security section for details

### GDPR Compliance
- Email addresses collected only for verification and notification
- 12-month retention policy after conference date
- Privacy policy required before launch
- Data cleanup script provided (`api/cleanup-old-data.R`)

## Development Status

**Current Status:** Initial implementation complete
- ✅ Google Apps Script code written
- ✅ Configuration templates created
- ✅ Documentation complete
- ⏳ Not yet deployed (awaiting Google Form/Sheet setup)

**Next Steps:**
1. Create Google Form with specified fields
2. Set up Google Sheet and link to form
3. Configure Apps Script with production values (locally)
4. Deploy and test verification workflow
5. Deploy and test moderation workflow
6. Create R scripts for data export
7. Write privacy policy
8. Integrate with EconBase website
9. Launch and announce

See `apps-script/DEPLOYMENT.md` for complete deployment checklist.

## Documentation

- **IMPLEMENTATION.md** - Complete technical specification (960 lines)
- **apps-script/README.md** - Apps Script setup and configuration
- **apps-script/DEPLOYMENT.md** - Pre-deployment checklist
- **api/README.md** - R script setup, authentication, and scheduling
- **website/README.md** - Website integration examples
- **CLAUDE.md** - Guidance for Claude Code

## Maintenance

- **Daily:** Monitor moderation emails (automatic)
- **Monthly:** Run data cleanup script (`api/cleanup-old-data.R`)
- **Quarterly:** Review privacy policy for updates

## Future Enhancements (Phase 2)

- Auto-approve from trusted domains
- Calendar export (.ics generation)
- Tag/category system
- Search/filter functionality
- Email digest (weekly roundup)

## Contributing

This is an open-source project for the econometrics community. Contributions welcome!

For questions or issues: contact@econbase.org

## License

See [LICENSE](LICENSE) file.

## Acknowledgments

Replacing the "Econometric Links" service previously maintained by Marius Ooms.
