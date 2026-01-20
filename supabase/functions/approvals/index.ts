import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/approvals', '');
    const tenantId = req.headers.get('x-tenant-id');

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userRole: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      
      if (userId) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('user_id', userId)
          .maybeSingle();
        userRole = tenantUser?.role || null;
      }
    }

    // GET /approvals/policies - List policies
    if (req.method === 'GET' && path === '/policies') {
      const { data: policies, error } = await supabase
        .from('enterprise_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('policy_type')
        .order('priority');

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch policies' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ policies: policies || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /approvals/policies - Create policy
    if (req.method === 'POST' && path === '/policies') {
      const body = await req.json();
      const { policyName, policyType, condition, requiredApprovals, approverRoles, enabled } = body;

      if (!policyName || !policyType || !condition) {
        return new Response(
          JSON.stringify({ error: 'policyName, policyType, and condition are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('enterprise_policies')
        .insert({
          tenant_id: tenantId,
          policy_name: policyName,
          policy_type: policyType,
          condition,
          required_approvals: requiredApprovals || 1,
          approver_roles: approverRoles || ['owner', 'admin'],
          enabled: enabled !== false,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating policy:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create policy' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      await supabase.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'USER',
        actor_id: userId,
        action: 'CREATE_POLICY',
        resource_type: 'enterprise_policy',
        resource_id: data.id,
        after_state: data,
      });

      return new Response(
        JSON.stringify({ success: true, policy: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /approvals/policies/:id - Update policy
    if (req.method === 'PUT' && path.startsWith('/policies/')) {
      const policyId = path.split('/')[2];
      const body = await req.json();
      const { policyName, condition, requiredApprovals, approverRoles, enabled, priority } = body;

      // Get current state for audit
      const { data: currentPolicy } = await supabase
        .from('enterprise_policies')
        .select('*')
        .eq('id', policyId)
        .eq('tenant_id', tenantId)
        .single();

      const { data, error } = await supabase
        .from('enterprise_policies')
        .update({
          policy_name: policyName,
          condition,
          required_approvals: requiredApprovals,
          approver_roles: approverRoles,
          enabled,
          priority,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', policyId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to update policy' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      await supabase.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'USER',
        actor_id: userId,
        action: 'UPDATE_POLICY',
        resource_type: 'enterprise_policy',
        resource_id: policyId,
        before_state: currentPolicy,
        after_state: data,
      });

      return new Response(
        JSON.stringify({ success: true, policy: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /approvals/check - Check if action requires approval
    if (req.method === 'POST' && path === '/check') {
      const body = await req.json();
      const { policyType, context } = body;

      if (!policyType) {
        return new Response(
          JSON.stringify({ error: 'policyType is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: policies } = await supabase
        .from('enterprise_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('policy_type', policyType)
        .eq('enabled', true)
        .order('priority');

      let matchingPolicy = null;
      
      for (const policy of policies || []) {
        const condition = policy.condition;
        let matches = false;

        // Check amount_gt condition
        if (condition.amount_gt && context.amount > condition.amount_gt) {
          matches = true;
        }
        // Check amount_gte condition
        if (condition.amount_gte && context.amount >= condition.amount_gte) {
          matches = true;
        }
        // Check always condition
        if (condition.always === true) {
          matches = true;
        }
        // Check confidence_lt condition
        if (condition.confidence_lt && context.confidence < condition.confidence_lt) {
          matches = true;
        }
        // Check risk_level condition
        if (condition.risk_level && context.risk_level === condition.risk_level) {
          matches = true;
        }

        if (matches) {
          matchingPolicy = policy;
          break;
        }
      }

      if (matchingPolicy) {
        return new Response(
          JSON.stringify({
            requiresApproval: true,
            policyId: matchingPolicy.id,
            policyName: matchingPolicy.policy_name,
            requiredApprovals: matchingPolicy.required_approvals,
            approverRoles: matchingPolicy.approver_roles,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ requiresApproval: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /approvals/request - Create approval request
    if (req.method === 'POST' && path === '/request') {
      const body = await req.json();
      const { policyId, action, resourceType, resourceId, resourceData } = body;

      if (!policyId || !action || !resourceType) {
        return new Response(
          JSON.stringify({ error: 'policyId, action, and resourceType are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get policy details
      const { data: policy } = await supabase
        .from('enterprise_policies')
        .select('*')
        .eq('id', policyId)
        .eq('tenant_id', tenantId)
        .single();

      if (!policy) {
        return new Response(
          JSON.stringify({ error: 'Policy not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create approval request
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          tenant_id: tenantId,
          policy_id: policyId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          resource_data: resourceData,
          required_approvals: policy.required_approvals,
          requested_by: userId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating approval request:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create approval request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      await supabase.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'USER',
        actor_id: userId,
        action: 'CREATE_APPROVAL_REQUEST',
        resource_type: 'approval_request',
        resource_id: data.id,
        decision_context: policy.policy_name,
        after_state: data,
      });

      return new Response(
        JSON.stringify({ success: true, request: data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /approvals/pending - List pending approvals
    if (req.method === 'GET' && path === '/pending') {
      const { data: requests, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          policy:enterprise_policies(policy_name, policy_type, approver_roles),
          decisions:approval_decisions(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch pending approvals' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter by approver role if user is not owner/admin
      let filtered = requests || [];
      if (userRole && !['owner', 'admin'].includes(userRole)) {
        filtered = filtered.filter((r: any) => 
          r.policy?.approver_roles?.includes(userRole)
        );
      }

      return new Response(
        JSON.stringify({ 
          requests: filtered,
          canApprove: ['owner', 'admin'].includes(userRole || ''),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /approvals/history - List approval history
    if (req.method === 'GET' && path === '/history') {
      const limit = parseInt(url.searchParams.get('limit') || '50');

      const { data: requests, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          policy:enterprise_policies(policy_name, policy_type),
          decisions:approval_decisions(*, decider:profiles(full_name))
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['approved', 'rejected'])
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch approval history' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ requests: requests || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /approvals/decide/:id - Approve or reject
    if (req.method === 'POST' && path.startsWith('/decide/')) {
      const requestId = path.split('/')[2];
      const body = await req.json();
      const { decision, comment } = body;

      if (!decision || !['approve', 'reject'].includes(decision)) {
        return new Response(
          JSON.stringify({ error: 'Valid decision (approve/reject) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the request
      const { data: request } = await supabase
        .from('approval_requests')
        .select('*, policy:enterprise_policies(approver_roles)')
        .eq('id', requestId)
        .eq('tenant_id', tenantId)
        .single();

      if (!request) {
        return new Response(
          JSON.stringify({ error: 'Approval request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (request.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Request is no longer pending' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user can approve
      const approverRoles = request.policy?.approver_roles || ['owner', 'admin'];
      if (!approverRoles.includes(userRole || '')) {
        return new Response(
          JSON.stringify({ error: 'You do not have permission to approve this request' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already decided
      const { data: existingDecision } = await supabase
        .from('approval_decisions')
        .select('id')
        .eq('approval_request_id', requestId)
        .eq('decided_by', userId)
        .maybeSingle();

      if (existingDecision) {
        return new Response(
          JSON.stringify({ error: 'You have already made a decision on this request' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create decision (trigger will update request status)
      const { data, error } = await supabase
        .from('approval_decisions')
        .insert({
          tenant_id: tenantId,
          approval_request_id: requestId,
          decided_by: userId,
          decision,
          comment,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating decision:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to record decision' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get updated request
      const { data: updatedRequest } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          decision: data,
          requestStatus: updatedRequest?.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /approvals/stats - Get approval stats
    if (req.method === 'GET' && path === '/stats') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: pendingCount },
        { count: approvedCount },
        { count: rejectedCount },
        { data: policies },
      ] = await Promise.all([
        supabase.from('approval_requests').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'pending'),
        supabase.from('approval_requests').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'approved').gte('resolved_at', thirtyDaysAgo),
        supabase.from('approval_requests').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq('status', 'rejected').gte('resolved_at', thirtyDaysAgo),
        supabase.from('enterprise_policies').select('id, enabled')
          .eq('tenant_id', tenantId),
      ]);

      return new Response(
        JSON.stringify({
          pendingCount: pendingCount || 0,
          approvedCount30d: approvedCount || 0,
          rejectedCount30d: rejectedCount || 0,
          totalPolicies: policies?.length || 0,
          activePolicies: policies?.filter((p: any) => p.enabled).length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Approvals API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
