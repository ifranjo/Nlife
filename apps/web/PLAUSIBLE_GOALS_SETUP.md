# Plausible Goals Setup Instructions

Follow these steps to configure custom event goals in your Plausible dashboard.

---

## Access Dashboard

1. Navigate to: https://plausible.io/newlifesolutions.dev
2. Log in with your credentials
3. Click **Settings** in the top navigation
4. Select **Goals** from the left sidebar

---

## Add Custom Event Goals

Click **"+ Add goal"** for each of the following:

### Goal 1: Tool Used
- **Goal trigger:** Custom event
- **Event name:** `Tool Used`
- **Description:** Track user interactions with tools (file uploads, processing, downloads, settings changes)

**Expected properties:**
- `tool` (string) - Tool identifier (e.g., "pdf-merge", "video-compressor")
- `action` (string) - Action performed (e.g., "file_uploaded", "file_processed", "settings_changed")
- Additional metadata varies by action

---

### Goal 2: Conversion
- **Goal trigger:** Custom event
- **Event name:** `Conversion`
- **Description:** Track goal completions (successful file processing, downloads completed, tools completed)

**Expected properties:**
- `tool` (string) - Tool identifier
- `type` (string) - Conversion type (e.g., "file_processed", "download_completed", "tool_completed")
- Additional metadata like file counts, output sizes

---

### Goal 3: Tool Page View
- **Goal trigger:** Custom event
- **Event name:** `Tool Page View`
- **Description:** Track when users visit individual tool pages

**Expected properties:**
- `tool` (string) - Tool identifier
- `category` (string) - Tool category ("document", "media", "ai", "utility")
- `tier` (string) - Tool tier ("free", "pro", "coming")

---

### Goal 4: Tool Error
- **Goal trigger:** Custom event
- **Event name:** `Tool Error`
- **Description:** Track errors for debugging and improving user experience

**Expected properties:**
- `tool` (string) - Tool identifier
- `error_type` (string) - Error category (e.g., "validation_failed", "processing_error", "unsupported_format")
- Additional context about the error

---

### Goal 5: Performance
- **Goal trigger:** Custom event
- **Event name:** `Performance`
- **Description:** Track processing performance metrics

**Expected properties:**
- `tool` (string) - Tool identifier
- `duration_seconds` (number) - Processing duration in seconds
- Additional metrics like file counts, output sizes

---

### Goal 6: Engagement
- **Goal trigger:** Custom event
- **Event name:** `Engagement`
- **Description:** Track user engagement (shares, feedback, social interactions)

**Expected properties:**
- `action` (string) - Engagement action (e.g., "share_clicked", "feedback_submitted")
- `context` (string) - Where it happened (e.g., "tool_page", "footer", "navbar")
- Additional metadata

---

### Goal 7: Guide View
- **Goal trigger:** Custom event
- **Event name:** `Guide View`
- **Description:** Track when users view educational guide pages

**Expected properties:**
- `guide` (string) - Guide identifier (e.g., "merge-pdf-online-free", "compress-video-for-discord")
- `tool` (string, optional) - Associated tool if applicable

---

### Goal 8: Use Case View
- **Goal trigger:** Custom event
- **Event name:** `Use Case View`
- **Description:** Track when users view use-case landing pages

**Expected properties:**
- `use_case` (string) - Use case identifier (e.g., "pdf-merge-invoices", "compress-video-email")
- `tool` (string) - Associated tool

---

## Verify Setup

After adding all goals:

1. Goals should appear in the **Goals** list
2. Status should show as **Active**
3. Each goal should show `0` conversions initially

---

## Testing Goals

### Test in Development

1. Run the dev server: `npm run dev`
2. Open browser dev console (F12)
3. Navigate to a tool page
4. Look for analytics logs: `[Analytics] Event tracked: ...`
5. Perform actions (upload, process, download)
6. Verify events are logged

### Test in Production

After deploying to production:

1. Visit https://www.newlifesolutions.dev
2. Use a tool normally
3. Wait 1-2 minutes for events to process
4. Check Plausible dashboard under **Goal Conversions**
5. Click on each goal to see breakdown by properties

---

## Expected Event Frequency

| Goal | Frequency | Priority |
|------|-----------|----------|
| Tool Page View | High | Medium |
| Tool Used | Very High | High |
| Conversion | High | Critical |
| Tool Error | Low | Critical |
| Performance | High | Medium |
| Engagement | Low | Low |
| Guide View | Medium | Medium |
| Use Case View | Low | Low |

---

## Dashboard Views to Create

### View 1: Tool Performance Dashboard
**Filter:** Event is "Performance"
**Breakdown by:** `tool`
**Metric:** Average `duration_seconds`

**Purpose:** Identify slow tools that need optimization

---

### View 2: Conversion Funnel
**Filter:** Event is "Conversion"
**Breakdown by:** `type`
**Metric:** Count

**Purpose:** Track completion rates and identify drop-off points

---

### View 3: Error Tracking
**Filter:** Event is "Tool Error"
**Breakdown by:** `tool`, then `error_type`
**Metric:** Count

**Purpose:** Prioritize bug fixes and improve error handling

---

### View 4: Popular Tools
**Filter:** Event is "Tool Used"
**Breakdown by:** `tool`
**Metric:** Count

**Purpose:** Understand which tools are most valuable to users

---

### View 5: Tool Adoption
**Filter:** Event is "Tool Page View"
**Breakdown by:** `tier`, then `category`
**Metric:** Count

**Purpose:** Track feature discovery and categorization effectiveness

---

## Properties to Analyze

Once data starts flowing, analyze these properties:

### By Tool
- Which tools get the most traffic?
- Which tools have highest completion rates?
- Which tools have most errors?
- Which tools are slowest?

### By Action
- What do users do most (upload, download, process)?
- Are users changing settings frequently?
- Which features are used vs ignored?

### By Type
- Which conversion types are most common?
- Are users completing full workflows?
- What's the download rate after processing?

### By Error Type
- Which errors occur most frequently?
- Are errors tool-specific or systemic?
- Which file types cause most issues?

---

## Alert Configuration (Optional)

Set up alerts for critical events:

### High Error Rate Alert
**Trigger:** `Tool Error` count > 10 in 1 hour
**Action:** Email notification
**Purpose:** Detect production issues quickly

### Low Conversion Rate Alert
**Trigger:** `Conversion` count < 5 in 24 hours
**Action:** Email notification
**Purpose:** Detect analytics tracking issues or traffic drops

---

## Data Retention

Plausible retains data:
- **Forever** on paid plans
- Check your specific plan for details

---

## Privacy Compliance

Plausible is GDPR-compliant by default:

- ✅ No cookies
- ✅ No personal data collected
- ✅ No cross-site tracking
- ✅ EU-based infrastructure
- ✅ Open source

**No additional consent banners required** when using only Plausible.

---

## API Access (Optional)

Plausible provides a Stats API for programmatic access:

**Documentation:** https://plausible.io/docs/stats-api

**Use cases:**
- Build custom dashboards
- Export data for analysis
- Integrate with other tools
- Create automated reports

---

## Next Steps

1. ✅ Add all 8 custom event goals
2. ✅ Verify goals are active
3. ✅ Test in development
4. ✅ Deploy to production
5. ✅ Verify events in dashboard
6. ✅ Create custom views
7. ✅ Set up alerts (optional)
8. ✅ Share dashboard with team

---

## Support

**Plausible Support:**
- Documentation: https://plausible.io/docs
- Support: support@plausible.io
- Community: https://github.com/plausible/analytics

**Project Support:**
- Integration Guide: `apps/web/ANALYTICS_INTEGRATION_GUIDE.md`
- Implementation Summary: `apps/web/ANALYTICS_IMPLEMENTATION_SUMMARY.md`
- Core Utility: `apps/web/src/lib/analytics.ts`

---

**Last Updated:** 2025-12-24
**Status:** Ready for Configuration
