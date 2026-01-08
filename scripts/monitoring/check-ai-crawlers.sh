#!/bin/bash
# AI Crawler Monitoring Script
# New Life Solutions - AI Search Bot Access Verification
# Usage: ./check-ai-crawlers.sh [--output=file.json]

set -e

echo "=== AI Search Bot Monitoring ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Parse arguments
OUTPUT_FILE=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --output=*)
            OUTPUT_FILE="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esedone

# Default output file
if [ -z "$OUTPUT_FILE" ]; then
    OUTPUT_FILE="../../data/ai-crawlers-$(date -u '+%Y%m%d-%H%M%S').json"
fi

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "🤖 Checking AI crawler access..."
echo ""

# Function to check if bot has accessed the site
check_bot_access() {
    local bot_name="$1"
    local log_file="$2"
    local last_access="null"
    local access_count=0

    if [ -f "$log_file" ]; then
        # Check for bot in access logs (last 7 days)
        last_access=$(grep -i "$bot_name" "$log_file" | tail -1 | awk '{print $4}' | sed 's/\[//' || echo "null")
        access_count=$(grep -i "$bot_name" "$log_file" | wc -l || echo "0")
    fi

    if [ "$last_access" = "null" ] || [ "$access_count" = "0" ]; then
        # Check if bot is configured in robots.txt
        if curl -sf https://www.newlifesolutions.dev/robots.txt 2>/dev/null | grep -i "user-agent: $bot_name" > /dev/null; then
            status="configured_but_no_access"
            status_label="🟡 Configured - No accesses detected (yet)"
        else
            status="not_configured"
            status_label="🔴 Not in robots.txt"
        fi
    else
        status="active"
        status_label="🟢 Active - $access_count accesses"
    fi

    echo "   $bot_name: $status_label"

    cat <<EOF
    {"bot": "$bot_name", "status": "$status", "last_access": $([ "$last_access" != "null" ] && echo '"$last_access"' || echo "null"), "access_count": $access_count},
EOF
}

# Start JSON output
cat > "$OUTPUT_FILE" <<EOF
{
  "audit_type": "ai_crawler_access",
  "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "domain": "newlifesolutions.dev",
  "robots_txt_url": "https://www.newlifesolutions.dev/robots.txt",
  "bots": {
EOF

# Check access logs location
ACCESS_LOG="/var/log/nginx/access.log"
if [ ! -f "$ACCESS_LOG" ]; then
    ACCESS_LOG="/var/log/apache2/access.log"
fi
if [ ! -f "$ACCESS_LOG" ]; then
    echo "Note: No access log found at standard locations, checking via curl"
    ACCESS_LOG=""
fi

echo "📊 Checking AI search bots..."

# Critical bots for GEO
check_bot_access "GPTBot" "$ACCESS_LOG" >> "$OUTPUT_FILE"
check_bot_access "ClaudeBot" "$ACCESS_LOG" >> "$OUTPUT_FILE"
check_bot_access "PerplexityBot" "$ACCESS_LOG" >> "$OUTPUT_FILE"
check_bot_access "OAI-SearchBot" "$ACCESS_LOG" >> "$OUTPUT_FILE"
check_bot_access "ChatGPT-User" "$ACCESS_LOG" >> "$OUTPUT_FILE"

# Remove trailing comma
sed -i '$ s/,$//' "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" <<EOF
  },
  "recommendations": [
EOF

# Add recommendations based on status
if ! grep -q "active" "$OUTPUT_FILE" 2>/dev/null; then
    cat >> "$OUTPUT_FILE" <<EOF
    {"severity": "high", "message": "No AI bot activity detected. Verify server logs access and robots.txt configuration."},
EOF
fi

if grep -q "not_configured" "$OUTPUT_FILE" 2>/dev/null; then
    cat >> "$OUTPUT_FILE" <<EOF
    {"severity": "high", "message": "Some critical AI bots not configured in robots.txt. Update immediately for GEO visibility."},
EOF
fi

# Add general recommendations
cat >> "$OUTPUT_FILE" <<EOF
    {"severity": "medium", "message": "Monitor access logs weekly for new bot patterns."},
    {"severity": "low", "message": "Consider submitting sitemap to AI search platforms."}
  ]
}
EOF

echo ""
echo "✅ AI crawler audit complete!"
echo "Results saved to: $OUTPUT_FILE"
echo ""

# Display summary
if command -v jq &> /dev/null; then
    echo "📈 Summary:"
    echo "============"
    jq -r '.bots | to_entries[] | "\(.key | split(".")[0]): \(.value.bot) - \(.value.status)"' "$OUTPUT_FILE" 2>/dev/null || echo "Summary: View details in $OUTPUT_FILE"
else
    echo "Note: jq not installed. View full results in: $OUTPUT_FILE"
fi

# Check robots.txt directly
echo ""
echo "🔍 Direct robots.txt check:"
echo "============================"
if curl -sf https://www.newlifesolutions.dev/robots.txt &>/dev/null; then
    echo "✅ robots.txt accessible"
    echo ""
    echo "AI bot configuration:"
    curl -s https://www.newlifesolutions.dev/robots.txt | grep -A1 -E "(GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|ChatGPT-User)" | head -20
else
    echo "❌ Cannot fetch robots.txt - check if site is live"
fi

exit 0
