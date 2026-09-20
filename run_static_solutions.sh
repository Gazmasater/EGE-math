#!/usr/bin/env bash
set -u
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$ROOT_DIR/STATIC_SOLUTIONS_PROGRESS.md"
PROMPT_FILE="$ROOT_DIR/PROMPT_ONE_STATIC_TASK.md"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/static-solutions-codex.log"
MAX_RETRIES=2
MAX_STALLS=2
mkdir -p "$LOG_DIR"
count_status(){ grep -c "^- \[${1}\]" "$PROGRESS_FILE" 2>/dev/null || true; }
remaining(){ echo $(( $(count_status ' ') + $(count_status '~') )); }
status(){ printf 'Готово [x]: %s\n' "$(count_status x)"; printf 'Не начато [ ]: %s\n' "$(count_status ' ')"; printf 'В работе [~]: %s\n' "$(count_status '~')"; printf 'Блокировано [!]: %s\n' "$(count_status '!')"; }
[[ -f "$PROGRESS_FILE" && -f "$PROMPT_FILE" ]] || { echo 'Не найден progress или prompt-файл' >&2; exit 2; }
limit=0
dry_run=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=1; shift;;
    --limit) [[ $# -ge 2 && "$2" =~ ^[0-9]+$ ]] || { echo 'Некорректный --limit' >&2; exit 2; }; limit=$2; shift 2;;
    --status) status; exit 0;;
    *) echo "Неизвестный параметр: $1" >&2; exit 2;;
  esac
done
before=$(remaining)
if (( before == 0 )); then echo 'Все доступные задачи статики обработаны.'; exit 0; fi
if ! command -v codex >/dev/null 2>&1; then echo 'codex не найден в PATH' >&2; exit 2; fi
if (( dry_run )); then echo "Осталось задач: $before"; echo "Progress: $PROGRESS_FILE"; echo "Prompt: $PROMPT_FILE"; echo "Log: $LOG_FILE"; echo "Команда: codex exec --sandbox workspace-write --cd '$ROOT_DIR' - < '$PROMPT_FILE'"; exit 0; fi
completed=0
stalls=0
while (( before > 0 )); do
  if (( limit > 0 && completed >= limit )); then break; fi
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  { echo '========================================'; echo "$ts"; echo "remaining before: $before"; echo '========================================'; } >>"$LOG_FILE"
  success=0
  for attempt in $(seq 1 "$MAX_RETRIES"); do
    if codex exec --sandbox workspace-write --cd "$ROOT_DIR" - <"$PROMPT_FILE" >>"$LOG_FILE" 2>&1; then success=1; break; fi
    echo "$ts exit failure, attempt=$attempt" >>"$LOG_FILE"
  done
  if (( ! success )); then echo "codex завершился с ошибкой; см. $LOG_FILE" >&2; exit 1; fi
  after=$(remaining)
  if (( after < before )); then stalls=0; completed=$((completed+1)); else stalls=$((stalls+1)); fi
  before=$after
  if (( stalls >= MAX_STALLS )); then echo "Нет прогресса после $MAX_STALLS запусков; осталось $before. Лог: $LOG_FILE" >&2; exit 1; fi
done
status
