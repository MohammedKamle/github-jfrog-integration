# Frogbot Demo Guide

This guide walks through how to demo **Frogbot** (JFrog's security scanner for pull requests) to a customer. Frogbot automatically scans PRs for vulnerabilities and comments with remediation advice, CVE details, and next steps.

## Prerequisites

- Frogbot workflow is configured (`.github/workflows/frogbot-scan-pr.yml`)
- GitHub Environment `frogbot` exists with `JF_URL` and `JF_ACCESS_TOKEN` secrets
- The branch `feature/payment-integration` exists in the repo

## Demo Steps

### 1. Create a new branch from `feature/payment-integration`

```bash
git fetch origin
git checkout -b your-demo-branch origin/feature/payment-integration
```

Replace `your-demo-branch` with a descriptive name (e.g., `demo/frogbot-scan` or `customer-demo/security-scan`).

### 2. (Optional) Make a small change to trigger a scan

You can make a trivial change (e.g., add a comment, bump a dependency) so the PR has something to scan. Or push as-is—Frogbot will still scan the dependency tree.

### 3. Push the branch

```bash
git push -u origin your-demo-branch
```

### 4. Create a pull request

1. Go to the repo on GitHub
2. You should see a prompt to **Compare & pull request** for the new branch
3. Create a PR targeting `main`
4. Open the PR

### 5. Show Frogbot results

- Frogbot runs automatically when the PR is opened or updated
- Within a few minutes, Frogbot will post a comment on the PR with:
  - Security vulnerabilities found (if any)
  - CVE details
  - Remediation advice
  - Recommended next steps

## What to Point Out

| Point | Description |
|-------|-------------|
| **Automatic** | No manual trigger—Frogbot runs on every PR targeting `main` |
| **Shift-left** | Security feedback appears before merge, not after deploy |
| **Actionable** | Comments include remediation steps and upgrade guidance |
| **JFrog integration** | Uses Xray for scanning; results tied to your JFrog platform |

## Troubleshooting

- **Frogbot doesn't comment**: Check the `frogbot` environment has `JF_URL` and `JF_ACCESS_TOKEN` configured; verify the workflow run succeeded in the Actions tab
- **PR targets wrong branch**: Frogbot is configured for PRs targeting `main`; ensure the PR base is `main`
