import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCredits } from './useCredits';
import { toast } from './use-toast';

export type ProjectState = 'draft' | 'preview' | 'publishing' | 'live';

export interface PublishState {
  projectId: string;
  state: ProjectState;
  draftVersion: number;
  liveVersion: number | null;
  lastPublishedAt: string | null;
  deployedUrl: string | null;
}

export interface PublishResult {
  success: boolean;
  deployedUrl?: string;
  error?: string;
}

// Generate a valid subdomain from project name
function generateSubdomain(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 63); // DNS label limit
}

// Generate the project URL
function generateProjectUrl(subdomain: string): string {
  return `https://${subdomain}.buildablelabs.dev`;
}

// Generate branding injection script for free plans
function generateBrandingScript(): string {
  return `
<!-- Buildable Labs Branding - Free Plan -->
<style>
  .buildable-badge {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
  .buildable-badge:hover {
    transform: translateY(-2px);
  }
  .buildable-badge-logo {
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }
  .buildable-badge-text {
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
  }
  .buildable-badge-text:hover {
    text-decoration: underline;
  }
  @media (max-width: 480px) {
    .buildable-badge {
      bottom: 12px;
      right: 12px;
      padding: 6px 10px;
    }
    .buildable-badge-logo {
      width: 16px;
      height: 16px;
    }
    .buildable-badge-text {
      font-size: 11px;
    }
  }
</style>
<div class="buildable-badge">
  <img 
    src="https://buildablelabs.dev/logo.png" 
    alt="Buildable" 
    class="buildable-badge-logo"
  />
  <a 
    href="https://buildablelabs.dev?ref=badge" 
    target="_blank" 
    rel="noopener noreferrer"
    class="buildable-badge-text"
  >
    Built with Buildable Labs
  </a>
</div>
`;
}

// Inject branding into HTML for free plans
function injectBranding(html: string, shouldInject: boolean): string {
  if (!shouldInject) return html;
  
  const brandingScript = generateBrandingScript();
  return html.replace('</body>', `${brandingScript}\n</body>`);
}

export function usePublishSystem(projectId: string | undefined) {
  const { user } = useAuth();
  const { subscription } = useCredits();
  const queryClient = useQueryClient();
  const [publishState, setPublishState] = useState<ProjectState>('draft');

  // Check if user is on free plan (needs branding)
  const isFreeplan = !subscription || subscription.plan_type === 'free';

  // Fetch current publish state
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-publish-state', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Publish mutation - now uploads to storage
  const publishMutation = useMutation({
    mutationFn: async (previewHtml: string): Promise<PublishResult> => {
      if (!projectId || !user || !project) {
        throw new Error('Missing required data');
      }

      setPublishState('publishing');

      // Step 1: Generate subdomain
      const subdomain = generateSubdomain(project.name);
      const deployedUrl = generateProjectUrl(subdomain);
      
      // Step 2: Inject branding for free plans
      const productionHtml = injectBranding(previewHtml, isFreeplan);
      
      // Step 3: Upload HTML to storage
      const storagePath = `${user.id}/${projectId}/index.html`;
      const htmlBlob = new Blob([productionHtml], { type: 'text/html' });
      
      const { error: uploadError } = await supabase
        .storage
        .from('published-sites')
        .upload(storagePath, htmlBlob, {
          contentType: 'text/html',
          upsert: true,
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload site: ' + uploadError.message);
      }
      
      // Step 4: Update project with subdomain and deployed URL
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          subdomain,
          deployed_url: deployedUrl,
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update project: ' + updateError.message);
      }
      
      // Step 5: Create build record
      const { error: buildError } = await supabase
        .from('project_builds')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: 3,
          build_logs: `✓ Build completed successfully
✓ Uploaded to storage: ${storagePath}
✓ Deployed to: ${deployedUrl}
${isFreeplan ? '✓ Branding badge injected (Free plan)' : '✓ No branding (Paid plan)'}`,
        });
      
      if (buildError) {
        console.error('Build record error:', buildError);
      }

      setPublishState('live');
      
      return {
        success: true,
        deployedUrl,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-publish-state', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      
      toast({
        title: '🚀 Published Successfully!',
        description: `Your project is live at ${result.deployedUrl}`,
      });
    },
    onError: (error) => {
      setPublishState('draft');
      
      toast({
        title: 'Publish Failed',
        description: error instanceof Error ? error.message : 'Failed to publish project',
        variant: 'destructive',
      });
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !user) throw new Error('No project ID');
      
      // Delete from storage
      const storagePath = `${user.id}/${projectId}/index.html`;
      await supabase
        .storage
        .from('published-sites')
        .remove([storagePath]);
      
      // Update project
      const { error } = await supabase
        .from('projects')
        .update({
          deployed_url: null,
          subdomain: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setPublishState('draft');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-publish-state', projectId] });
      
      toast({
        title: 'Project Unpublished',
        description: 'Your project is no longer live.',
      });
    },
  });

  // Publish handler
  const publish = useCallback(async (previewHtml: string) => {
    return publishMutation.mutateAsync(previewHtml);
  }, [publishMutation]);

  // Unpublish handler
  const unpublish = useCallback(async () => {
    return unpublishMutation.mutateAsync();
  }, [unpublishMutation]);

  return {
    // State
    publishState,
    isPublishing: publishMutation.isPending,
    isUnpublishing: unpublishMutation.isPending,
    isLoading,
    
    // Data
    project,
    deployedUrl: project?.deployed_url,
    subdomain: (project as any)?.subdomain,
    isFreeplan,
    
    // Actions
    publish,
    unpublish,
    
    // Branding utilities
    generateBrandingScript,
    injectBranding: (html: string) => injectBranding(html, isFreeplan),
  };
}
