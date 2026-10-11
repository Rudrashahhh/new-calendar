# Carolina Day
A responsive Carolina blue planner for Rudra. Plain HTML, CSS, and JavaScript; no build step or secrets.

## Run
Serve `dist/` with any static web server. Example: `python3 -m http.server 5173 --directory dist`.

## Features
Daily agenda, month calendar, dated tasks with category and priority, task editing and completion animations, morning intentions, focus timer, notes, saved links, JSON export/import, mobile layout, keyboard controls, reduced-motion support.

## Data and integration status
Tasks, plans, notes, and check-ins are stored in the current browser's localStorage. They do not automatically sync across devices. Export/import supports manual transfer. No personal calendar content is committed in this repository.
Google Calendar is **not connected**. The app provides an explicit link to the user's live Google Calendar. The current Sites tool environment lacks the required integration eligibility discovery action, so a hosted connector was not enabled. Do not label local events as synchronized. A supported authorized connector and durable per-user storage are needed for live calendar integration and multi-device task sync.

## Hosting
Publish the contents of `dist/` to a static host. `.openai/hosting.json` describes the private Sites deployment. For another host, deploy only `dist/` and do not reuse the Sites project identity.

## GitHub
Source repository: https://github.com/Rudrashahhh/new-calendar

## Verification
JavaScript syntax checked. Browser-verified task creation, Finance Society category, high priority, completion, persistence after reload, editing, deletion, and monthly calendar rendering. No live Google Calendar integration was verified.
