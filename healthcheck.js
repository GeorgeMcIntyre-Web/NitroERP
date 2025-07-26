#!/usr/bin/env node

/**
 * Health check script for NitroERP services
 * Used by Docker containers to monitor service health
 */

const http = require('http');

// Get service port from environment or use default
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

// Health check endpoint
const healthCheckUrl = `http://${host}:${port}/health`;

// Make health check request
const req = http.get(healthCheckUrl, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error(`Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

// Handle request errors
req.on('error', (err) => {
  console.error('Health check error:', err.message);
  process.exit(1);
});

// Set timeout
req.setTimeout(5000, () => {
  console.error('Health check timeout');
  req.destroy();
  process.exit(1);
}); 