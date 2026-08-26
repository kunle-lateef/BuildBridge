// Barrel only — no logic lives here. This file used to hold all of the
// handoffs feature area's server actions directly (handoff CRUD, uploads,
// analysis, designer decisions, share links, notes, screen flows, developer
// flags), which meant a change to any one of those unrelated concerns
// touched the same 1000+ line file. Each concern now has its own
// '*-actions.ts' file; this barrel exists purely so every external import
// path that already points at './actions' (or the '@/app/.../actions'
// alias) keeps working unchanged. Add new actions to the relevant domain
// file and re-export it here, rather than adding directly to this file.
export * from './handoff-actions';
export * from './upload-actions';
export * from './decision-actions';
export * from './share-link-actions';
export * from './note-actions';
export * from './screen-flow-actions';
export * from './developer-flag-actions';
