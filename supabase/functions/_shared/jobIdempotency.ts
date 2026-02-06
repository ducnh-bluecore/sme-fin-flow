/**
 * JOB IDEMPOTENCY - Shared utilities for edge function idempotency
 * 
 * Per JOB_IDEMPOTENCY_STANDARD.md:
 * - Lock key format: {function_name}:{tenant_id}:{grain_date}:{entity_hash}
 * - Prevents duplicate executions
 * - Tracks job lifecycle in job_runs table
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface JobContext {
  jobId: string;
  lockKey: string;
  alreadyRunning: boolean;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Generate a lock key for a job
 * Format: {function}:{tenant}:{date}:{hash}
 */
export function generateLockKey(
  functionName: string,
  tenantId: string,
  grainDate?: string,
  entityHash?: string
): string {
  const date = grainDate || new Date().toISOString().split('T')[0];
  const parts = [functionName, tenantId, date];
  if (entityHash) {
    parts.push(entityHash);
  }
  return parts.join(':');
}

/**
 * Try to acquire a job lock
 * Returns job context if lock acquired, null if job already running
 */
export async function acquireJobLock(
  supabase: SupabaseClient,
  functionName: string,
  tenantId: string,
  options: {
    grainDate?: string;
    entityHash?: string;
    inputParams?: Record<string, any>;
  } = {}
): Promise<JobContext | null> {
  const lockKey = generateLockKey(
    functionName,
    tenantId,
    options.grainDate,
    options.entityHash
  );

  // Check for existing running job with same lock key
  const { data: existingJob } = await supabase
    .from('job_runs')
    .select('id, status, started_at')
    .eq('lock_key', lockKey)
    .eq('status', 'running')
    .maybeSingle();

  if (existingJob) {
    console.log(`[${functionName}] Job already running: ${existingJob.id} (started: ${existingJob.started_at})`);
    return {
      jobId: existingJob.id,
      lockKey,
      alreadyRunning: true,
    };
  }

  // Try to create new job run record
  const { data: jobRun, error: jobError } = await supabase
    .from('job_runs')
    .insert({
      tenant_id: tenantId,
      function_name: functionName,
      lock_key: lockKey,
      status: 'running',
      input_params: options.inputParams || null,
    })
    .select('id')
    .single();

  if (jobError) {
    // Unique constraint violation = another instance grabbed the lock
    if (jobError.code === '23505') {
      console.log(`[${functionName}] Lock contention, another instance grabbed the lock`);
      return null;
    }
    console.error(`[${functionName}] Error creating job run:`, jobError);
    return null;
  }

  console.log(`[${functionName}] Acquired lock: ${lockKey} (job: ${jobRun.id})`);

  return {
    jobId: jobRun.id,
    lockKey,
    alreadyRunning: false,
  };
}

/**
 * Mark job as completed successfully
 */
export async function completeJob(
  supabase: SupabaseClient,
  jobId: string,
  result: any
): Promise<void> {
  const { error } = await supabase
    .from('job_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: result,
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Error completing job ${jobId}:`, error);
  }
}

/**
 * Mark job as failed
 */
export async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string,
  retryCount?: number
): Promise<void> {
  const update: Record<string, any> = {
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
  };

  if (retryCount !== undefined) {
    update.retry_count = retryCount;
  }

  const { error } = await supabase
    .from('job_runs')
    .update(update)
    .eq('id', jobId);

  if (error) {
    console.error(`Error failing job ${jobId}:`, error);
  }
}

/**
 * Cancel a job (e.g., when skipping due to already running)
 */
export async function cancelJob(
  supabase: SupabaseClient,
  jobId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('job_runs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: reason,
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Error cancelling job ${jobId}:`, error);
  }
}

/**
 * Create a conflict response for already-running jobs
 */
export function createConflictResponse(
  existingJobId: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      reason: 'Job already running',
      existing_job_id: existingJobId,
      code: 'JOB_ALREADY_RUNNING',
    }),
    {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Wrap an async function with job idempotency
 * Handles lock acquisition, completion, and failure automatically
 */
export async function withJobIdempotency<T>(
  supabase: SupabaseClient,
  functionName: string,
  tenantId: string,
  options: {
    grainDate?: string;
    entityHash?: string;
    inputParams?: Record<string, any>;
    corsHeaders: Record<string, string>;
  },
  fn: (jobId: string) => Promise<T>
): Promise<{ response: Response } | { result: T; jobId: string }> {
  const jobContext = await acquireJobLock(supabase, functionName, tenantId, options);

  if (!jobContext) {
    return {
      response: new Response(
        JSON.stringify({
          success: false,
          reason: 'Failed to acquire job lock',
          code: 'LOCK_ACQUISITION_FAILED',
        }),
        {
          status: 409,
          headers: { ...options.corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  if (jobContext.alreadyRunning) {
    return {
      response: createConflictResponse(jobContext.jobId, options.corsHeaders),
    };
  }

  try {
    const result = await fn(jobContext.jobId);
    await completeJob(supabase, jobContext.jobId, result);
    return { result, jobId: jobContext.jobId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await failJob(supabase, jobContext.jobId, errorMessage);
    throw error;
  }
}
