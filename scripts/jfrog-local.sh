#!/usr/bin/env bash
#
# Local JFrog CLI setup and run script.
# Run from project root after: cp .env.example .env && source .env
#
# Usage:
#   ./scripts/jfrog-local.sh install   # Install deps via JFrog
#   ./scripts/jfrog-local.sh test      # Run tests
#   ./scripts/jfrog-local.sh publish   # Publish package (requires deploy repo)
#   ./scripts/jfrog-local.sh all       # install + test + publish

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${JF_URL:?JF_URL is required. Set it in .env or environment.}"
: "${JF_NPM_VIRTUAL:=npm-virtual}"
: "${JF_NPM_LOCAL:=npm-local}"
: "${BUILD_NAME:=github-jfrog-demo}"
: "${BUILD_NUMBER:=$(date +%Y%m%d%H%M%S)}"

configure_jfrog() {
  echo "Configuring JFrog CLI..."
  if [ -n "$JF_ACCESS_TOKEN" ]; then
    jf c add local --url "$JF_URL" --access-token "$JF_ACCESS_TOKEN" --interactive=false 2>/dev/null || true
  else
    jf c add local --url "$JF_URL" --user "$JF_USER" --password "$JF_API_KEY" --interactive=false 2>/dev/null || true
  fi
  jf c use local
}

# Create/update project-level npm config (JFrog CLI v2+ uses this instead of 'jf npm config')
setup_npm_project_config() {
  local resolve_repo="$1"
  local deploy_repo="${2:-}"
  mkdir -p .jfrog/projects
  cat > .jfrog/projects/npm.yaml << EOF
version: 1
type: npm
resolver:
    repo: ${resolve_repo}
    serverId: local
EOF
  if [ -n "$deploy_repo" ]; then
    cat >> .jfrog/projects/npm.yaml << EOF
deployer:
    repo: ${deploy_repo}
    serverId: local
EOF
  fi
  echo "Created .jfrog/projects/npm.yaml (resolve: $resolve_repo${deploy_repo:+, deploy: $deploy_repo})"
}

do_install() {
  configure_jfrog
  setup_npm_project_config "$JF_NPM_VIRTUAL"
  echo "Installing dependencies via JFrog..."
  jf npm install --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
}

do_test() {
  echo "Running tests..."
  npm test
}

do_publish() {
  configure_jfrog
  setup_npm_project_config "$JF_NPM_VIRTUAL" "$JF_NPM_LOCAL"
  echo "Adding VCS info..."
  jf rt build-add-git "$BUILD_NAME" "$BUILD_NUMBER" .
  echo "Publishing package..."
  jf npm publish --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
  echo "Publishing build-info..."
  jf rt build-publish "$BUILD_NAME" "$BUILD_NUMBER"
  echo "Done. Build $BUILD_NAME/$BUILD_NUMBER published."
}

do_scan() {
  if [ -z "$JF_XRAY_SCAN_ENABLED" ] || [ "$JF_XRAY_SCAN_ENABLED" != "true" ]; then
    echo "Xray scan skipped (set JF_XRAY_SCAN_ENABLED=true to enable)"
    return
  fi
  echo "Running Xray scan..."
  jf build-scan "$BUILD_NAME" "$BUILD_NUMBER"
}

CMD="${1:-all}"
case "$CMD" in
  install)  do_install ;;
  test)     do_test ;;
  publish)  do_install && do_test && do_publish && do_scan ;;
  all)      do_install && do_test && do_publish && do_scan ;;
  scan)     do_scan ;;
  *)
    echo "Usage: $0 {install|test|publish|all|scan}"
    exit 1
    ;;
esac
