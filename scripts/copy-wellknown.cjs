#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const wellKnownPath = path.join(__dirname, '../.well-known');
const destPath = path.join(__dirname, '../apps/remix/public/.well-known');

// fs.cpSync(..., { recursive: true }) throws EIO/Access denied for directories
// on Windows with Node 22 (https://github.com/nodejs/node/issues/55468), so
// directories are copied manually file-by-file instead.
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destEntryPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destEntryPath);
    } else {
      fs.copyFileSync(srcPath, destEntryPath);
    }
  }
}

console.log('Copying .well-known/ contents to apps');
copyDirSync(wellKnownPath, destPath);
