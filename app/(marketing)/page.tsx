import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AccuracySection } from '@/components/marketing/AccuracySection';
import { AudienceSection } from '@/components/marketing/AudienceSection';
import { ClosingSection } from '@/components/marketing/ClosingSection';
import { DeveloperViewSection } from '@/components/marketing/DeveloperViewSection';
import { FaqSection } from '@/components/marketing/FaqSection';
import { HeroIntro } from '@/components/marketing/HeroIntro';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'BuildBridge',
  description: 'AI-powered designer-to-developer handoff assistant.',
};

/**
 * The home page, section for section as Figma `01 — Home` (Desktop 1440 and
 * Mobile 390): Hero, Who it's for, How it works, Accuracy, FAQ, closing
 * section. "What your developer opens" (approved from `13 — Marketing
 * concepts`) sits after How it works. No lines between sections: spacing
 * and the Accuracy section's surface colour separate them.
 */
export default async function MarketingHomePage() {
  const session = await auth();

  if (session?.user) {
    redirect('/handoffs');
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader />

      <main className="flex flex-1 flex-col">
        <section>
          <HeroIntro />
        </section>
        <AudienceSection />
        <HowItWorksSection />
        <DeveloperViewSection />
        <AccuracySection />
        <FaqSection />
        <ClosingSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
