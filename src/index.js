#!/usr/bin/env node
/**
 * Minimal Express server for GitHub ⇄ JFrog integration demo.
 * Serves a health check and a simple info endpoint.
develop bvanch 
*/

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    name: 'github-jfrog-demo',
    version: process.env.npm_package_version || '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Only start server when run directly (not when required for tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  module.exports = { app, server };
} else {
  module.exports = { app };
}
