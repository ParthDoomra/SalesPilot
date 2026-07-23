"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, User, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectStatusBadge } from '@/components/projects/status-badge';
import { ProjectActivity } from '@/components/projects/project-activity';
import { ProjectSettings } from '@/components/projects/project-settings';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useProjectCurrency } from '@/hooks/use-project-currency';
import { useAuth } from '@/lib/auth';

// Lazy-loaded Phase 2 & 3 workspace components
const WorkspaceLayout = React.lazy(() =>
  import('@/components/workspace/workspace-layout').then((m) => ({
    default: m.WorkspaceLayout,
  })),
);

const RequirementPanel = React.lazy(() =>
  import('@/components/workspace/requirement-panel').then((m) => ({
    default: m.RequirementPanel,
  })),
);

const ArchitectureContainer = React.lazy(() =>
  import('@/components/architecture/architecture-container').then((m) => ({
    default: m.ArchitectureContainer,
  })),
);

const PricingContainer = React.lazy(() =>
  import('@/components/pricing/pricing-container').then((m) => ({
    default: m.PricingContainer,
  })),
);

const ProposalContainer = React.lazy(() =>
  import('@/components/proposal/proposal-container').then((m) => ({
    default: m.ProposalContainer,
  })),
);

const TABS = ['Overview', 'Conversation', 'Requirements', 'Architecture', 'Pricing', 'Proposal', 'Activity', 'Settings'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { projects } = useProjectsStore();
  const { user } = useAuth();
  const project = projects.find((p) => p.id === id);
  const { currency: projectCurrency, formatFromUsd, monthlyEstimateUsd } = useProjectCurrency(id);
  const [activeTab, setActiveTab] = React.useState('Overview');

  // The project owner is the authenticated user's profile name (never a hardcoded value).
  const projectOwner = user?.displayName || user?.fullName || user?.email || 'Unknown';

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default p-16 text-center">
        <h2 className="font-display text-lg font-medium">Project not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or the link is out of date.</p>
        <Button className="mt-5" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push('/projects')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </button>

      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.archived ? 'Archived' : project.status} />
            <Badge variant="neutral">Proposal: {project.proposalStatus}</Badge>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetaStat icon={Building2} label="Customer" value={project.customer} />
        <MetaStat icon={User} label="Project Owner" value={projectOwner} />
        <MetaStat icon={Calendar} label="Last updated" value={project.updatedAt} />
        <MetaStat
          icon={Wallet}
          label="Monthly estimate"
          value={monthlyEstimateUsd > 0 ? formatFromUsd(monthlyEstimateUsd, projectCurrency) : '—'}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Created {project.createdAt}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{project.description}</CardContent>
          </Card>
        </TabsContent>

        {/* Phase 2: Conversation tab — full workspace */}
        <TabsContent value="Conversation">
          <React.Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center p-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                </CardContent>
              </Card>
            }
          >
            <div className="h-[calc(100vh-22rem)] rounded-xl">
              <WorkspaceLayout
                projectId={project.id}
                onGenerateArchitecture={() => setActiveTab('Architecture')}
              />
            </div>
          </React.Suspense>
        </TabsContent>

        {/* Phase 2: Requirements tab — requirement panel */}
        <TabsContent value="Requirements">
          <React.Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center p-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                </CardContent>
              </Card>
            }
          >
            <Card>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-22rem)]">
                  <RequirementPanel projectId={project.id} />
                </div>
              </CardContent>
            </Card>
          </React.Suspense>
        </TabsContent>

        {/* Phase 3: Architecture tab — visual solution canvas & compare cards */}
        <TabsContent value="Architecture">
          <React.Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center p-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                </CardContent>
              </Card>
            }
          >
            <Card className="p-5">
              <ArchitectureContainer
                projectId={project.id}
                onGeneratePricing={() => setActiveTab('Pricing')}
              />
            </Card>
          </React.Suspense>
        </TabsContent>

        {/* Phase 4: Pricing tab — AI cost estimation from the generated architecture */}
        <TabsContent value="Pricing">
          <React.Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center p-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                </CardContent>
              </Card>
            }
          >
            <Card className="p-5">
              <PricingContainer projectId={project.id} />
            </Card>
          </React.Suspense>
        </TabsContent>

        {/* Phase 5: Proposal tab — auto-generated client proposal */}
        <TabsContent value="Proposal">
          <React.Suspense
            fallback={
              <Card>
                <CardContent className="flex items-center justify-center p-20">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                </CardContent>
              </Card>
            }
          >
            <Card className="p-5">
              <ProposalContainer projectId={project.id} />
            </Card>
          </React.Suspense>
        </TabsContent>

        {/* Activity — real timeline derived from project data + recorded events */}
        <TabsContent value="Activity">
          <ProjectActivity projectId={project.id} />
        </TabsContent>

        {/* Settings — functional project settings + danger zone */}
        <TabsContent value="Settings">
          <ProjectSettings project={project} />
        </TabsContent>

        {/* Placeholder tabs for future phases */}
        {TABS.filter((t) => !['Overview', 'Conversation', 'Requirements', 'Architecture', 'Pricing', 'Proposal', 'Activity', 'Settings'].includes(t)).map((t) => (
          <TabsContent key={t} value={t}>
            <PlaceholderTab name={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function MetaStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-medium">{value}</div>
    </Card>
  );
}

const TAB_COPY: Record<string, string> = {
  Architecture: 'A generated cloud architecture diagram and resource breakdown will render here.',
  Pricing: 'Live pricing broken down by compute, storage, networking, and database will appear here.',
  Proposal: 'The exportable proposal — diagrams, BOM, and pricing — will be assembled here.',
  Activity: 'A timeline of edits, comments, and status changes for this project will show here.',
  Settings: 'Per-project settings such as visibility and integrations will live here.',
};

function PlaceholderTab({ name }: { name: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <h3 className="font-display text-base font-medium">{name}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{TAB_COPY[name]}</p>
      </CardContent>
    </Card>
  );
}
