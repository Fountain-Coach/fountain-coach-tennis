# History-first reconstruction — durable OAuth state

Date: 2026-09-24

## Current authority and execution path

`app/integration/oauth.mjs` owns OAuth challenge, session, dynamic client, authorization-code, consent, access-token,
and refresh-token state. The MCP/API server calls these functions for browser cookies, bearer tokens and ChatGPT
authorization. Before this slice every collection was an in-process `Map`.

## What previously worked

Provider configuration, state/nonce/PKCE checks, GitHub identity verification, admin-email admission, scope checks,
explicit consent, and API/MCP contracts were already covered by focused tests. The SQLite state authority was already
available for application data.

## What was missing

Restarting the service discarded all OAuth sessions and grants. A browser or ChatGPT client could not rely on
restart-safe continuity, and storing raw bearer/session keys would have created an avoidable private-data risk.

## Smallest seam implemented

The existing synchronous OAuth API now uses a collection adapter. In SQLite mode the adapter stores records in a
private `oauth_records` table keyed by SHA-256 hashes, preserving raw token material only in process memory while it
is being issued or presented. JSON mode remains the explicit development transition. Existing role admission remains
the configured admin-email allowlist; adding guessed member roles or an admin surface is deferred.
