import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Lock,
  Users,
  Image,
  Sparkles,
  Check,
  HelpCircle,
  Upload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePublishSystem } from '@/hooks/usePublishSystem';
import { toast } from '@/hooks/use-toast';

interface PublishDropdownProps {
  projectId: string;
  projectName: string;
  previewHtml: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PublishDropdown({
  projectId,
  projectName,
  previewHtml,
  isOpen,
  onOpenChange,
}: PublishDropdownProps) {
  const {
    publish,
    isPublishing,
    deployedUrl,
    isFreeplan,
  } = usePublishSystem(projectId);

  const [subdomain, setSubdomain] = useState(
    projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  );
  const [isEditingSubdomain, setIsEditingSubdomain] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'everyone' | 'private'>('everyone');
  const [isWebsiteInfoOpen, setIsWebsiteInfoOpen] = useState(false);
  const [siteTitle, setSiteTitle] = useState(projectName);
  const [siteDescription, setSiteDescription] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  const expectedUrl = `https://${subdomain}.buildablelabs.dev`;

  const handlePublish = async () => {
    try {
      const result = await publish(previewHtml);
      if (result.success) {
        setPublishSuccess(true);
        toast({
          title: 'Published!',
          description: 'Your project is now live.',
        });
      }
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(expectedUrl);
    toast({
      title: 'Copied!',
      description: 'URL copied to clipboard',
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          className="h-8 px-3 text-xs font-medium gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Publish
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-zinc-900 border-zinc-700">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Publish your app</span>
              {deployedUrl && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Live
                </Badge>
              )}
            </div>
            {deployedUrl && (
              <span className="text-xs text-muted-foreground">0 Visitors</span>
            )}
          </div>

          {/* Published URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Published URL</span>
              <HelpCircle className="h-3 w-3" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Enter your URL, or leave empty to auto-generate.
            </p>
            <div className="flex items-center gap-1 bg-zinc-800 rounded-md border border-zinc-700 px-3 py-2">
              {isEditingSubdomain ? (
                <Input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  onBlur={() => setIsEditingSubdomain(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingSubdomain(false)}
                  className="h-auto p-0 border-0 bg-transparent text-sm focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <span 
                  className="text-sm cursor-pointer hover:text-primary"
                  onClick={() => setIsEditingSubdomain(true)}
                >
                  {subdomain}
                </span>
              )}
              <span className="text-sm text-muted-foreground">.buildablelabs.dev</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 ml-auto"
                onClick={copyUrl}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{subdomain}.buildablelabs.dev</span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Edit domain
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                Manage domains
              </Button>
            </div>
          </div>

          {/* Access Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <span>Who can visit the URL?</span>
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            </div>
            <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as 'everyone' | 'private')}>
              <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Anyone
                  </div>
                </SelectItem>
                <SelectItem value="private" disabled={isFreeplan}>
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                    {isFreeplan && <Badge variant="outline" className="ml-1 text-[8px]">Pro</Badge>}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Website Info Collapsible */}
          <Collapsible open={isWebsiteInfoOpen} onOpenChange={setIsWebsiteInfoOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground">
              <span>Website info</span>
              {isWebsiteInfoOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Icon & Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Icon & title</span>
                    <HelpCircle className="h-3 w-3" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 text-primary">
                    <Sparkles className="h-3 w-3" />
                    Generate with AI
                  </Button>
                </div>
                <div className="flex items-center gap-3 bg-zinc-800 rounded-md border border-zinc-700 p-3">
                  <div className="h-10 w-10 rounded-md bg-zinc-700 flex items-center justify-center text-lg font-bold">
                    B
                  </div>
                  <Input
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="Site title"
                    className="flex-1 h-auto p-0 border-0 bg-transparent text-sm focus-visible:ring-0"
                  />
                </div>
                {isFreeplan && (
                  <p className="text-[10px] text-muted-foreground">
                    Upgrade to Pro to use a custom favicon
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Description</span>
                  <HelpCircle className="h-3 w-3" />
                </div>
                <Textarea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Describe your website..."
                  className="min-h-[80px] bg-zinc-800 border-zinc-700 text-sm resize-none"
                  maxLength={150}
                />
                <div className="text-right text-[10px] text-muted-foreground">
                  {siteDescription.length} / 150
                </div>
              </div>

              {/* Share Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Share image</span>
                    <HelpCircle className="h-3 w-3" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 text-primary">
                    <Sparkles className="h-3 w-3" />
                    Generate with AI
                  </Button>
                </div>
                <div className="h-20 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-md relative">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-5 w-5 absolute top-1 right-1"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            >
              Review security
            </Button>
            <Button 
              size="sm" 
              className="flex-1 h-9 text-xs"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Publishing...
                </>
              ) : publishSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Update
                </>
              ) : (
                'Publish'
              )}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
