/**
 * Assessment Components - Data Assessment Survey System
 * 
 * Simplified 3-step flow with smart data inference:
 * 1. DataSourceStep - Select sources with sub-sources
 * 2. DataConfirmStep - Confirm inferred + add additional data
 * 3. ImportPlanStep - View generated import plan
 * 
 * Onboarding Helpers:
 * - DataAssessmentIntro - Intro section explaining D2C mapping
 * - DataTypeTooltip - Tooltip with data type explanations
 * - AssessmentSpotlightTour - Guided tour for first-time users
 */

export { DataAssessmentWizard } from './DataAssessmentWizard';
export { DataSourceStep } from './DataSourceStep';
export { DataConfirmStep } from './DataConfirmStep';
export { ImportPlanStep } from './ImportPlanStep';
export { ModuleAssessmentGuard, useModuleAssessmentStatus } from './ModuleAssessmentGuard';
export { DataAssessmentIntro } from './DataAssessmentIntro';
export { DataTypeTooltip, DataTypeInfo } from './DataTypeTooltip';
export { AssessmentSpotlightTour, useAssessmentTour } from './AssessmentSpotlightTour';
