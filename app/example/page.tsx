import type { Metadata } from 'next';

import { DeveloperView } from '@/components/share/DeveloperView';
import { buildExampleProjection } from '@/lib/example/projection';

export const metadata: Metadata = {
  title: 'Example handoff — BuildBridge',
  description: 'What a developer sees when a designer shares a BuildBridge handoff. Made-up data.',
};

/**
 * "See an example handoff" (Figma `05 — Share view / Example handoff`): the
 * real developer view, filled from the example fixture. Public, static, no
 * database, no share token; flagging is off and marked as off.
 */
export default function ExamplePage() {
  return <DeveloperView projection={buildExampleProjection()} downloadHref="/example/export" isExample />;
}
