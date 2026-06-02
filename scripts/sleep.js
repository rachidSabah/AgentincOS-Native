#!/usr/bin/env node

/**
 * Agentic OS — Cross-platform sleep utility
 * Replacement for `sleep 2` which doesn't exist on Windows
 */

const ms = parseInt(process.argv[2] || '2000', 10);
setTimeout(() => process.exit(0), ms);
