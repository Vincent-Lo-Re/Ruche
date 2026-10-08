#!/bin/sh
# Serveurs locaux : Supabase (dans Docker) et l'admin (Vite, http://127.0.0.1:5173).
#   npm run local        démarre Supabase s'il ne tourne pas, puis l'admin dans ce terminal
#                        (Ctrl + C arrête l'admin ; Supabase continue de tourner)
#   npm run local:stop   arrête l'admin s'il tourne ailleurs, puis Supabase (données gardées)
# Docker Desktop n'est jamais lancé ici : il s'ouvre avec le Mac, ou à la main.

set -e
cd "$(dirname "$0")/.."

PORT_ADMIN=5173
admin_pids() { lsof -ti "tcp:$PORT_ADMIN" -sTCP:LISTEN || true; }

case "$1" in
  start)
    docker info >/dev/null 2>&1 || {
      echo "Docker n'est pas ouvert : lance Docker Desktop, puis recommence." >&2
      exit 1
    }
    npx supabase status >/dev/null 2>&1 || npx supabase start
    if [ -n "$(admin_pids)" ]; then
      echo "L'admin tourne déjà : http://127.0.0.1:$PORT_ADMIN"
      exit 0
    fi
    exec npm --prefix web run dev
    ;;
  stop)
    pids=$(admin_pids)
    [ -n "$pids" ] && kill $pids
    npx supabase stop
    ;;
  *)
    echo "Usage : $0 start | stop" >&2
    exit 1
    ;;
esac
