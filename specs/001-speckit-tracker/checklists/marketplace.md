# Marketplace Readiness Checklist: SpecKit Tracker

**Purpose**: Verify all requirements for marketplace publishing are met
**Created**: 2026-03-09
**Feature**: [spec.md](../spec.md) — User Story 7

## Required Files

- CHK001 `LICENSE` file exists at repository root with MIT license text
- CHK002 `CHANGELOG.md` exists at repository root with version history (0.1.0 through current)
- CHK003 `README.md` is marketplace-ready (no placeholder URLs, correct version references)

## package.json Metadata

- CHK004 `name` is set to `speckit-tracker`
- CHK005 `displayName` is set to `SpecKit - Spec-Driven Development Tracker`
- CHK006 `publisher` is set to `summitpatil`
- CHK007 `repository` field is present with GitHub URL `https://github.com/summitpatil/speckit-tracker`
- CHK008 `bugs` field is present with issues URL
- CHK009 `homepage` field is present
- CHK010 `author` field is present with name and URL
- CHK011 `galleryBanner` field is present with color and theme
- CHK012 `icon` field points to a valid 128x128 PNG file
- CHK013 `license` field is `MIT`
- CHK014 `categories` are appropriate (e.g. `Other`, `Visualization`)
- CHK015 `keywords` include relevant search terms (max 5)

## VSIX Package Quality

- CHK016 `.vscodeignore` excludes `src/`, `node_modules/`, `*.ts`, `*.map`, `DEVELOPMENT.md`
- CHK017 `.vscodeignore` includes `out/`, `resources/`, `README.md`, `CHANGELOG.md`, `LICENSE`
- CHK018 VSIX size is under 200 KB (actual: 138 KB with screenshots)
- CHK019 No source files (.ts) in the VSIX
- CHK020 No source maps (.js.map) in the VSIX
- CHK021 Package script does not use `--allow-missing-repository`

## README Content

- CHK022 Extension description is clear and concise
- CHK023 Features section with screenshots (dashboard.png + workflow.png in resources/screenshots/)
- CHK024 Installation instructions (marketplace, VSIX, build from source)
- CHK025 Commands table with descriptions
- CHK026 Requirements section (VS Code version, workspace structure)
- CHK027 Release notes / link to CHANGELOG
- CHK028 All image URLs use HTTPS
- CHK029 Git clone URL points to actual repository (no `<repo-url>` placeholder)
- CHK030 Version references match current package.json version

## Icons

- CHK031 `resources/icons/speckit-icon.png` exists (128x128 minimum, PNG format — actual: 200x200)
- CHK032 `resources/icons/speckit.svg` exists (monochrome, uses `currentColor`)
- CHK033 Activity bar icon is visible in both dark and light themes — SVG uses `currentColor` which adapts to theme

## CI/CD

- CHK034 GitHub repository created at `summitpatil/speckit-tracker`
- CHK035 CI workflow: lint + compile on push/PR
- CHK036 Publish workflow: auto-publish on version tag (Open VSX + VS Code Marketplace)
- CHK037 Open VSX Registry account created for `summitpatil` at [https://open-vsx.org](https://open-vsx.org)
- CHK038 Access token configured as GitHub secret (`OVSX_PAT`) for CI/CD auto-publishing

## Pre-Publish Verification

- CHK039 `vsce package` completes without errors
- CHK040 Extension installs correctly via `cursor --install-extension <vsix>`
- CHK041 Extension activates in a fresh workspace with `specs/` (installed successfully, activation events configured)
- CHK042 All commands work (Refresh, New Feature, Open File) — registered in package.json and extension.ts
- CHK043 Sidebar renders correctly in dark and light themes — all CSS uses `var(--vscode-*)` with neutral fallbacks
- CHK044 `ovsx publish` completed successfully — v1.0.0 published 2026-03-09T14:03:28Z
- CHK045 Extension live at [https://open-vsx.org/extension/summitpatil/speckit-tracker](https://open-vsx.org/extension/summitpatil/speckit-tracker)

## Cursor Forum (Verification for Cursor Marketplace)

- CHK046 Namespace `summitpatil` verified on Open VSX (EclipseFdn accepted)
- CHK047 Extension verification topic created via [Cursor Forum → Extension Verification](https://forum.cursor.com/c/showcase/extension-verification/23): follow [cursor-forum-verification.md](../cursor-forum-verification.md) — fill all form fields (brief sentence, TLD=No, OpenVSX verified=Yes, OpenVSX URL, website=GitHub repo, **screenshot of README showing Open VSX link**), then Create Topic

## Notes

- Open VSX account created via GitHub OAuth at [https://open-vsx.org](https://open-vsx.org)
- Generate an access token at [https://open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens)
- Add as `OVSX_PAT` GitHub secret for CI/CD auto-publishing
- For VS Code Marketplace (optional): create publisher at [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) and add `VSCE_PAT` secret

