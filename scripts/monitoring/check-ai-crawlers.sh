#!/bin/bash
# AI Crawler Monitoring Script (Linux/macOS)
# Usage: ./check-ai-crawlers.sh [--output=path.json] [--verbose]

set -euo pipefail

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
  esac
done

if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE="../../data/ai-crawlers-$(date -u '+%Y%m%d-%H%M%S').json"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "=== AI Search Bot Monitoring ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

ROBOTS_URL="https://www.newlifesolutions.dev/robots.txt"
ROBOTS_TXT="$(curl -fs "$ROBOTS_URL" 2>/dev/null || true)"

ACCESS_LOG="/var/log/nginx/access.log"
if [[ ! -f "$ACCESS_LOG" ]]; then
  ACCESS_LOG="/var/log/apache2/access.log"
fi
if [[ ! -f "$ACCESS_LOG" ]]; then
  ACCESS_LOG=""
fi

check_bot_access() {
  local bot_name="$1"
  local last_access="null"
  local access_count=0
  local status="not_configured"
  local notes="Not found in robots.txt"

  if [[ -n "$ACCESS_LOG" ]]; then
    local matched
    matched=$(grep -i "$bot_name" "$ACCESS_LOG" || true)
    if [[ -n "$matched" ]]; then
      last_access=$(echo "$matched" | tail -1 | awk '{print $4}' | sed 's/\[//')
      access_count=$(echo "$matched" | wc -l | tr -d ' ')
      status="active"
      notes="Detected in access logs"
    fi
  fi

  if [[ "$status" != "active" ]]; then
    if echo "$ROBOTS_TXT" | grep -i "user-agent: $bot_name" >/dev/null 2>&1; then
      status="configured_only"
      notes="Allowed in robots.txt; no log access detected"
    fi
  fi

  printf '{ "status": "%s", "last_access": %s, "access_count": %s, "robots_txt_entry": "%s", "notes": "%s" }' \
    "$status" \
    "$([[ "$last_access" != "null" ]] && printf '"%s"' "$last_access" || printf "null")" \
    "$access_count" \
    "User-agent: $bot_name\nAllow: /" \
    "$notes"
}

bots=("GPTBot" "ClaudeBot" "PerplexityBot" "OAI-SearchBot" "ChatGPT-User" "Google-Extended")

{
  echo "{"
  echo "  \"audit_type\": \"ai_crawler_access\","
  echo "  \"timestamp\": \"$(date -u '+%Y-%m-%d %H:%M:%S UTC')\","
  echo "  \"domain\": \"newlifesolutions.dev\","
  echo "  \"robots_txt_url\": \"$ROBOTS_URL\","
  echo "  \"verification_method\": \"robots_txt_and_log_scan\","
  echo "  \"bots\": {"

  for i in "${!bots[@]}"; do
    bot="${bots[$i]}"
    result=$(check_bot_access "$bot")
    printf "    \"%s\": %s" "$bot" "$result"
    if [[ $i -lt $((${#bots[@]} - 1)) ]]; then
      echo ","
    else
      echo ""
    fi
  done

  echo "  },"
  echo "  \"robots_txt_accessible\": $([[ -n "$ROBOTS_TXT" ]] && echo "true" || echo "false"),"
  echo "  \"access_log_available\": $([[ -n "$ACCESS_LOG" ]] && echo "true" || echo "false")"
  echo "}"
} > "$OUTPUT_FILE"

echo ""
echo "AI crawler audit complete."
echo "Results saved to: $OUTPUT_FILE"
echo ""

if command -v jq >/dev/null 2>&1; then
  jq -r '.bots | to_entries[] | "\(.key): \(.value.status)"' "$OUTPUT_FILE"
else
  echo "Note: jq not installed. View full results in: $OUTPUT_FILE"
fi

if [[ "$VERBOSE" == true ]]; then
  echo ""
  echo "robots.txt snippet:"
  echo "$ROBOTS_TXT" | grep -A1 -E "(GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|ChatGPT-User|Google-Extended)" || true
fi
