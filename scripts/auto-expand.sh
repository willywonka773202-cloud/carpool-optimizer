#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROMPT_FILE="${REPO_ROOT}/automation/auto-expand.prompt.md"
STATE_DIR="${REPO_ROOT}/.automation"
LOG_DIR="${STATE_DIR}/logs"
SUMMARY_DIR="${STATE_DIR}/summaries"
LOCK_DIR="${STATE_DIR}/auto-expand.lock"

mkdir -p "${LOG_DIR}" "${SUMMARY_DIR}"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "auto-expand: another run is already active" >&2
  exit 0
fi
trap 'rmdir "${LOCK_DIR}"' EXIT

if [[ ! -f "${PROMPT_FILE}" ]]; then
  echo "auto-expand: missing prompt file: ${PROMPT_FILE}" >&2
  exit 1
fi

CODEX_BIN="${CODEX_BIN:-}"
if [[ -z "${CODEX_BIN}" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    CODEX_BIN="/Applications/Codex.app/Contents/Resources/codex"
  fi
fi

if [[ ! -x "${CODEX_BIN}" ]]; then
  echo "auto-expand: Codex executable not found. Set CODEX_BIN=/path/to/codex" >&2
  exit 1
fi

CODEX_RESOURCES_DIR="$(cd "$(dirname "${CODEX_BIN}")" && pwd)"
export PATH="${CODEX_RESOURCES_DIR}:${PATH}"

STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
LOG_FILE="${LOG_DIR}/${STAMP}.log"
SUMMARY_FILE="${SUMMARY_DIR}/${STAMP}.md"
TMP_PROMPT="$(mktemp "${TMPDIR:-/tmp}/carpool-auto-expand.XXXXXX")"
trap 'rm -f "${TMP_PROMPT}"; rmdir "${LOCK_DIR}"' EXIT

{
  cat "${PROMPT_FILE}"
  printf "\n\nRun context:\n"
  printf -- "- UTC run timestamp: %s\n" "${STAMP}"
  printf -- "- Repository root: %s\n" "${REPO_ROOT}"
  printf -- "- This run was started by scripts/auto-expand.sh.\n"
} > "${TMP_PROMPT}"

echo "auto-expand: starting ${STAMP}"
echo "auto-expand: log ${LOG_FILE}"

set +e
"${CODEX_BIN}" exec \
  --cd "${REPO_ROOT}" \
  --sandbox workspace-write \
  --output-last-message "${SUMMARY_FILE}" \
  - < "${TMP_PROMPT}" 2>&1 | tee "${LOG_FILE}"
STATUS=${PIPESTATUS[0]}
set -e

if [[ ${STATUS} -ne 0 ]]; then
  echo "auto-expand: failed with status ${STATUS}" >&2
  exit "${STATUS}"
fi

echo "auto-expand: summary ${SUMMARY_FILE}"
