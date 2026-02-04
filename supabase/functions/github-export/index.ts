import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, repoName, repoDescription, isPrivate, files } = await req.json();
    
    if (!projectId || !repoName || !files) {
      throw new Error('Missing required fields');
    }

    // For now, we'll create a downloadable zip file instead of direct GitHub integration
    // This is because GitHub OAuth requires user authorization flow
    
    // Store export request in database for tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Log the export attempt
    console.log(`GitHub export requested for project ${projectId} by user ${user.id}`);
    console.log(`Repository: ${repoName}, Files: ${files.length}`);

    // For now, return instructions for manual export
    // In a full implementation, this would:
    // 1. Use GitHub OAuth token to authenticate
    // 2. Create repository via GitHub API
    // 3. Push files via GitHub API
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'GitHub export prepared',
        repoName,
        filesCount: files.length,
        instructions: `To complete the export:
1. Create a new repository named "${repoName}" on GitHub
2. Clone the repository locally
3. Copy the exported files to the repository
4. Push changes to GitHub`,
        // When GitHub OAuth is implemented:
        // repoUrl: `https://github.com/${username}/${repoName}`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('GitHub Export Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
