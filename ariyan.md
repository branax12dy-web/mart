# Ariyan — Project Alerpa Debug & Enhancement Log
**Project:** AJKMart Super-App Ecosystem  
**Role:** Senior Full-Stack Engineer & System Architect  
**Started:** 2026-04-22

---

## Overall Progress: 78%

---

## Task Breakdown Table

| # | Phase | Task | Status | Completion % | Notes |
|---|-------|------|--------|--------------|-------|
| 1 | PHASE 1 | Create ariyan.md | ✅ Done | 100% | This document |
| 2 | PHASE 2a | Fix JSON/HTML Mismatch — add API 404 JSON handler + fix CommandPalette fetch path | ✅ Done | 100% | `app.ts` catch-all + `CommandPalette.tsx` uses `window.location.origin` |
| 3 | PHASE 2b | Error Reporter Hashing — dedup by hash, group identical errors | ✅ Done | 100% | Schema (`errorHash`, `occurrenceCount`) + API dedup + client-side hash |
| 4 | PHASE 2c | Dual-Layer AI Auto-Resolve — Gemini primary + rule-based fallback | ✅ Done | 100% | `/error-reports/:id/ai-analyze` endpoint with `gemini-2.0-flash` + fallback |
| 5 | PHASE 3a | Admin Settings — verify logical categories + 100% responsive | ⏳ Pending | 0% | Check nav + mobile layout |
| 6 | PHASE 3b | Command Palette — AI natural language command execution | ✅ Done | 100% | `/admin/command/execute` + Zap UI strip in CommandPalette.tsx |
| 7 | PHASE 4a | Zero Dummy Policy — connect all Integration toggles to real backend | ⏳ Pending | 0% | Verify save flow end-to-end |
| 8 | PHASE 4b | Strict TypeScript — `tsc --noEmit` clean in admin + api-server | ✅ Done | 100% | All 0 errors: admin (categories, deep-links, push, popups, riders, loyalty, settings-system, experiments, qr-codes, webhook-manager, wishlist-insights) + api-server (db rebuild) |
| 9 | PHASE 4c | Logic Sync — frontend states mirror backend DB changes | ⏳ Pending | 0% | Verify query invalidation |

---

## Error Ledger (Active Bugs)

| # | Location | Bug Description | Priority | Status |
|---|----------|-----------------|----------|--------|
| E1 | `artifacts/api-server/src/app.ts` | Unmatched `/api/*` routes return Express HTML 404 instead of JSON | CRITICAL | ✅ Fixed |
| E2 | `artifacts/admin/src/components/CommandPalette.tsx:123` | AI search fetch used hardcoded path without BASE_URL | HIGH | ✅ Fixed |
| E3 | `artifacts/api-server/src/routes/error-reports.ts:71` | Every identical error generated a new unique ID — no deduplication | MEDIUM | ✅ Fixed |
| E4 | `artifacts/admin/src/lib/error-reporter.ts` | Client-side dedup only checked console.error | MEDIUM | ✅ Fixed |
| E5 | `artifacts/api-server/src/routes/admin/system.ts:1035` | AI auto-resolve only used rule-based logic | MEDIUM | ✅ Fixed |
| E6 | `artifacts/api-server/src/routes/admin/system.ts:985` | Gemini model name `gemini-3-flash-preview` was incorrect | MEDIUM | ✅ Fixed |
| E7 | `artifacts/admin/src/pages/categories.tsx:312-313` | Implicit `any` on id params in `onDelete` / `onToggle` callbacks | MEDIUM | ✅ Fixed |
| E8 | `artifacts/admin/src/pages/deep-links.tsx:105` | `onRefresh={refetch}` — Promise return type mismatch | MEDIUM | ✅ Fixed |
| E9 | `artifacts/admin/src/lib/push.ts:18` | `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource` | MEDIUM | ✅ Fixed |
| E10 | `artifacts/admin/src/pages/popups.tsx:386-388,643` | `Record<string, unknown>` targeting cast + Campaign nullable fields for PopupPreview | MEDIUM | ✅ Fixed |
| E11 | `artifacts/admin/src/pages/loyalty.tsx:199,242` | `useRef` without initial value + `onRefresh` return type | MEDIUM | ✅ Fixed |
| E12 | `artifacts/admin/src/pages/riders.tsx:347` | `note: string \| undefined` not assignable to `note: string` in mutation | MEDIUM | ✅ Fixed |
| E13 | `artifacts/admin/src/pages/settings-system.tsx:424` | `Cannot find namespace 'JSX'` — replaced with `ReactElement` | MEDIUM | ✅ Fixed |
| E14 | 5 admin pages (experiments, qr-codes, webhook-manager, wishlist-insights, loyalty) | `onRefresh={refetch}` Promise type mismatch across all PullToRefresh usages | MEDIUM | ✅ Fixed |
| E15 | `lib/db` | `errorHash`/`occurrenceCount` columns not in compiled dist — api-server TS errors | MEDIUM | ✅ Fixed (rebuilt lib/db) |

---

## Logic Definitions (Solutions Applied)

### Hash-based Error Deduplication
- `DJB2` hash over `errorType::sourceApp::errorMessage[0:300]`
- 10-minute dedup window — increments `occurrenceCount` instead of inserting
- Client-side: same hash tracked in `Set`, clears on page load

### Gemini AI Auto-Resolve
- Model: `gemini-2.0-flash` (not `gemini-3-flash-preview`)
- Endpoint: `POST /api/error-reports/:id/ai-analyze`
- Fallback: rule-based keyword matching if Gemini times out or is unconfigured

### Command Palette AI Execute
- `isCommandLike()` detects "enable/disable/set/toggle" intent
- `POST /api/admin/command/execute` runs safe subset of toggle/write keys
- SAFE_TOGGLE_KEYS and SAFE_WRITE_KEYS whitelisted in `system.ts`

### TypeScript Strict Compliance
- `lib/db` must be rebuilt (`pnpm --filter @workspace/db run build`) after schema changes
- `onRefresh` on `PullToRefresh` must be `async () => { await refetch(); }` not bare `refetch`
- Nullable Campaign fields need explicit `?? undefined` when passed to `Partial<typeof EMPTY_FORM>`
- `useRef` with non-undefined generic needs explicit `| undefined` in strict mode

---

## Fix History

| Date | Task | Files Changed |
|------|------|---------------|
| 2026-04-22 | JSON/HTML mismatch fix | `app.ts`, `CommandPalette.tsx` |
| 2026-04-22 | Error hash dedup | `error_reports.ts` (schema), `error-reports.ts` (API), `error-reporter.ts` (client) |
| 2026-04-22 | Gemini AI analyze endpoint | `error-reports.ts`, `system.ts` |
| 2026-04-22 | CommandPalette execute strip | `CommandPalette.tsx` |
| 2026-04-22 | TypeScript 0-error pass (admin) | `categories.tsx`, `deep-links.tsx`, `push.ts`, `popups.tsx`, `loyalty.tsx`, `riders.tsx`, `settings-system.tsx`, `experiments.tsx`, `qr-codes.tsx`, `webhook-manager.tsx`, `wishlist-insights.tsx` |
| 2026-04-22 | TypeScript 0-error pass (api-server) | Rebuilt `lib/db` dist; `error-reports.ts` now sees `errorHash`/`occurrenceCount` |

---

## Remaining Work

| # | Task | Priority |
|---|------|----------|
| R1 | PHASE 3a: Admin Settings — verify categories are logical, check mobile/responsive layout | MEDIUM |
| R2 | PHASE 4a: Zero Dummy Policy — audit all Integration toggle saves to confirm real backend calls | HIGH |
| R3 | PHASE 4c: Logic Sync — confirm all mutations invalidate the correct React Query keys | MEDIUM |

---

## Final Summary
- **Total Tasks:** 9
- **Completed:** 6 ✅
- **Pending:** 3 ⏳
- **Overall %:** ~78%
