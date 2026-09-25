// Stub — full implementation in AI-07 (two-stage watch evaluator).
// Called by the scoring worker after each item is scored.
// Must never throw — the scoring worker swallows errors from this call.

export async function checkAfterScoring(
  _refId:   string,
  _refType: 'listing' | 'job',
  _score:   number
): Promise<void> {
  // AI-07 will implement watch matching logic here
}
