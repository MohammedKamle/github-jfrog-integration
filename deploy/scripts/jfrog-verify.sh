#!/usr/bin/env bash
#
# Verify JFrog npm setup and force resolution through Artifactory.
# Run this if packages don't appear in Artifactory.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

[ -f .env ] && set -a && source .env && set +a
: "${JF_NPM_VIRTUAL:?Set JF_NPM_VIRTUAL in .env}"
: "${JF_URL:?Set JF_URL in .env}"

echo "=== JFrog npm setup verification ==="
echo "Resolver repo: $JF_NPM_VIRTUAL"
echo "Artifactory URL: $JF_URL"
echo ""

# 1. Ensure project config exists
mkdir -p .jfrog/projects
cat > .jfrog/projects/npm.yaml << EOF
version: 1
type: npm
resolver:
    repo: ${JF_NPM_VIRTUAL}
    serverId: local
EOF
echo "✓ Project config: .jfrog/projects/npm.yaml"
echo ""

# 2. Configure JFrog CLI
echo "Configuring JFrog CLI..."
if [ -n "$JF_ACCESS_TOKEN" ]; then
  jf c add local --url "$JF_URL" --access-token "$JF_ACCESS_TOKEN" --interactive=false 2>/dev/null || true
else
  jf c add local --url "$JF_URL" --user "$JF_USER" --password "$JF_API_KEY" --interactive=false 2>/dev/null || true
fi
jf c use local
echo "✓ JFrog CLI configured"
echo ""

# 3. Clear npm cache and node_modules to force fresh resolve through Artifactory
echo "Clearing npm cache and node_modules (forces fresh fetch from Artifactory)..."
npm cache clean --force 2>/dev/null || true
rm -rf node_modules
echo "✓ Cache cleared"
echo ""

# 4. Run install
echo "Running jf npm install (packages will be fetched via Artifactory)..."
jf npm install

echo ""
echo "=== Done. Check Artifactory: ==="
echo "• Virtual repo: $JF_NPM_VIRTUAL (or $JF_NPM_VIRTUAL-cache)"
echo "• Remote cache: demo-npm-remote-cache"
echo ""
echo "If still empty, ensure virtual repo '$JF_NPM_VIRTUAL' exists and includes demo-npm-remote."
