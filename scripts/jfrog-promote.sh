#!/usr/bin/env bash
#
# Optional: Promote a build to a target repository.
# Requires JFrog CLI and credentials.
#
# Usage:
#   BUILD_NAME=mybuild BUILD_NUMBER=123 TARGET_REPO=release-local ./scripts/jfrog-promote.sh

set -e

: "${BUILD_NAME:?BUILD_NAME required}"
: "${BUILD_NUMBER:?BUILD_NUMBER required}"
: "${TARGET_REPO:?TARGET_REPO required (e.g. release-local)}"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${JF_URL:?JF_URL required}"

if [ -n "$JF_ACCESS_TOKEN" ]; then
  jf c add promote --url "$JF_URL" --access-token "$JF_ACCESS_TOKEN" --interactive=false 2>/dev/null || true
else
  jf c add promote --url "$JF_URL" --user "$JF_USER" --password "$JF_API_KEY" --interactive=false 2>/dev/null || true
fi
jf c use promote

echo "Promoting build $BUILD_NAME/$BUILD_NUMBER to $TARGET_REPO..."
jf build promote "$BUILD_NAME" "$BUILD_NUMBER" "$TARGET_REPO"
