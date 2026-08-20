type HeroBackgroundProps = {
  /** 'default' for the light page surface; 'inverse' for a --color-primary-dark surface (the closing CTA band). */
  tone?: 'default' | 'inverse';
};

/**
 * Purely decorative background behind hero-style content — a uniform dot
 * grid, matching in spirit on both surfaces (light hero uses
 * `--color-text-muted` at 50% opacity; the `--color-primary-dark` CTA band
 * uses a translucent white dot), per the developer's reference images.
 * Built from scratch with existing tokens/plain white, not a copied asset —
 * see reference-inspiration.md's marketing pages note.
 */
export function HeroBackground({ tone = 'default' }: HeroBackgroundProps) {
  const isInverse = tone === 'inverse';

  return (
    <div
      aria-hidden="true"
      className={
        isInverse
          ? 'pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[length:20px_20px]'
          : 'pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle,var(--color-text-muted)_1px,transparent_1px)] bg-[length:20px_20px] opacity-50'
      }
    />
  );
}
