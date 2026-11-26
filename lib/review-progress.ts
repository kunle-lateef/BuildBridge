import { db } from '@/lib/db';

/**
 * Values still waiting for the designer's call on one handoff: components,
 * specifications, states and responsive rules that are still Unreviewed.
 * The same four kinds the Review page counts as findings (gaps are separate).
 */
export async function countValuesToReview(handoffId: string): Promise<number> {
  const inHandoff = {
    OR: [{ component: { handoffId } }, { screen: { handoffId } }],
  };
  const [components, specifications, states, rules] = await Promise.all([
    db.component.count({ where: { handoffId, reviewStatus: 'Unreviewed' } }),
    db.specification.count({ where: { ...inHandoff, reviewStatus: 'Unreviewed' } }),
    db.componentState.count({ where: { component: { handoffId }, reviewStatus: 'Unreviewed' } }),
    db.responsiveRule.count({ where: { ...inHandoff, reviewStatus: 'Unreviewed' } }),
  ]);
  return components + specifications + states + rules;
}
