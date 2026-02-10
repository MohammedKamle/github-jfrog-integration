# GitHub ⇄ JFrog Artifactory Integration Demo

A minimal Node.js project demonstrating end-to-end integration between **GitHub Actions** and **JFrog Artifactory** using the JFrog CLI. This repo serves as a learning/sample project for CI workflows that publish and consume artifacts from Artifactory.

## What This Repo Demonstrates

| Feature | Description |
|---------|-------------|
| **npm resolution via Artifactory** | Dependencies are resolved through an Artifactory virtual repo (proxy to npm registry) |
| **Build-info collection** | JFrog CLI collects build metadata (deps, VCS info) during install |
| **Build-info publish** | Build info is published to Artifactory for traceability |
| **Package publish** | npm package is published to a local Artifactory repo |
| **GitHub run mapping** | Build name/number map to `github.repository.name` and `github.run_number` |
| **VCS info** | Git commit, branch, and URL are captured in build-info |
| **Xray scan** | Optional build scan (enable via repo variable) |
| **Build promotion** | Optional script to promote builds to a target repo |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Actions                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  CI (ci.yml)                    │  Publish (publish.yml)                     │
│  • push / PR → main             │  • release published / manual              │
│  • checkout                    │  • checkout                                │
│  • setup Node + JFrog CLI      │  • setup Node + JFrog CLI                  │
│  • jf npm install (virtual)    │  • jf npm install                          │
│  • npm test                    │  • npm test                                │
│  • jf rt build-add-git         │  • jf npm publish → local repo             │
│  • jf rt build-publish         │  • jf rt build-publish                      │
│  • [optional] jf build-scan    │  • [optional] jf build-scan                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JFrog Artifactory                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  npm-virtual (resolve)          │  npm-local (deploy)       │  build-info   │
│  • Proxies npmjs.org            │  • Stores published      │  • Build meta │
│  • Caches dependencies         │    packages               │  • VCS info   │
│                                 │                          │  • Dependencies│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Customization

- **Package name**: Edit `package.json` to change `@myorg/github-jfrog-demo` to your org/package name. For scoped packages, add `--scope=@yourorg` to the `jf npm config` step in workflows.
- **Node version**: Update `NODE_VERSION` in workflows and `.nvmrc` if needed.

## Prerequisites

- **JFrog Artifactory** (SaaS or self-hosted)
- **GitHub repository** with Actions enabled
- **Node.js 18+**

## Step-by-Step Setup

### 1. Create JFrog Repositories

In Artifactory, create:

| Repo | Type | Purpose |
|------|------|---------|
| `npm-virtual` | Virtual | Resolve npm packages (includes remote to `https://registry.npmjs.org`) |
| `npm-local` | Local | Store published packages |

**CLI (if you have admin access):**

```bash
# Create local repo
jf repo create npm-local --package-type npm --rclass local

# Create remote (npmjs)
jf repo create npm-remote --package-type npm --rclass remote --url https://registry.npmjs.org

# Create virtual repo
jf repo create npm-virtual --package-type npm --rclass virtual --repositories npm-remote npm-local
```

Or use the Artifactory UI: **Administration → Repositories → Local/Remote/Virtual**.

### 2. Create Credentials

**Option A: Access token (preferred)**

1. In Artifactory: **My Profile → Edit Profile → Generate Token**
2. Create a token with appropriate scopes (read, write, build-info)

**Option B: Username + API key**

1. In Artifactory: **My Profile → Edit Profile → Generate API Key**
2. Use your username and this API key

### 3. Add GitHub Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions**

| Secret | Description | Required |
|--------|-------------|----------|
| `JF_URL` | Artifactory URL (e.g. `https://yourorg.jfrog.io`) | Yes |
| `JF_ACCESS_TOKEN` | Access token | Yes (if not using user+key) |
| `JF_USER` | Username | Yes (if not using token) |
| `JF_API_KEY` | API key | Yes (if not using token) |

**Variables (optional):**

| Variable | Default | Description |
|----------|---------|-------------|
| `JF_NPM_VIRTUAL` | `npm-virtual` | Virtual repo for resolve |
| `JF_NPM_LOCAL` | `npm-local` | Local repo for deploy |
| `JF_XRAY_SCAN_ENABLED` | (unset) | Set to `true` to enable Xray scan |

### 4. Run CI Workflow

1. Push to `main` or open a PR targeting `main`
2. The **CI** workflow runs: install → test → build-info publish
3. In Artifactory: **Builds** → find build named `github-jfrog-integration` (or your repo name) with run number
4. Verify build-info shows dependencies and VCS info

### 5. Run Publish Workflow

**Option A: Manual**

1. **Actions → Publish → Run workflow**
2. Run the workflow

**Option B: Release**

1. Create a release with tag (e.g. `v1.0.0`)
2. Publish the release
3. `publish.yml` runs and publishes the package with that version

**Verify:**

- In Artifactory: **Artifacts** → `npm-local` → `@myorg/github-jfrog-demo` (or your package name)
- In **Builds**: build info includes the published artifact

### 6. Optional: Xray Scan

1. Add variable `JF_XRAY_SCAN_ENABLED` = `true`
2. Ensure Xray is configured and policies exist
3. Workflows will run `jf build-scan` after build-info publish

## Local Developer Flow

### Scripts

```bash
# Install dependencies (plain npm, no JFrog)
npm install

# Run tests
npm test

# Start server
npm start

# Lint (basic check)
npm run lint
```

### Local JFrog Flow

1. Copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your JFrog URL and credentials

3. Install JFrog CLI: <https://jfrog.com/getcli/>

4. Run the helper script:

   ```bash
   chmod +x scripts/jfrog-local.sh
   ./scripts/jfrog-local.sh install   # Install via Artifactory
   ./scripts/jfrog-local.sh test      # Run tests
   ./scripts/jfrog-local.sh publish   # Publish package (full flow)
   ./scripts/jfrog-local.sh all       # install + test + publish + scan
   ```

### Optional: Build Promotion

```bash
BUILD_NAME=github-jfrog-demo BUILD_NUMBER=42 TARGET_REPO=release-local ./scripts/jfrog-promote.sh
```

## Project Structure

```
.
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI: install, test, build-info
│       └── publish.yml     # Publish: build, publish package, build-info
├── scripts/
│   ├── jfrog-local.sh      # Local JFrog install/build/publish
│   ├── jfrog-verify.sh     # Verify setup, clear cache, force resolve via Artifactory
│   └── jfrog-promote.sh    # Optional build promotion
├── src/
│   ├── index.js            # Express app
│   └── index.test.js       # Unit tests
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

### Auth failures (401 / 403)

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 Unauthorized | Invalid token or wrong user/password | Regenerate token or API key; ensure no trailing spaces in secrets |
| 403 Forbidden | Missing permissions | Token needs read/write/build scope; user needs deploy permissions on repos |
| Connection refused | Wrong JF_URL | Use `https://yourorg.jfrog.io` (no trailing slash); check SaaS vs self-hosted URL |

### npm scope issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 for @myorg packages | Scope not mapped to a repo | In Artifactory: Virtual repo → Package Sources → add local repo for scope |
| Publish fails for scoped package | Deploy repo doesn't accept scope | Add `--scope=@myorg` to `jf npm config` in workflows; ensure npm-local is in scope mapping |

### Build-info not appearing

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build not in Artifactory | Build-info publish failed | Check workflow logs; ensure `jf rt build-publish` runs after `jf rt build-add-git` |
| Empty build | No install with build-name/number | `jf npm install` must include `--build-name` and `--build-number` |
| Missing VCS info | add-git not run | Run `jf rt build-add-git <build-name> <build-number> .` with full git history (fetch-depth: 0) |

### Remote/virtual repo showing empty

| Symptom | Cause | Fix |
|---------|-------|-----|
| demo-npm-remote empty | Remote repos cache on first use; cache may be in `*-cache` repo | Check **demo-npm-remote-cache** (not the remote itself) for cached packages |
| Still empty after install | Virtual repo missing or misconfigured | Create virtual repo `demo-npm` that includes `demo-npm-remote` + `demo-npm-local` |
| npm using local cache | Packages never fetched through Artifactory | Run `./scripts/jfrog-verify.sh` to clear cache and force resolve via Artifactory |

### Other

| Symptom | Cause | Fix |
|---------|-------|-----|
| Caching breaks JFrog | npm cache serves stale/wrong packages | `setup-node` cache is usually fine; if issues, disable cache or clear |
| Xray scan fails | Xray not configured / no license | Set `JF_XRAY_SCAN_ENABLED=false` or remove variable to skip |
| Package version mismatch on release | Tag format | Use `v1.0.0` format; script strips `v` for npm version |

## License

MIT

<!-- Frogbot demo branch created at 2026-02-10T14:48:53Z -->
