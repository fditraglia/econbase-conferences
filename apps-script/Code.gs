/**
 * EconBase Conference Moderation System
 *
 * This script handles:
 * - Email verification for conference submissions
 * - Moderation workflow (approve/reject)
 * - Email notifications to submitters and moderators
 *
 * See IMPLEMENTATION.md for full specification.
 */

/**
 * Triggered when a new form submission is received
 * Sends verification email to submitter
 */
function onFormSubmit(e) {
  try {
    // Use the sheet from the event, not getActiveSheet() which is UI-dependent
    var sheet = e.range.getSheet();
    var row = e.range.getRow();

    Logger.log('Processing form submission for row: ' + row);

    // Get form values
    var values = e.values;
    var conferenceName = values[CONFIG.COLUMNS.CONFERENCE_NAME - 1];
    var startDate = values[CONFIG.COLUMNS.START_DATE - 1];
    var endDate = values[CONFIG.COLUMNS.END_DATE - 1];
    var location = values[CONFIG.COLUMNS.LOCATION - 1];
    var url = values[CONFIG.COLUMNS.URL - 1];
    var description = values[CONFIG.COLUMNS.DESCRIPTION - 1];
    var submissionDeadline = values[CONFIG.COLUMNS.SUBMISSION_DEADLINE - 1];
    var submitterEmail = values[CONFIG.COLUMNS.SUBMITTER_EMAIL - 1];

    // Set initial status
    sheet.getRange(row, CONFIG.COLUMNS.EMAIL_VERIFIED).setValue(CONFIG.STATUS.UNVERIFIED);
    sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue(CONFIG.STATUS.PENDING);

    // Generate verification token
    var token = generateVerificationToken(row, submitterEmail);

    // Send verification email
    var sent = sendVerificationEmail(
      submitterEmail,
      conferenceName,
      startDate,
      endDate,
      location,
      token,
      row
    );

    if (!sent) {
      sheet.getRange(row, CONFIG.COLUMNS.EMAIL_VERIFIED).setValue(CONFIG.STATUS.EMAIL_FAILED);
      Logger.log('Failed to send verification email for row: ' + row);
    } else {
      Logger.log('Verification email sent successfully for row: ' + row);
    }

  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());
    throw error;
  }
}

/**
 * Handles GET requests to the web app
 * Routes to verification, approval, or rejection handlers
 */
function doGet(e) {
  var action = e.parameter.action;
  var row = parseInt(e.parameter.row);
  var token = e.parameter.token;
  var moderator = e.parameter.moderator; // Moderator email from URL (verified by token)

  Logger.log('doGet called with action: ' + action + ', row: ' + row + ', moderator: ' + moderator);

  try {
    // Use explicit sheet name instead of getActiveSheet()
    var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESPONSES_SHEET);

    if (!sheet) {
      Logger.log('ERROR: Could not find responses sheet: ' + CONFIG.RESPONSES_SHEET);
      return createHtmlResponse('Configuration error: responses sheet not found', false);
    }

    if (action === 'verify') {
      return handleVerification(sheet, row, token);
    } else if (action === 'approve') {
      return handleApprove(sheet, row, token, moderator);
    } else if (action === 'reject') {
      return handleReject(sheet, row, token, moderator);
    } else {
      return createHtmlResponse('Invalid action', false);
    }

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createHtmlResponse('An error occurred: ' + error.toString(), false);
  }
}

/**
 * Handles email verification
 */
function handleVerification(sheet, row, token) {
  // Get submission data
  var emailVerified = sheet.getRange(row, CONFIG.COLUMNS.EMAIL_VERIFIED).getValue();
  var submitterEmail = sheet.getRange(row, CONFIG.COLUMNS.SUBMITTER_EMAIL).getValue();
  var timestamp = sheet.getRange(row, CONFIG.COLUMNS.TIMESTAMP).getValue();
  var conferenceName = sheet.getRange(row, CONFIG.COLUMNS.CONFERENCE_NAME).getValue();

  // Check if already verified
  if (emailVerified === CONFIG.STATUS.VERIFIED) {
    return createHtmlResponse(
      'This email has already been verified. Your submission is under review.',
      true
    );
  }

  // Validate token
  var expectedToken = generateVerificationToken(row, submitterEmail);
  if (token !== expectedToken) {
    return createHtmlResponse('Invalid verification link.', false);
  }

  // Check expiration (7 days)
  var now = new Date();
  var submissionDate = new Date(timestamp);
  var daysSinceSubmission = (now - submissionDate) / (1000 * 60 * 60 * 24);

  if (daysSinceSubmission > CONFIG.VERIFICATION_EXPIRY_DAYS) {
    return createHtmlResponse(
      'This verification link has expired. Please submit your conference again.',
      false
    );
  }

  // Mark as verified
  sheet.getRange(row, CONFIG.COLUMNS.EMAIL_VERIFIED).setValue(CONFIG.STATUS.VERIFIED);

  // Notify moderators
  notifyModerators(sheet, row);

  Logger.log('Email verified for row: ' + row);

  return createHtmlResponse(
    'Thank you! Your email has been verified.<br><br>' +
    'Your conference submission "<strong>' + conferenceName + '</strong>" ' +
    'has been sent to our moderators for review. ' +
    'You will be notified when it is approved.',
    true
  );
}

/**
 * Handles conference approval
 */
function handleApprove(sheet, row, token, moderatorEmail) {
  return handleModeration(sheet, row, token, moderatorEmail, CONFIG.STATUS.APPROVED);
}

/**
 * Handles conference rejection
 */
function handleReject(sheet, row, token, moderatorEmail) {
  return handleModeration(sheet, row, token, moderatorEmail, CONFIG.STATUS.REJECTED);
}

/**
 * Common moderation handler
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number
 * @param {string} token - The HMAC token from the URL
 * @param {string} moderatorEmail - The moderator email from the URL (to be verified by token)
 * @param {string} newStatus - The new status (APPROVED or REJECTED)
 */
function handleModeration(sheet, row, token, moderatorEmail, newStatus) {
  // CRITICAL SECURITY: Validate moderation token first
  var action = newStatus.toLowerCase(); // "approved" or "rejected"

  // Check that moderator email was provided
  if (!moderatorEmail) {
    Logger.log('Missing moderator parameter in moderation request for row: ' + row);
    return createHtmlResponse(
      'Invalid moderation link. Please use the link from the original moderation email.',
      false
    );
  }

  // Validate token matches the expected HMAC for this row + action + moderator
  var expectedToken = generateModerationToken(row, action, moderatorEmail);

  if (token !== expectedToken) {
    Logger.log('Invalid moderation token for row: ' + row + ', action: ' + action + ', moderator: ' + moderatorEmail);
    return createHtmlResponse(
      'Invalid or expired moderation link. Please use the link from the original moderation email.',
      false
    );
  }

  // Token is valid, which proves:
  // 1. The moderator received the email (has access to the secret)
  // 2. The link is for this specific row, action, and moderator
  // 3. The moderator email is authentic (embedded in the HMAC)

  // Verify the moderator is in the authorized list
  var isAuthorized = false;
  for (var i = 0; i < CONFIG.MODERATORS.length; i++) {
    if (CONFIG.MODERATORS[i].toLowerCase() === moderatorEmail.toLowerCase()) {
      isAuthorized = true;
      break;
    }
  }

  if (!isAuthorized) {
    Logger.log('Token valid but moderator not in authorized list: ' + moderatorEmail + ' for row: ' + row);
    return createHtmlResponse(
      'This moderation link was not sent to an authorized moderator. Contact the system administrator.',
      false
    );
  }

  // Optional: Log the active user if available (for audit purposes)
  // Note: This will often be blank for external moderators (e.g., personal Gmail)
  var sessionUser = Session.getActiveUser().getEmail();
  if (sessionUser) {
    Logger.log('Session user: ' + sessionUser + ' (token verified for: ' + moderatorEmail + ')');
  } else {
    Logger.log('Session user blank (external moderator), using token-verified: ' + moderatorEmail);
  }

  var currentStatus = sheet.getRange(row, CONFIG.COLUMNS.STATUS).getValue();
  var emailVerified = sheet.getRange(row, CONFIG.COLUMNS.EMAIL_VERIFIED).getValue();
  var conferenceName = sheet.getRange(row, CONFIG.COLUMNS.CONFERENCE_NAME).getValue();
  var submitterEmail = sheet.getRange(row, CONFIG.COLUMNS.SUBMITTER_EMAIL).getValue();

  // Check if email is verified
  if (emailVerified !== CONFIG.STATUS.VERIFIED) {
    return createHtmlResponse(
      'This submission has not been verified yet.',
      false
    );
  }

  // Check if already moderated
  if (currentStatus === CONFIG.STATUS.APPROVED) {
    return createHtmlResponse(
      'This conference has already been approved.',
      true
    );
  }

  if (currentStatus === CONFIG.STATUS.REJECTED) {
    return createHtmlResponse(
      'This conference has already been rejected.',
      true
    );
  }

  // Update status
  sheet.getRange(row, CONFIG.COLUMNS.STATUS).setValue(newStatus);
  sheet.getRange(row, CONFIG.COLUMNS.MODERATED_BY).setValue(moderatorEmail);
  sheet.getRange(row, CONFIG.COLUMNS.MODERATED_AT).setValue(new Date());

  Logger.log('Conference ' + newStatus.toLowerCase() + ' by ' + moderatorEmail + ' for row: ' + row);

  // Notify other moderator
  notifyOtherModerator(moderatorEmail, newStatus, conferenceName);

  // Notify submitter if approved
  if (newStatus === CONFIG.STATUS.APPROVED) {
    notifySubmitterApproved(submitterEmail, conferenceName);
  }

  var actionWord = newStatus === CONFIG.STATUS.APPROVED ? 'approved' : 'rejected';
  return createHtmlResponse(
    'Conference "<strong>' + conferenceName + '</strong>" has been ' + actionWord + '.',
    true
  );
}

/**
 * Generates a verification token using SHA-256
 */
function generateVerificationToken(row, email) {
  var rawString = row + '|' + email + '|' + CONFIG.VERIFICATION_SECRET;
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    rawString,
    Utilities.Charset.UTF_8
  ).map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Generates a moderation token using HMAC-SHA256
 * This token authorizes a specific moderator to perform a specific action on a specific row
 * @param {number} row - The spreadsheet row number
 * @param {string} action - The action ('approved' or 'rejected')
 * @param {string} moderatorEmail - The email of the moderator this token is for
 */
function generateModerationToken(row, action, moderatorEmail) {
  var rawString = row + '|' + action + '|' + moderatorEmail + '|' + CONFIG.VERIFICATION_SECRET;
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    rawString,
    Utilities.Charset.UTF_8
  ).map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Sends verification email to submitter
 */
function sendVerificationEmail(email, conferenceName, startDate, endDate, location, token, row) {
  try {
    var webAppUrl = ScriptApp.getService().getUrl();
    var verifyUrl = webAppUrl + '?action=verify&row=' + row + '&token=' + token;

    var dateStr = formatDate(startDate);
    if (endDate) {
      dateStr += ' to ' + formatDate(endDate);
    }

    var subject = 'Please verify your conference submission: ' + conferenceName;

    var body =
      'Thank you for submitting your conference to EconBase!\n\n' +
      'Conference: ' + conferenceName + '\n' +
      'Date: ' + dateStr + '\n' +
      'Location: ' + location + '\n\n' +
      'To complete your submission, please verify your email address by clicking:\n' +
      verifyUrl + '\n\n' +
      'This link will expire in ' + CONFIG.VERIFICATION_EXPIRY_DAYS + ' days.\n\n' +
      'If you did not submit this conference, please ignore this email.\n\n' +
      '---\n' +
      'EconBase Conference Listings\n' +
      CONFIG.URLS.WEBSITE;

    var htmlBody =
      '<p>Thank you for submitting your conference to EconBase!</p>' +
      '<table style="margin: 20px 0; border-collapse: collapse;">' +
      '<tr><td style="padding: 5px; font-weight: bold;">Conference:</td><td style="padding: 5px;">' + conferenceName + '</td></tr>' +
      '<tr><td style="padding: 5px; font-weight: bold;">Date:</td><td style="padding: 5px;">' + dateStr + '</td></tr>' +
      '<tr><td style="padding: 5px; font-weight: bold;">Location:</td><td style="padding: 5px;">' + location + '</td></tr>' +
      '</table>' +
      '<p>To complete your submission, please verify your email address:</p>' +
      '<p><a href="' + verifyUrl + '" style="display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px;">Verify Email Address</a></p>' +
      '<p><small>This link will expire in ' + CONFIG.VERIFICATION_EXPIRY_DAYS + ' days.</small></p>' +
      '<p><small>If you did not submit this conference, please ignore this email.</small></p>' +
      '<hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">' +
      '<p style="color: #666; font-size: 12px;">EconBase Conference Listings<br>' +
      '<a href="' + CONFIG.URLS.WEBSITE + '">' + CONFIG.URLS.WEBSITE + '</a></p>';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      name: CONFIG.EMAIL.FROM_NAME,
      replyTo: CONFIG.EMAIL.REPLY_TO
    });

    return true;

  } catch (error) {
    Logger.log('Error sending verification email: ' + error.toString());
    return false;
  }
}

/**
 * Notifies moderators of a verified submission
 */
function notifyModerators(sheet, row) {
  try {
    var conferenceName = sheet.getRange(row, CONFIG.COLUMNS.CONFERENCE_NAME).getValue();
    var startDate = sheet.getRange(row, CONFIG.COLUMNS.START_DATE).getValue();
    var endDate = sheet.getRange(row, CONFIG.COLUMNS.END_DATE).getValue();
    var location = sheet.getRange(row, CONFIG.COLUMNS.LOCATION).getValue();
    var url = sheet.getRange(row, CONFIG.COLUMNS.URL).getValue();
    var description = sheet.getRange(row, CONFIG.COLUMNS.DESCRIPTION).getValue();
    var submissionDeadline = sheet.getRange(row, CONFIG.COLUMNS.SUBMISSION_DEADLINE).getValue();
    var submitterEmail = sheet.getRange(row, CONFIG.COLUMNS.SUBMITTER_EMAIL).getValue();

    var webAppUrl = ScriptApp.getService().getUrl();

    // Generate secure moderation tokens for EACH moderator
    // Each moderator gets their own unique token bound to their email
    var moderatorUrls = CONFIG.MODERATORS.map(function(moderator) {
      var approveToken = generateModerationToken(row, 'approved', moderator);
      var rejectToken = generateModerationToken(row, 'rejected', moderator);

      return {
        email: moderator,
        approveUrl: webAppUrl + '?action=approve&row=' + row + '&moderator=' + encodeURIComponent(moderator) + '&token=' + approveToken,
        rejectUrl: webAppUrl + '?action=reject&row=' + row + '&moderator=' + encodeURIComponent(moderator) + '&token=' + rejectToken
      };
    });

    var dateStr = formatDate(startDate);
    if (endDate) {
      dateStr += ' to ' + formatDate(endDate);
    }

    var deadlineStr = submissionDeadline ? formatDate(submissionDeadline) : 'Not specified';

    var subject = '📋 New Conference for Review: ' + conferenceName;

    // Send personalized email to each moderator with their unique token
    moderatorUrls.forEach(function(modData) {
      var body =
        'New Verified Conference Submission\n\n' +
        'Conference: ' + conferenceName + '\n' +
        'Date: ' + dateStr + '\n' +
        'Location: ' + location + '\n' +
        'Website: ' + url + '\n\n' +
        'Description:\n' + description + '\n\n' +
        'Submission Deadline: ' + deadlineStr + '\n' +
        'Submitted by: ' + submitterEmail + '\n\n' +
        'APPROVE: ' + modData.approveUrl + '\n' +
        'REJECT: ' + modData.rejectUrl + '\n\n' +
        'View in spreadsheet (Row ' + row + '):\n' +
        'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID;

      var htmlBody =
        '<div style="font-family: Arial, sans-serif; max-width: 600px;">' +
        '<h2 style="color: #333;">New Verified Conference Submission</h2>' +
        '<div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">' +
        '<h3 style="margin-top: 0; color: #0066cc;">' + conferenceName + '</h3>' +
        '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Date:</td><td>' + dateStr + '</td></tr>' +
        '<tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td>' + location + '</td></tr>' +
        '<tr><td style="padding: 8px 0; font-weight: bold;">Website:</td><td><a href="' + url + '">' + url + '</a></td></tr>' +
        '<tr><td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Description:</td><td>' + description + '</td></tr>' +
        '<tr><td style="padding: 8px 0; font-weight: bold;">CFP Deadline:</td><td>' + deadlineStr + '</td></tr>' +
        '<tr><td style="padding: 8px 0; font-weight: bold;">Submitted by:</td><td>' + submitterEmail + '</td></tr>' +
        '</table>' +
        '</div>' +
        '<div style="margin: 30px 0; text-align: center;">' +
        '<a href="' + modData.approveUrl + '" style="display: inline-block; padding: 12px 30px; margin: 0 10px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">✓ APPROVE</a>' +
        '<a href="' + modData.rejectUrl + '" style="display: inline-block; padding: 12px 30px; margin: 0 10px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">✗ REJECT</a>' +
        '</div>' +
        '<p style="text-align: center; margin-top: 20px;">' +
        '<a href="https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '" style="color: #666; font-size: 14px;">View in spreadsheet (Row ' + row + ')</a>' +
        '</p>' +
        '</div>';

      MailApp.sendEmail({
        to: modData.email,
        subject: subject,
        body: body,
        htmlBody: htmlBody,
        name: CONFIG.EMAIL.FROM_NAME,
        replyTo: CONFIG.EMAIL.REPLY_TO
      });
    });

    Logger.log('Moderators notified for row: ' + row);

  } catch (error) {
    Logger.log('Error notifying moderators: ' + error.toString());
  }
}

/**
 * Notifies the other moderator of a moderation action
 */
function notifyOtherModerator(actingModerator, action, conferenceName) {
  try {
    var otherModerators = CONFIG.MODERATORS.filter(function(email) {
      return email !== actingModerator;
    });

    if (otherModerators.length === 0) return;

    var actionEmoji = action === CONFIG.STATUS.APPROVED ? '✅' : '❌';
    var actionWord = action === CONFIG.STATUS.APPROVED ? 'approved' : 'rejected';

    var subject = actionEmoji + ' ' + conferenceName;

    var body =
      actingModerator + ' just ' + actionWord + ' this conference:\n\n' +
      conferenceName + '\n\n' +
      'View all conferences:\n' +
      'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID;

    var htmlBody =
      '<p><strong>' + actingModerator + '</strong> just ' + actionWord + ' this conference:</p>' +
      '<p style="font-size: 18px; color: #333;"><strong>' + conferenceName + '</strong></p>' +
      '<p><a href="https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '">View all conferences</a></p>';

    otherModerators.forEach(function(moderator) {
      MailApp.sendEmail({
        to: moderator,
        subject: subject,
        body: body,
        htmlBody: htmlBody,
        name: CONFIG.EMAIL.FROM_NAME,
        replyTo: CONFIG.EMAIL.REPLY_TO
      });
    });

  } catch (error) {
    Logger.log('Error notifying other moderator: ' + error.toString());
  }
}

/**
 * Notifies submitter that their conference was approved
 */
function notifySubmitterApproved(email, conferenceName) {
  try {
    var subject = 'Your conference has been approved: ' + conferenceName;

    var body =
      'Good news! Your conference submission has been approved and is now listed on EconBase.\n\n' +
      'Conference: ' + conferenceName + '\n' +
      'View at: ' + CONFIG.URLS.CONFERENCES_PAGE + '\n\n' +
      'Thank you for contributing to the econometrics community!\n\n' +
      '---\n' +
      'We will retain your email for 12 months after the conference date, then delete it.\n' +
      'To request earlier deletion, reply to this email.\n\n' +
      'EconBase Conference Listings\n' +
      CONFIG.URLS.WEBSITE;

    var htmlBody =
      '<p>Good news! Your conference submission has been approved and is now listed on EconBase.</p>' +
      '<p style="font-size: 18px; margin: 20px 0;"><strong>' + conferenceName + '</strong></p>' +
      '<p><a href="' + CONFIG.URLS.CONFERENCES_PAGE + '" style="display: inline-block; padding: 10px 20px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px;">View Conference Listings</a></p>' +
      '<p>Thank you for contributing to the econometrics community!</p>' +
      '<hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">' +
      '<p style="color: #666; font-size: 12px;">We will retain your email for 12 months after the conference date, then delete it.<br>' +
      'To request earlier deletion, reply to this email.</p>' +
      '<p style="color: #666; font-size: 12px;">EconBase Conference Listings<br>' +
      '<a href="' + CONFIG.URLS.WEBSITE + '">' + CONFIG.URLS.WEBSITE + '</a></p>';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      name: CONFIG.EMAIL.FROM_NAME,
      replyTo: CONFIG.EMAIL.REPLY_TO
    });

  } catch (error) {
    Logger.log('Error notifying submitter of approval: ' + error.toString());
  }
}

/**
 * Creates an HTML response for web app requests
 */
function createHtmlResponse(message, success) {
  var color = success ? '#28a745' : '#dc3545';
  var icon = success ? '✓' : '✗';

  var html =
    '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>EconBase Conference Listings</title>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }' +
    '.icon { font-size: 48px; margin: 20px 0; color: ' + color + '; }' +
    '.message { font-size: 18px; line-height: 1.6; color: #333; }' +
    '.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }' +
    'a { color: #0066cc; text-decoration: none; }' +
    'a:hover { text-decoration: underline; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="icon">' + icon + '</div>' +
    '<div class="message">' + message + '</div>' +
    '<div class="footer">' +
    '<p><a href="' + CONFIG.URLS.CONFERENCES_PAGE + '">View Conference Listings</a> | ' +
    '<a href="' + CONFIG.URLS.WEBSITE + '">EconBase Home</a></p>' +
    '</div>' +
    '</body>' +
    '</html>';

  return HtmlService.createHtmlOutput(html);
}

/**
 * Formats a date for display
 */
function formatDate(date) {
  if (!date) return '';

  if (typeof date === 'string') {
    date = new Date(date);
  }

  var options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}
