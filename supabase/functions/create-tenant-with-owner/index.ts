import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateTenantRequest {
  tenantName: string
  slug: string
  plan: string
  ownerEmail: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller is a super admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()

    // Handle find-user-by-email action
    if (body.action === 'find-user-by-email') {
      const { email } = body
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
      
      if (error) {
        console.error('Error listing users:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to search users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const foundUser = users?.users?.find(u => u.email === email)
      
      return new Response(
        JSON.stringify({ userId: foundUser?.id || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Original create-tenant-with-owner logic
    const { tenantName, slug, plan, ownerEmail }: CreateTenantRequest = body

    console.log('Creating tenant with owner:', { tenantName, slug, plan, ownerEmail })

    // Validate inputs
    if (!tenantName || !slug || !ownerEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(ownerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if tenant slug already exists
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'Slug đã tồn tại, vui lòng chọn slug khác' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === ownerEmail)

    let ownerId: string
    let isNewUser = false

    if (existingUser) {
      // User already exists, use their ID
      ownerId = existingUser.id
      console.log('User already exists:', ownerId)
    } else {
      // Create new user with a temporary password
      const tempPassword = crypto.randomUUID() + 'Aa1!'
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: tenantName + ' Owner',
        },
      })

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return new Response(
          JSON.stringify({ error: 'Lỗi khi tạo tài khoản: ' + createUserError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      ownerId = newUser.user.id
      isNewUser = true
      console.log('Created new user:', ownerId)

      // The handle_new_user trigger creates a default tenant - we need to clean it up
      // Wait longer for trigger to complete (trigger may take time)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Find and delete the auto-created tenant (the one where user is owner)
      // Retry logic to ensure we catch the auto-created tenant
      let retries = 3
      while (retries > 0) {
        const { data: autoTenants } = await supabaseAdmin
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', ownerId)
          .eq('role', 'owner')

        if (autoTenants && autoTenants.length > 0) {
          for (const autoTenant of autoTenants) {
            console.log('Found auto-created tenant to delete:', autoTenant.tenant_id)
            
            // Delete tenant_users entry first
            await supabaseAdmin
              .from('tenant_users')
              .delete()
              .eq('tenant_id', autoTenant.tenant_id)
            
            // Then delete the auto-created tenant
            await supabaseAdmin
              .from('tenants')
              .delete()
              .eq('id', autoTenant.tenant_id)
            
            console.log('Deleted auto-created tenant:', autoTenant.tenant_id)
          }
          break
        } else {
          retries--
          if (retries > 0) {
            console.log('No auto-created tenant found yet, retrying...', retries)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }

      // Send password reset email so user can set their own password
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: ownerEmail,
      })

      if (resetError) {
        console.warn('Could not generate password reset link:', resetError)
      }
    }

    // Create the tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenantName,
        slug: slug,
        plan: plan,
        is_active: true,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return new Response(
        JSON.stringify({ error: 'Lỗi khi tạo tenant: ' + tenantError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Created tenant:', tenant.id)

    // Add owner to tenant_users
    const { error: memberError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: ownerId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Error adding owner to tenant:', memberError)
      // Rollback tenant creation
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      return new Response(
        JSON.stringify({ error: 'Lỗi khi gán owner cho tenant: ' + memberError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user's active_tenant_id to the new tenant
    await supabaseAdmin
      .from('profiles')
      .update({ active_tenant_id: tenant.id })
      .eq('id', ownerId)

    console.log('Successfully created tenant with owner')

    return new Response(
      JSON.stringify({
        success: true,
        tenant: tenant,
        ownerId: ownerId,
        isNewUser: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
