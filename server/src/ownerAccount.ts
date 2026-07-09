/**
 * The single account that gets unrestricted cheat/troll access to online
 * games (any room, no flag requirement) — independent of the isModerator/
 * isAdmin DB roles, which other accounts can be granted. Mirrors the same
 * literal value as src/lib/cheats/access.ts's CHEAT_ACCOUNT_EMAIL and
 * src/lib/admin/owner.ts's ADMIN_OWNER_EMAIL on the Next.js side — this
 * server package can't import from src/lib (separate build), hence the
 * duplication.
 */
export const OWNER_EMAIL = "sbyrnes1@student.johnxxiii.edu.au";
