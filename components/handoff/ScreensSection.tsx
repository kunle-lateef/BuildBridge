import { ScreenThumbnail } from '@/components/handoff/ScreenThumbnail';
import type { ScreenAnalysisStatus } from '@/lib/types';

type ScreensSectionProps = {
  screens: { id: string; name: string; imageUrl: string; analysisStatus: ScreenAnalysisStatus }[];
};

export function ScreensSection({ screens }: ScreensSectionProps) {
  if (screens.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--font-desktop-heading-3-semi-bold-size)] font-semibold text-[--color-text-primary]">
        Screens
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {screens.map((screen) => (
          <ScreenThumbnail
            key={screen.id}
            name={screen.name}
            imageUrl={screen.imageUrl}
            analysisStatus={screen.analysisStatus}
          />
        ))}
      </div>
    </section>
  );
}
