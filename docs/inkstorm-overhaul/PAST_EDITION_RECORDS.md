# Preserve records from earlier course editions

7 September 2026. Implemented locally; not deployed.

Changing the course, physics or rules previously filtered incompatible personal bests and saved courses on load. The next successful profile save then erased those entries. Ordinary race history already survived, so that behavior was not changed.

The parser now migrates valid old personal-best metadata into `archivedRecords` and old saved-course metadata into `archivedFavorites`. Original identities, edition versions, times, medals, sectors, names and dates are retained. Archived ghosts are removed, and archives remain separate from current best-time comparisons, active event selection and ghost playback. The garage reports how many entries from earlier editions are preserved.

The existing storage key/schema version remains backward compatible: missing archive arrays become empty. Migration deduplicates by full record identity or saved-course edition/id/seed. Archives are bounded to the newest 72 personal bests and 32 saved courses; active records, ghosts and history retain their existing bounds. Both normal saving and quota fallback preserve archive metadata. Data already erased by an earlier save cannot be reconstructed.

Three focused regression cases cover repeated load/save migration, all three incompatible version categories, exclusion from active comparisons/events/ghosts, preservation through ghost-removal quota fallback, malformed-entry rejection and archive bounds. The existing 16 mastery tests also pass. Browser Cup lifecycle acceptance will separately exercise normal profile saving on the combined build.
