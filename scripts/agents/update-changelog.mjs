#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
};

const releaseVersion = process.env.RELEASE_VERSION || 'Unreleased';
let previousTag = run('git describe --tags --abbrev=0 HEAD^');
if (!previousTag) {
  previousTag = run('git describe --tags --abbrev=0');
}
const range = previousTag ? `${previousTag}..HEAD` : '';
const rawLog = run(`git log ${range || ''} --pretty=format:%s|%h`);
const lines = rawLog
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const sectionMap = {
  Added: [],
  Fixed: [],
  Documentation: [],
  Chores: [],
};

for (const line of lines) {
  const [message, hash] = line.split('|');
  const entry = `- ${message} (${hash})`;
  if (message.startsWith('feat') || message.toLowerCase().includes('add')) {
    sectionMap.Added.push(entry);
  } else if (message.startsWith('fix') || message.toLowerCase().includes('bug')) {
    sectionMap.Fixed.push(entry);
  } else if (message.startsWith('docs')) {
    sectionMap.Documentation.push(entry);
  } else {
    sectionMap.Chores.push(entry);
  }
}

if (sectionMap.Added.length + sectionMap.Fixed.length + sectionMap.Documentation.length + sectionMap.Chores.length === 0) {
  sectionMap.Chores.push('- No user-facing changes detected');
}

const today = new Date().toISOString().split('T')[0];
let entry = `## [${releaseVersion}] - ${today}\n`;
for (const [section, items] of Object.entries(sectionMap)) {
  if (items.length === 0) continue;
  entry += `\n### ${section}\n`;
  entry += `${items.join('\n')}\n`;
}
entry += '\n';

const changelogPath = new URL('../../CHANGELOG.md', import.meta.url).pathname;
const changelog = readFileSync(changelogPath, 'utf8');
const marker = '<!-- AGENT:INSERT -->';
if (!changelog.includes(marker)) {
  console.error('Changelog marker not found.');
  process.exit(1);
}

const updated = changelog.replace(marker, `${entry}${marker}`);
writeFileSync(changelogPath, updated, 'utf8');
writeFileSync('changelog-report.md', entry, 'utf8');
console.log('Changelog updated with range:', range || 'HEAD');
