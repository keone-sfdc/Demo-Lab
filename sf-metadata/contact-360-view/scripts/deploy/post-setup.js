#!/usr/bin/env node
/**
 * Post-deployment script for Contact 360 View.
 * Assigns SDO_Contact_Default flexipage as the org-wide default for Contact record pages.
 * Receives ORG_ALIAS and PACKAGE_PATH via env.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ORG_ALIAS = process.env.ORG_ALIAS;
const PACKAGE_PATH = process.env.PACKAGE_PATH;
const FLEXIPAGE_NAME = 'SDO_Contact_Default';

const CONTACT_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <actionOverrides>
        <actionName>View</actionName>
        <content>${FLEXIPAGE_NAME}</content>
        <formFactor>Large</formFactor>
        <type>Flexipage</type>
    </actionOverrides>
    <actionOverrides>
        <actionName>View</actionName>
        <content>${FLEXIPAGE_NAME}</content>
        <formFactor>Small</formFactor>
        <type>Flexipage</type>
    </actionOverrides>
</CustomObject>
`;

console.log('Post-setup: Assigning SDO_Contact_Default as org-wide default for Contact...');
console.log('ORG_ALIAS:', ORG_ALIAS);

if (!ORG_ALIAS) {
  console.error('Error: ORG_ALIAS environment variable is required');
  process.exit(1);
}

if (PACKAGE_PATH) {
  process.chdir(PACKAGE_PATH);
}
let tempDir;

try {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-owd-'));
  const objectsDir = path.join(tempDir, 'objects', 'Contact');
  fs.mkdirSync(objectsDir, { recursive: true });
  fs.writeFileSync(
    path.join(objectsDir, 'Contact.object-meta.xml'),
    CONTACT_METADATA,
    'utf-8'
  );

  const result = spawnSync('sf', [
    'project',
    'deploy',
    'start',
    '--source-dir',
    tempDir,
    '--target-org',
    ORG_ALIAS,
    '--wait',
    '10',
  ], { encoding: 'utf-8', stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(result.error || `Deploy exited with code ${result.status}`);
  }

  console.log('✓ SDO_Contact_Default set as org-wide default for Contact record pages.');
} catch (err) {
  console.error('Post-setup failed:', err.message);
  process.exit(1);
} finally {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

process.exit(0);
