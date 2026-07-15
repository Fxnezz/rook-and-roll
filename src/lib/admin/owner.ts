/** The only account allowed to use the Shield Center or moderation APIs. */
export const ADMIN_OWNER_EMAIL = "sbyrnes1@student.johnxxiii.edu.au";

export function isAdminOwnerEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}
