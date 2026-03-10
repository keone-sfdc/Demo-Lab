#!/usr/bin/env node
/**
 * Pre-deployment script for Contact 360 View.
 * Installs Modern Contact Card package if not already installed.
 * Latest package ID: http://sfdc.co/ModernContactCardLWC
 * Receives ORG_ALIAS and PACKAGE_PATH via env.
 */
const { execSync } = require('child_process');

const ORG_ALIAS = process.env.ORG_ALIAS;
const PACKAGE_PATH = process.env.PACKAGE_PATH;
const PACKAGE_ID = '04tKj000000fSwv';
const PACKAGE_NAME = 'Modern Contact Card';

const ALREADY_INSTALLED_PATTERNS = [
  'already installed',
  'is already installed',
  'Unable to install',
  'You will need to uninstall it before installing',
];

function stripAnsi(str) {
  return (str || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function isAlreadyInstalledError(err) {
  const parts = [
    err?.stderr?.toString?.() ?? '',
    err?.stdout?.toString?.() ?? '',
    err?.message ?? '',
    Array.isArray(err?.output) ? err.output.join('') : '',
  ];
  const text = stripAnsi(parts.join(' ')).toLowerCase();
  return ALREADY_INSTALLED_PATTERNS.some((p) => text.includes(p.toLowerCase()));
}

function packageFoundInList(listOutput) {
  const raw = stripAnsi(listOutput || '');
  if (raw.includes(PACKAGE_NAME)) return true;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return false;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const result = parsed.result ?? parsed;
    const packages = Array.isArray(result) ? result : result?.installedPackages ?? result?.packages ?? [];
    return packages.some(
      (p) =>
        p.SubscriberPackageVersionId === PACKAGE_ID ||
        p.SubscriberPackageName === PACKAGE_NAME ||
        p.Name === PACKAGE_NAME ||
        (typeof p === 'object' && JSON.stringify(p).includes(PACKAGE_NAME))
    );
  } catch {
    return false;
  }
}

console.log('Pre-setup: Checking Modern Contact Card package...');
console.log('ORG_ALIAS:', ORG_ALIAS);

if (!ORG_ALIAS) {
  console.error('Error: ORG_ALIAS environment variable is required');
  process.exit(1);
}

if (PACKAGE_PATH) {
  process.chdir(PACKAGE_PATH);
}

try {
  // 1. Query installed packages first (avoids long install wait if already present)
  try {
    const listOutput = execSync(
      `sf package installed list --target-org ${ORG_ALIAS} --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 2 * 1024 * 1024 }
    );
    if (packageFoundInList(listOutput)) {
      console.log(`✓ Package "${PACKAGE_NAME}" is already installed. Skipping.`);
      process.exit(0);
    }
  } catch {
    // Query failed; proceed to install attempt
  }

  // 2. Try to install
  console.log(`Installing package ${PACKAGE_ID}...`);
  try {
    execSync(
      `sf package install --package ${PACKAGE_ID} --target-org ${ORG_ALIAS} --wait 5 --publish-wait 5 --no-prompt`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 }
    );
    console.log('✓ Package installed successfully.');
  } catch (installError) {
    if (isAlreadyInstalledError(installError)) {
      console.log('✓ Package is already installed in the org. Proceeding with deployment.');
      process.exit(0);
    }
    const errText = [
      installError.stderr?.toString?.() ?? '',
      installError.stdout?.toString?.() ?? '',
      installError.message ?? '',
    ].join(' ');
    console.error('Package install failed:', errText);
    process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

process.exit(0);
