/**
 * Configuration constants for EconBase Conference Moderation
 *
 * IMPORTANT: This file contains PLACEHOLDER values only.
 * Before deploying to production, you MUST update these values locally:
 *
 * 1. Generate a verification secret:
 *    openssl rand -base64 32
 *
 * 2. Replace MODERATOR_1_EMAIL and MODERATOR_2_EMAIL with actual emails
 * 3. Replace VERIFICATION_SECRET with the generated secret
 * 4. Replace YOUR_SHEET_ID_HERE with your actual Google Sheet ID
 * 5. Update URLS when your website is live
 *
 * DO NOT commit production values to git!
 * See DEPLOYMENT.md for full instructions.
 */

var CONFIG = {
  // Moderator email addresses (replace before deployment)
  MODERATORS: [
    "MODERATOR_1_EMAIL",  // Replace with actual email
    "MODERATOR_2_EMAIL"   // Replace with actual email
  ],

  // Verification secret - MUST be changed before deployment
  // Generate with: openssl rand -base64 32
  VERIFICATION_SECRET: "CHANGE_THIS_RANDOM_STRING_BEFORE_DEPLOYMENT",

  // Google Sheet ID (get from Sheet URL after creation)
  // Example: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
  SHEET_ID: "YOUR_SHEET_ID_HERE",

  // Verification link expiry (days)
  VERIFICATION_EXPIRY_DAYS: 7,

  // Column indices (1-based, as used by Apps Script)
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
    EMAIL_VERIFIED: 10,
    STATUS: 11,
    MODERATED_BY: 12,
    MODERATED_AT: 13
  },

  // Email configuration
  EMAIL: {
    FROM_NAME: "EconBase Conference Listings",
    REPLY_TO: "contact@econbase.org",
    NO_REPLY: "noreply@econbase.org"
  },

  // URLs (update when website is live)
  URLS: {
    PRIVACY_POLICY: "https://econbase.org/privacy",
    CONFERENCES_PAGE: "https://econbase.org/conferences",
    WEBSITE: "https://econbase.org"
  },

  // Status values
  STATUS: {
    UNVERIFIED: "UNVERIFIED",
    VERIFIED: "VERIFIED",
    EMAIL_FAILED: "EMAIL_FAILED",
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
  }
};
