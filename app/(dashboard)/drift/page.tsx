import { redirect } from 'next/navigation';

/** Drift is now a tab on Insights (Figma `08 — Insights`); old links land there. */
export default function DriftPage() {
  redirect('/insights?tab=drift');
}
