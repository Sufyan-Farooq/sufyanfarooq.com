#!/usr/bin/env bash
# Installed as root-owned /usr/local/bin/deploy-sufyanfarooq.
# The CI SSH key can run only this command; it cannot open a shell.
set -euo pipefail
if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo 'Only deploy <40-character commit SHA> is permitted.' >&2
  exit 1
fi
revision=${BASH_REMATCH[1]}
exec 9>/home/ubuntu/.portfolio-deploy.lock
flock -w 600 9
cd /home/ubuntu/apps/sufyanfarooq.com
git fetch origin main
if [[ $revision != $(git rev-parse origin/main) ]]; then
  echo 'This commit is no longer the main branch tip; deployment skipped.'
  exit 0
fi
test -f data/stats.json
baseline=$(python3 -c 'import json; n=json.load(open("data/stats.json"))["totalVisits"]; assert type(n) is int and n>=0; print(n)')
backup_dir=/home/ubuntu/backups/portfolio-deploy-$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:7}
mkdir -m 700 -p "$backup_dir"
cp data/stats.json "$backup_dir/stats.json"
chmod 600 "$backup_dir/stats.json"
previous_image=$(docker inspect portfolio --format '{{.Image}}')
# Keep a named reference: the containerd image store drops untagged images
# once nothing uses them, which would leave rollback nothing to restore.
docker image tag "$previous_image" portfolio-portfolio:previous
git merge --ff-only "$revision"
docker compose build portfolio
rollback() {
  echo 'Deployment failed; restoring the previous container image.' >&2
  docker image tag portfolio-portfolio:previous portfolio-portfolio:latest
  docker compose up -d --no-build --force-recreate portfolio
}
trap 'rollback' ERR
docker compose up -d --no-build --force-recreate portfolio
healthy=false
for attempt in $(seq 1 15); do
  if curl -fsS --max-time 5 http://127.0.0.1:3001/api/stats | python3 -c \
    'import json,sys; n=json.load(sys.stdin)["totalVisits"]; assert type(n) is int and n>=int(sys.argv[1])' "$baseline" \
    && curl -fsS --max-time 5 http://127.0.0.1:3001/ | grep -q 'id="status-board"'; then
    healthy=true
    break
  fi
  sleep 2
done
if [[ $healthy != true ]]; then
  rollback
  trap - ERR
  exit 1
fi
trap - ERR
echo "Deployed $revision; saved visits preserved (at least $baseline)."
