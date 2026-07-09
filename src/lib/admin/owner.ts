/**
 * The one account that can never be removed from the admin list — set once,
 * seeded directly in the database. Never exposed to the client as a constant;
 * API responses instead include a computed `isOwner` boolean per row.
 */
export const ADMIN_OWNER_EMAIL = "sbyrnes1@student.johnxxiii.edu.au";
