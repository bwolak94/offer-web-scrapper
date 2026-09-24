import { and, desc, eq } from 'drizzle-orm'
import { db } from '../index'
import { snapshots } from '../schema'

export type DbSnapshot = typeof snapshots.$inferSelect

export async function recordSnapshot(
  refId:   string,
  refType: 'listing' | 'job',
  diff:    Record<string, { from: unknown; to: unknown }>
): Promise<void> {
  await db.insert(snapshots).values({
    ref_id:   refId,
    ref_type: refType,
    diff,
  })
}

export async function getSnapshotsByRef(
  refId:   string,
  refType: 'listing' | 'job'
): Promise<DbSnapshot[]> {
  return db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.ref_id, refId),
        eq(snapshots.ref_type, refType)
      )
    )
    .orderBy(desc(snapshots.snapped_at))
}
