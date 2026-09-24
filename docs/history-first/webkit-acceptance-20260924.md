# History-first reconstruction — native WebKit acceptance

Date: 2026-09-24

## Current authority and execution path

The customer-facing web application is served by the Node application runtime. The repository had functional source
tests but no native browser acceptance harness; generic Playwright smoke coverage was not an FCIS semantic or visual
witness.

## What previously worked

The landing route and auth-gated `/app/` route were present, with explicit headings, links, buttons, and the auth gate
exposed in the HTML. The app/API contracts and server-backed persistence tests passed independently.

## What was missing

There was no Swift/WebKit process that inspected the live DOM/accessibility-facing semantics or captured a fixed
viewport snapshot from the served application. Therefore the repository could not claim native user-facing
acceptance.

## Smallest seam implemented

`acceptance/webkit` is a macOS Swift package using WKWebView. It loads a selected URL in a non-persistent browser,
asserts main landmarks, customer-facing headings, planning navigation, and auth-gate presence through JavaScript,
and writes JSON semantic evidence plus a 1280×800 PNG snapshot. It does not authenticate against GitHub, mutate
application state, deploy infrastructure, or substitute for a typed HCloud service-release adapter.
