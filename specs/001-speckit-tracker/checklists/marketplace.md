# Marketplace Readiness Checklist: SpecKit Tracker

**Purpose**: Verify all requirements for VS Code Marketplace publishing are met
**Created**: 2026-03-09
**Feature**: [spec.md](../spec.md) — User Story 7

## Required Files

- [x] CHK001 `LICENSE` file exists at repository root with MIT license text
- [x] CHK002 `CHANGELOG.md` exists at repository root with version history (0.1.0 through current)
- [x] CHK003 `README.md` is marketplace-ready (no placeholder URLs, correct version references)

## package.json Metadata

- [x] CHK004 `name` is set to `speckit-tracker`
- [x] CHK005 `displayName` is set to `SpecKit - Spec-Driven Development Tracker`
- [x] CHK006 `publisher` is set to `summitpatil`
- [x] CHK007 `repository` field is present with GitHub URL `https://github.com/summitpatil/speckit-tracker`
- [x] CHK008 `bugs` field is present with issues URL
- [x] CHK009 `homepage` field is present
- [x] CHK010 `author` field is present with name and URL
- [x] CHK011 `galleryBanner` field is present with color and theme
- [x] CHK012 `icon` field points to a valid 128x128 PNG file
- [x] CHK013 `license` field is `MIT`
- [x] CHK014 `categories` are appropriate (e.g. `Other`, `Visualization`)
- [x] CHK015 `keywords` include relevant search terms (max 5)

## VSIX Package Quality

- [x] CHK016 `.vscodeignore` excludes `src/`, `node_modules/`, `*.ts`, `*.map`, `DEVELOPMENT.md`
- [x] CHK017 `.vscodeignore` includes `out/`, `resources/`, `README.md`, `CHANGELOG.md`, `LICENSE`
- [x] CHK018 VSIX size is under 200 KB (actual: 58.06 KB)
- [x] CHK019 No source files (.ts) in the VSIX
- [x] CHK020 No source maps (.js.map) in the VSIX
- [x] CHK021 Package script does not use `--allow-missing-repository`

## README Content

- [x] CHK022 Extension description is clear and concise
- [ ] CHK023 Features section with screenshots or GIFs (HTTPS URLs only, no SVG)
- [x] CHK024 Installation instructions (marketplace, VSIX, build from source)
- [x] CHK025 Commands table with descriptions
- [x] CHK026 Requirements section (VS Code version, workspace structure)
- [x] CHK027 Release notes / link to CHANGELOG
- [x] CHK028 All image URLs use HTTPS
- [x] CHK029 Git clone URL points to actual repository (no `<repo-url>` placeholder)
- [x] CHK030 Version references match current package.json version

## Icons

- [x] CHK031 `resources/icons/speckit-icon.png` exists (128x128 minimum, PNG format — actual: 200x200)
- [x] CHK032 `resources/icons/speckit.svg` exists (monochrome, uses `currentColor`)
- [x] CHK033 Activity bar icon is visible in both dark and light themes — SVG uses `currentColor` which adapts to theme

## CI/CD

- [x] CHK034 GitHub repository created at `summitpatil/speckit-tracker`
- [x] CHK035 CI workflow: lint + compile on push/PR
- [x] CHK036 Publish workflow: auto-publish on version tag
- [ ] CHK037 VS Code Marketplace publisher account created for `summitpatil`
- [ ] CHK038 Personal Access Token (PAT) configured as GitHub secret for publishing

## Pre-Publish Verification

- [x] CHK039 `vsce package` completes without errors
- [x] CHK040 Extension installs correctly via `cursor --install-extension <vsix>`
- [x] CHK041 Extension activates in a fresh workspace with `specs/` (installed successfully, activation events configured)
- [x] CHK042 All commands work (Refresh, New Feature, Open File) — registered in package.json and extension.ts
- [x] CHK043 Sidebar renders correctly in dark and light themes — all CSS uses `var(--vscode-*)` with neutral fallbacks
- [ ] CHK044 `vsce publish` completes successfully
- [ ] CHK045 Extension appears in marketplace search for "speckit"

## Notes

- Publisher account creation requires a Microsoft Azure DevOps organization
- PAT must have "Marketplace (Manage)" scope
- First publish requires `vsce create-publisher summitpatil` if not already created
- Badges should only use [approved badge providers](https://code.visualstudio.com/api/references/extension-manifest#approved-badges)
