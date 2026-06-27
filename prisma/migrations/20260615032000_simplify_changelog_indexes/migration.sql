-- Drop indexes that do not match the current changelog access paths.
DROP INDEX IF EXISTS "ChangelogEntry_visibleAt_id_idx";
DROP INDEX IF EXISTS "ChangelogRead_userId_readAt_idx";
