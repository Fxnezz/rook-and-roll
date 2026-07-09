/**
 * Shared secret-unlock key sequence (Konami code), used by the admin panel
 * gate, the bot-page cheat panel gate, and the moderator god-mode gate. One
 * sequence, one source of truth — discovering it grants nothing on its own;
 * the real gate is each account's own role flag (isAdmin / cheat account
 * email / isModerator), checked server-side wherever it matters.
 */
export const ADMIN_KEY_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
export const ADMIN_KEY_SEQUENCE_RESET_MS = 2000;
