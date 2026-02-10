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

do_install() {
  configure_jfrog
  jf npm config --global --repo-resolve "$JF_NPM_VIRTUAL" --server-id-resolve local
  echo "Installing dependencies via JFrog..."
  jf npm install --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
}

do_test() {
  echo "Running tests..."
  npm test
}

do_publish() {
  configure_jfrog
  jf npm config --global --repo-resolve "$JF_NPM_VIRTUAL" --repo-deploy "$JF_NPM_LOCAL" --server-id-resolve local --server-id-deploy local
  echo "Adding VCS info..."
  jf build-info add-git --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER" --dotenv-path .
  echo "Publishing package..."
  jf npm publish --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
  echo "Creating build-info..."
  jf build-info create --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
  echo "Publishing build-info..."
  jf build-info publish --build-name "$BUILD_NAME" --build-number "$BUILD_NUMBER"
  echo "Done. Build $BUILD_NAME/$BUILD_NUMBER published."
}

do_scan() {
  if [ -z "$JF_XRAY_SCAN_ENABLED" ] || [ "$JF_XRAY_SCAN_ENABLED" != "true" ]; then
    echo "Xray scan skipped (set JF_XRAY_SCAN_ENABLED=true to enable)"
    return
  fi
  echo "Running Xray scan..."
  jf build scan "$BUILD_NAME" "$BUILD_NUMBER"
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
