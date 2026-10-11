# Carolina Day
A Carolina blue planner with Google Calendar, dated tasks, completion celebrations, morning check-ins, notes, links, and a focus timer.

## Run
Serve `dist/` with any static web server. No build step is required. For local Google authorization, register your exact local origin on the OAuth client first.

## Google Calendar
Click **Connect Google Calendar**, choose your account, and allow read-only calendar access. Use **Calendars** to select calendars and **Refresh** to reload. Google events appear in the daily agenda and month grid, with links to their Google Calendar originals. Recurring instances, all-day events, and overnight events are supported.

The app uses Google Identity Services and the Google Calendar REST API directly from the browser. It preserves the private Site's ChatGPT sign-in boundary. Google authorization grants calendar access separately; it does not replace Site sign-in or use the chat's connector credentials.

Google events and access tokens exist only in memory. They are never committed, sent to the Site server, placed in localStorage, or included in backups. On reload or token expiry, reconnect with Google. Disconnect clears the current browser session; provider-wide consent can be revoked through Google Account permissions. The OAuth identifier in `dist/config.js` is public, not a secret. No client secret is needed or stored.

Google Cloud project: `carolina-day`. Calendar API must be enabled. The OAuth web client must authorize `https://rudra-carolina-day.brawnyspoon8.chatgpt.site`. While the OAuth application is in Testing, the owner's Google account must be listed as a test user. Additional visitors need explicit test-user access or a separately approved production/verification setup.

## Local data
Local plans, tasks, notes, links, and check-ins use this browser's localStorage. Export/import backs up local data. Local tasks do not synchronize across devices or write to Google Calendar.

## Hosting and source
Private Site: https://rudra-carolina-day.brawnyspoon8.chatgpt.site
GitHub: https://github.com/Rudrashahhh/new-calendar
Serve `dist/` on another static host; register that origin in Google Cloud before connecting there.

## Checks
Run `node --test tests/google-calendar.test.cjs` for pagination, recurring-instance normalization, all-day/overnight boundaries, stale refresh handling, token expiry, and late-response protection after disconnect.

## Particles

The site-wide Carolina blue canvas background adapts [Magic UI Particles](https://magicui.design/docs/components/particles) for this buildless HTML/JavaScript app. The shadcn CLI installs a React component, so its particle engine is ported in `dist/particles.js` without adding a React runtime. It follows the pointer gently, caps particle count and pixel density, pauses when the tab is hidden, and renders a still background when reduced motion is enabled. MIT attribution is in `dist/MAGICUI-LICENSE.txt`.

## Animated lists and text reveal

`dist/magic-motion.js` adapts Magic UI Animated List and Text Reveal for this plain HTML app. Schedule rows, both task lists, saved links, calendar source checkboxes, and month days enter in sequence; keyed rows keep their order and settle after changes. All data is present immediately, staggering is capped, unchanged lists retain their DOM and keyboard focus, and reduced motion disables animations. The motivational footer reveals its words as it scrolls into view without adding a long sticky section. Task and event text stays fully readable. The original React/Motion CLI components were adapted rather than adding a framework runtime.
