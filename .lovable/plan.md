

## Plan: Fix Two TypeScript Build Errors

### Error 1: UploadDocumentDialog.tsx (line 204-211)
The `activity_feed` table Insert type does not include `user_email`. Remove `user_email` from the insert object.

### Error 2: AgentConfiguration.tsx (line 358)
The `payload` variable is typed as `Record<string, unknown>`, which is incompatible with Supabase's strict insert/update types. Fix by casting `payload as never` on the update call (matching the existing pattern on line 351 for insert), or better, remove the explicit `Record<string, unknown>` type annotation and let TypeScript infer a compatible type.

### Changes
1. **src/components/dialogs/UploadDocumentDialog.tsx** — Remove `user_email: user.email` from the `activity_feed` insert call (line 210).
2. **src/pages/AgentConfiguration.tsx** — Add `as never` cast on line 358: `.update(payload as never)` to match the existing insert pattern.

