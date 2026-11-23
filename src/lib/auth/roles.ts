/** Better Auth stores several roles as one comma-separated string. */
export function hasAdminRole(role: string | null | undefined): boolean {
  return (
    role
      ?.split(",")
      .some((entry) => entry.trim().toLowerCase() === "admin") ?? false
  );
}
