#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_DIR="${REPO_ROOT}/.automation"
mkdir -p "${STATE_DIR}"

START_MARKER="# carpool-auto-expand:start"
END_MARKER="# carpool-auto-expand:end"

CURRENT="$(mktemp "${TMPDIR:-/tmp}/carpool-cron-current.XXXXXX")"
NEXT="$(mktemp "${TMPDIR:-/tmp}/carpool-cron-next.XXXXXX")"
trap 'rm -f "${CURRENT}" "${NEXT}"' EXIT

crontab -l > "${CURRENT}" 2>/dev/null || true

STATUS=0
awk -v start="${START_MARKER}" -v end="${END_MARKER}" '
  $0 == start { skip = 1; found = 1; next }
  $0 == end { skip = 0; next }
  !skip { print }
  END { if (!found) exit 2 }
' "${CURRENT}" > "${NEXT}" || STATUS=$?

if [[ "${STATUS}" -eq 2 ]]; then
  echo "No Carpool auto-expand cron block found."
  exit 0
fi

if [[ "${STATUS}" -ne 0 ]]; then
  echo "Failed to inspect current crontab." >&2
  exit "${STATUS}"
fi

BACKUP="${STATE_DIR}/crontab.backup.$(date -u +"%Y%m%dT%H%M%SZ")"
cp "${CURRENT}" "${BACKUP}"
crontab "${NEXT}"

echo "Removed Carpool auto-expand cron schedule."
echo "Previous crontab backup: ${BACKUP}"
