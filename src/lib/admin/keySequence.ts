/**
 * Shared secret-unlock key sequence (Konami code), used by both the admin
 * panel gate and the cheat panel gate. One sequence, one source of truth —
 * discovering it grants nothing on its own; the real gate is the server-side
 * password check behind it (see /api/admin/login).
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
