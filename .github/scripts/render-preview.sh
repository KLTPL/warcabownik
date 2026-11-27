#!/usr/bin/env bash
# Helpers for the Render PR preview of the backend.
#
#   render-preview.sh find <parent-service-id> <branch>
#     Waits for Render to create the PR preview of <parent-service-id> built
#     from <branch>; prints "id=<id>" and "url=<url>" lines (GITHUB_OUTPUT format).
#
#   render-preview.sh sync-env <service-id> KEY=VALUE...
#     Sets the given env vars on the preview, only touching keys whose value
#     differs. On the first sync it also rotates JWT_SECRET and sets
#     PREVIEW_ENV_READY=true (see server/src/preview-guard.ts). Triggers a
#     deploy when anything changed. Values are never printed.
#
# Requires RENDER_API_KEY, curl and jq.
set -euo pipefail

API="https://api.render.com/v1"

render() {
  local method=$1 path=$2 body=${3:-}
  local args=(-fsS -X "$method" -H "Authorization: Bearer $RENDER_API_KEY" -H "Accept: application/json")
  if [[ -n $body ]]; then args+=(-H "Content-Type: application/json" --data "$body"); fi
  curl "${args[@]}" "$API$path"
}

find_preview() {
  local parent=$1 branch=$2 attempts=${RENDER_FIND_ATTEMPTS:-30} match=""
  for ((i = 1; i <= attempts; i++)); do
    match=$(render GET "/services?includePreviews=true&type=web_service&limit=100" |
      jq -c --arg parent "$parent" --arg branch "$branch" '
        [.[].service
          | select(.serviceDetails.parentServer.id == $parent and .branch == $branch)]
        | first // empty')
    [[ -n $match ]] && break
    echo "Waiting for Render to create the preview of $parent ($i/$attempts)..." >&2
    sleep 10
  done
  if [[ -z $match ]]; then
    echo "No Render preview of $parent for branch $branch. Are PR previews enabled on the service?" >&2
    exit 1
  fi
  jq -r '"id=\(.id)", "url=\(.serviceDetails.url)"' <<<"$match"
}

sync_env() {
  local service=$1 changed=false current key value
  shift
  current=$(render GET "/services/$service/env-vars?limit=100" |
    jq -c 'map(.envVar | {(.key): .value}) | add // {}')

  for pair in "$@"; do
    key=${pair%%=*}
    value=${pair#*=}
    if [[ $(jq -r --arg k "$key" '.[$k] // empty' <<<"$current") != "$value" ]]; then
      render PUT "/services/$service/env-vars/$key" \
        "$(jq -cn --arg v "$value" '{value: $v}')" >/dev/null
      echo "Updated $key" >&2
      changed=true
    fi
  done

  if [[ $(jq -r '.PREVIEW_ENV_READY // empty' <<<"$current") != "true" ]]; then
    # The preview was cloned with production's JWT_SECRET; issue its own.
    render PUT "/services/$service/env-vars/JWT_SECRET" '{"generateValue":true}' >/dev/null
    render PUT "/services/$service/env-vars/PREVIEW_ENV_READY" '{"value":"true"}' >/dev/null
    echo "Rotated JWT_SECRET and set PREVIEW_ENV_READY" >&2
    changed=true
  fi

  if [[ $changed == true ]]; then
    render POST "/services/$service/deploys" '{}' >/dev/null
    echo "Triggered a deploy of $service" >&2
  else
    echo "Environment already up to date" >&2
  fi
}

case ${1:-} in
  find) find_preview "$2" "$3" ;;
  sync-env) shift; sync_env "$@" ;;
  *) echo "usage: $0 find <parent-id> <branch> | sync-env <service-id> KEY=VALUE..." >&2; exit 2 ;;
esac
