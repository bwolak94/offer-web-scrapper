## Summary
<!-- What does this PR do? One paragraph. -->

## Type
- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] chore — maintenance, deps, config
- [ ] docs — documentation only

## Testing
- [ ] `npm run lint` passes locally
- [ ] `npm run typecheck` passes locally
- [ ] `npm run build` passes locally
- [ ] Manual smoke test performed (describe below)

## Migration
- [ ] No DB migration needed
- [ ] Migration included (`drizzle/` folder updated)
- [ ] Migration requires manual step (describe below)

## Checklist
- [ ] No `.env*` files committed
- [ ] No secrets hardcoded in source
- [ ] `NEXT_PUBLIC_APP_URL` used (not `VERCEL_URL`) wherever a stable production URL is needed
- [ ] `drizzle-kit generate` run if `src/db/schema.ts` was modified
