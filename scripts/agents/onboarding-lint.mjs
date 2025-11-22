#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const readmePath = new URL('../../README.md', import.meta.url).pathname;
const contents = readFileSync(readmePath, 'utf8');

const findings = [];
const requiredSections = [
  { heading: 'Prerequisites', message: 'Document tooling prerequisites (Node, Docker, etc.)' },
  { heading: 'Development', message: 'Explain how to start the dev server' },
  { heading: 'Building for Production', message: 'Explain production build command' },
  { heading: 'Docker Deployment', message: 'Provide container instructions' },
  { heading: 'Usage', message: 'Describe how to interact with the UI' }
];

for (const section of requiredSections) {
  const regex = new RegExp(`^##\\s+${section.heading}`, 'm');
  if (!regex.test(contents)) {
    findings.push(`- Missing section: **${section.heading}** (${section.message})`);
  }
}

const requiredSnippets = [
  { snippet: 'npm install', description: 'Install dependencies command' },
  { snippet: 'npm run dev', description: 'Development server command' },
  { snippet: 'npm run build', description: 'Production build command' },
  { snippet: 'npm run preview', description: 'Preview command' },
  { snippet: 'docker build', description: 'Docker build instructions' },
  { snippet: 'docker run', description: 'Docker run instructions' }
];

for (const item of requiredSnippets) {
  if (!contents.includes(item.snippet)) {
    findings.push(`- Missing snippet: **${item.snippet}** (${item.description})`);
  }
}

const reportLines = ['## Onboarding Lint Report'];

if (findings.length === 0) {
  reportLines.push('\n- ✅ README contains the expected onboarding content.');
  writeFileSync('onboarding-report.md', reportLines.join('\n'), 'utf8');
  console.log('Onboarding lint passed.');
  process.exit(0);
} else {
  reportLines.push('\nThe following gaps were detected in `README.md`:');
  reportLines.push(...findings);
  writeFileSync('onboarding-report.md', reportLines.join('\n'), 'utf8');
  console.error('Onboarding lint found issues. See onboarding-report.md');
  process.exit(1);
}
