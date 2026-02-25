


# Create deployable
npm ci --omit=dev
mkdir -p deploy
cp package.json src deploy/
cp -r node_modules deploy/
[ -d scripts ] && cp -r scripts deploy/
DEPLOYABLE_NAME="github-jfrog-demo-deployable-$(date +%Y%m%d%H%M%S)"
tar -czf "${DEPLOYABLE_NAME}.tgz" -C deploy .
rm -rf deploy

# Upload to demo-npm-local
jf rt upload "${DEPLOYABLE_NAME}.tgz" \
  "demo-npm-local/deployables/github-jfrog-demo/${DEPLOYABLE_NAME}.tgz"

echo "Published: ${DEPLOYABLE_NAME}.tgz to demo-npm-local"