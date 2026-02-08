
-- Add unique constraints needed for ON CONFLICT
ALTER TABLE public.ai_semantic_models ADD CONSTRAINT ai_semantic_models_entity_type_key UNIQUE (entity_type);
ALTER TABLE public.ai_query_templates ADD CONSTRAINT ai_query_templates_intent_pattern_key UNIQUE (intent_pattern);
