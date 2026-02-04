// =============================================================================
// Serve Published Sites - Subdomain Router
// =============================================================================
// This edge function serves published sites based on subdomain.
// Configure DNS: *.buildablelabs.dev -> this function URL
//
// Usage:
// 1. Point *.buildablelabs.dev A record to your edge function host
// 2. Or use a reverse proxy/CDN that forwards to this function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Get subdomain from either:
    // 1. Host header (production): myproject.buildablelabs.dev
    // 2. Query param (development): ?subdomain=myproject
    let subdomain: string | null = null;
    
    const host = req.headers.get('host') || '';
    const hostMatch = host.match(/^([^.]+)\.buildablelabs\.dev$/);
    
    if (hostMatch) {
      subdomain = hostMatch[1];
    } else {
      // Fallback to query param for testing
      subdomain = url.searchParams.get('subdomain');
    }
    
    if (!subdomain) {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Buildable Labs</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }
    .container { text-align: center; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { color: #888; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Buildable Labs</h1>
    <p>Build and deploy apps with AI</p>
    <p><a href="https://buildablelabs.dev">Get Started</a></p>
  </div>
</body>
</html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up project by subdomain
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, subdomain, deployed_url, user_id')
      .eq('subdomain', subdomain)
      .single();

    if (projectError || !project) {
      console.error('Project lookup error:', projectError);
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>Site Not Found</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }
    .container { text-align: center; }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>This site doesn't exist or hasn't been published yet.</p>
    <p><a href="https://buildablelabs.dev" style="color: #3b82f6;">Create your own →</a></p>
  </div>
</body>
</html>`,
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Get the published HTML from storage
    const storagePath = `${project.user_id}/${project.id}/index.html`;
    const { data: fileData, error: storageError } = await supabase
      .storage
      .from('published-sites')
      .download(storagePath);

    if (storageError || !fileData) {
      console.error('Storage error:', storageError);
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
  <title>${project.name} - Coming Soon</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .container { text-align: center; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${project.name}</h1>
    <p>This site is being set up. Check back soon!</p>
  </div>
</body>
</html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Return the published HTML
    const html = await fileData.text();
    
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Error</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }
  </style>
</head>
<body>
  <p>Something went wrong. Please try again later.</p>
</body>
</html>`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
});
