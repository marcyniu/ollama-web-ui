# Version Management Policy for Ollama Web UI

## Overview

This document defines the version management policy for Ollama Web UI. All coding agents, automated workflows, and contributors must follow these guidelines when making code changes.

## Semantic Versioning

Ollama Web UI adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

Version format: **MAJOR.MINOR.PATCH**

- **MAJOR**: Incompatible API changes or significant architectural changes
- **MINOR**: New features added in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

### Version Increment Rules

| Change Type | Version Impact | Examples |
|-------------|----------------|----------|
| **Breaking changes** | MAJOR | API endpoint changes, removed features, major UI overhaul |
| **New features** | MINOR | Image upload support, new settings, additional API integrations |
| **Bug fixes** | PATCH | UI fixes, error handling improvements, accessibility fixes |
| **Documentation only** | No change | README updates, comment improvements |
| **Chores/CI** | No change | Dependency updates, workflow changes, build config |

## Agent Responsibilities

### When to Update Version

**Coding agents MUST update the version when:**

1. **Merging Pull Requests** that include:
   - `feat:` commits → Increment MINOR version
   - `fix:` commits → Increment PATCH version
   - `BREAKING CHANGE:` footer or `!` after type → Increment MAJOR version

2. **Multiple Change Types** in a single PR:
   - Use the highest priority change (MAJOR > MINOR > PATCH)
   - Example: PR with both `feat` and `fix` → Increment MINOR

3. **Accumulating Unreleased Changes**:
   - If CHANGELOG.md has multiple unreleased entries, recommend version bump before next release

### How to Update Version

#### Step 1: Update package.json

```bash
# For PATCH (bug fixes)
npm version patch

# For MINOR (new features)
npm version minor

# For MAJOR (breaking changes)
npm version major
```

This command automatically:
- Updates version in `package.json`
- Creates a git commit with message "X.Y.Z"
- Creates a git tag "vX.Y.Z"

#### Step 2: Update CHANGELOG.md

Replace the `[Unreleased]` heading with the new version and date:

```markdown
## [X.Y.Z] - YYYY-MM-DD
```

Add a new `[Unreleased]` section at the top for future changes.

#### Step 3: Commit and Tag

If using `npm version`, the commit and tag are created automatically.

If updating manually:
```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

### When NOT to Update Version

**Skip version updates for:**

- `docs:` - Documentation-only changes
- `chore:` - Build scripts, dependencies, CI/CD
- `refactor:` - Code restructuring without functional changes
- `test:` - Adding or updating tests only
- `ci:` - Continuous integration changes

## Automated Workflows

### Release Workflow (`.github/workflows/release-notes.yml`)

**Triggers:**
- Manual: `workflow_dispatch` with `release_version` input
- Automatic: Git tags matching `v*` pattern

**Process:**
1. Runs `scripts/agents/update-changelog.mjs` to generate changelog entry
2. Creates PR for changelog update (if manual trigger)
3. Publishes GitHub release (if tag trigger)

### Version Verification

Before creating a release:
1. Ensure `package.json` version matches git tag
2. Verify CHANGELOG.md has been updated with release notes
3. Confirm all related PRs are merged

## Developer Workflow

### For Feature Development

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make code changes
3. Update tests and documentation
4. **Do NOT update version** in the feature branch
5. Create PR with conventional commit title (e.g., `feat: add image upload`)
6. Version will be bumped when merging to `main` (manually or by maintainer)

### For Hotfixes

1. Create hotfix branch: `git checkout -b hotfix/critical-bug`
2. Make minimal fix
3. Bump PATCH version: `npm version patch`
4. Update CHANGELOG.md
5. Create PR with `fix:` prefix
6. After merge, push tag: `git push origin vX.Y.Z`

## CHANGELOG.md Format

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
<!-- AGENT:INSERT -->

## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes
```

## Examples

### Example 1: Adding Image Upload Feature

**Commit:** `feat: add image upload for vision models`

**Actions:**
1. Run `npm version minor` (0.0.0 → 0.1.0)
2. Update CHANGELOG.md:
   ```markdown
   ## [0.1.0] - 2025-12-14
   
   ### Added
   - Image upload support for vision-capable models (llava, bakllava)
   - Automatic vision model detection
   - Image preview in chat interface
   ```
3. Push tag: `git push origin v0.1.0`

### Example 2: Fixing Dark Mode Bug

**Commit:** `fix: resolve dark mode toggle persistence`

**Actions:**
1. Run `npm version patch` (0.1.0 → 0.1.1)
2. Update CHANGELOG.md:
   ```markdown
   ## [0.1.1] - 2025-12-15
   
   ### Fixed
   - Dark mode preference now persists correctly across sessions
   ```
3. Push tag: `git push origin v0.1.1`

### Example 3: Documentation Update

**Commit:** `docs: update Docker deployment instructions`

**Actions:**
- No version change required
- Update README.md only
- Merge PR without version bump

## Version Display in Application

The current version is displayed in:
1. **Header**: Version badge next to "Ollama Web UI" title
2. **Settings Modal**: Footer showing "Version X.Y.Z"

The version is read from `package.json` at build time and embedded in the application bundle.

## Pre-release Versions

For alpha/beta releases, use pre-release identifiers:

```bash
npm version prerelease --preid=alpha  # 0.1.0-alpha.0
npm version prerelease --preid=beta   # 0.1.0-beta.0
npm version prerelease                # 0.1.0-alpha.1
```

## Questions & Clarifications

**Q: What if I'm unsure whether a change is MINOR or PATCH?**  
A: When in doubt, use PATCH. Major new features are obvious (new screens, major capabilities). Small enhancements can be PATCH.

**Q: Can I skip version updates during development?**  
A: Yes. Version updates happen when merging to `main`, not in feature branches.

**Q: What if multiple PRs merge between releases?**  
A: Accumulate changes in CHANGELOG.md under `[Unreleased]`. When ready to release, run `npm version` to finalize.

---

**Policy Effective Date**: December 14, 2025  
**Last Updated**: December 14, 2025  
**Maintained by**: @marcyniu
