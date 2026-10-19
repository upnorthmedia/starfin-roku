# Branding

The channel is presented to viewers as **Poppins**. Its mark is an original
vector illustration of a lean husky head with both ear tips folded outward,
ice-blue eyes, and the classic husky mask, set on the app's dark navy palette.
Poppins is a fork of Starfin; the upstream project name stays in the license,
attribution, repository name, and internal identifiers.

## What carries the Poppins name

- `manifest` `title`, which Roku shows on the home screen and which System
  Information reads through `roAppInfo.GetTitle()`.
- Channel posters, splash screens, and the sign-in logo (below).
- Viewer-facing copy: the sign-in welcome text, the Reset Poppins button and its
  warnings in Settings > Advanced, the post-reset sign-in message, the screensaver
  description, and the account picker's remove-user description.

## What intentionally stays Starfin

Renaming these would discard saved data or break integrations, so they keep
their existing values:

- Registry section names (`STARFIN_ROKU`, `STARFIN_ACCOUNT_*`), which hold every
  saved server, account, token, and preference.
- The Jellyfin client name (`Starfin Roku`) sent in the authorization header and
  device profile.
- Component, field, node, function, and file names such as
  `resetStarfinButton`, plus package, script, and test names.
- The `User-Agent` sent to external metadata services, which credits the upstream
  project.

## Assets

Vector sources live in `assets/brand/`, outside `images/`, so they are not
packaged into the channel:

| Source | Contents |
| --- | --- |
| `poppins-mark.svg` | Husky mark on a transparent background |
| `poppins-wordmark.svg` | "Poppins" outlined from Montserrat SemiBold (`fonts/cinema/`, OFL) |
| `poppins-tagline.svg` | "A Jellyfin client for Roku" outlined from Inter Regular (`fonts/liquid-glass/`, OFL) |

The text is stored as outlines so rendering needs no system fonts.

`node scripts/generate-brand-assets.mjs` renders every PNG with `sharp`:

| Output | Size | Layout |
| --- | --- | --- |
| `images/channel-fhd.png` | 540x405 | Mark above wordmark on the navy background |
| `images/channel-hd.png` | 290x218 | FHD poster scaled down |
| `images/channel-sd.png` | 246x140 | Mark beside wordmark |
| `images/splash-fhd.png` | 1920x1080 | Mark, wordmark, and tagline |
| `images/splash-hd.png` | 1280x720 | FHD splash scaled down |
| `images/splash-sd.png` | 720x480 | Mark, wordmark, and tagline |
| `images/logo-login-screen.png` | 800x185 | Transparent mark-and-wordmark lockup, shown at 650x150 on sign-in |

Edit the SVG sources and rerun the script instead of editing the PNGs directly.
