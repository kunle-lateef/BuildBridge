/**
 * Purely decorative diagonal-stripe background behind the auth pages'
 * centered card, per the developer's reference image. Built from scratch
 * with the existing border token, not a copied asset — see
 * reference-inspiration.md's marketing pages note.
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[repeating-linear-gradient(45deg,var(--color-border)_0,var(--color-border)_1px,transparent_1px,transparent_12px)] opacity-60"
    />
  );
}
