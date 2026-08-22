import { z } from 'zod';

/**
 * Every AI-generated finding carries provenance and confidence — see
 * AGENTS.md's Non-Negotiables. No schema below may make either optional.
 */
export const provenanceSchema = z.enum(['Detected', 'Inferred', 'Suggested']);
export const confidenceSchema = z.number().min(0).max(1);

// --- Stage 1: Component detection -------------------------------------

export const detectedComponentSchema = z.object({
  name: z.string().min(1),
  // Free text, not a fixed enum — architecture.md's stage-1 list
  // (Navigation/Cards/Forms/Buttons/Inputs/Tables/"Other meaningful UI
  // components") is explicitly open-ended.
  type: z.string().min(1),
  description: z.string().min(1),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  provenance: provenanceSchema,
  confidence: confidenceSchema,
});

export const componentDetectionResultSchema = z.object({
  components: z.array(detectedComponentSchema),
});

// --- Stage 2: Specification extraction ----------------------------------

export const specificationCategorySchema = z.enum([
  'Spacing',
  'Typography',
  'Color',
  'Dimensions',
  'Border',
  'Radius',
  'Shadow',
]);

export const extractedSpecificationSchema = z.object({
  category: specificationCategorySchema,
  property: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  provenance: provenanceSchema,
  confidence: confidenceSchema,
});

export const specificationExtractionResultSchema = z.object({
  specifications: z.array(extractedSpecificationSchema),
});

// --- Stage 3: State & interaction analysis ------------------------------

export const componentStateNameSchema = z.enum([
  'Default',
  'Hover',
  'Focus',
  'Disabled',
  'Loading',
  'Error',
  'Empty',
]);

export const componentStateFindingSchema = z.object({
  name: componentStateNameSchema,
  description: z.string().min(1),
  // Suggested by default absent strong visual evidence — see
  // architecture.md's stage-3 row. Enforced in lib/ai/pipeline.ts, not
  // here; this schema just requires the field is present.
  provenance: provenanceSchema,
  confidence: confidenceSchema,
});

export const stateAnalysisResultSchema = z.object({
  states: z.array(componentStateFindingSchema),
});

// --- Stage 4: Responsive analysis ---------------------------------------

export const viewportCategorySchema = z.enum(['Desktop', 'Tablet', 'Mobile']);

export const responsiveRuleFindingSchema = z.object({
  viewportCategory: viewportCategorySchema,
  behavior: z.string().min(1),
  provenance: provenanceSchema,
  confidence: confidenceSchema,
});

export const responsiveAnalysisResultSchema = z.object({
  rules: z.array(responsiveRuleFindingSchema),
});

// --- Stage 5: Gap detection ----------------------------------------------

export const issueSeveritySchema = z.enum(['Critical', 'High', 'Medium', 'Low', 'Recommendation']);

export const readinessCategorySchema = z.enum([
  'VisualSpecifications',
  'Components',
  'ResponsiveBehavior',
  'InteractionStates',
  'EdgeCases',
  'Accessibility',
]);

export const handoffIssueFindingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: issueSeveritySchema,
  category: readinessCategorySchema,
  recommendation: z.string().optional(),
  provenance: provenanceSchema,
  confidence: confidenceSchema,
});

export const gapDetectionResultSchema = z.object({
  issues: z.array(handoffIssueFindingSchema),
});

// --- Contextual assistant (Phase P2) --------------------------------------

/**
 * Streamed conversational replies aren't structured tool-use output the way
 * the 5 pipeline stages are — validating field-by-field mid-stream would
 * defeat the point of streaming. This is the lighter bound security.md
 * still requires ("raw AI output... validated with zod, before it is
 * persisted"): applied once, after the stream completes, to the
 * accumulated text, before it's written as an AIMessage row. See
 * lib/ai/assistant.ts.
 */
export const assistantReplyContentSchema = z.string().trim().min(1).max(4000);
