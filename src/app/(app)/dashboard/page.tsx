"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import { RecentProjects, LatestPricingReports, ActivityTimeline } from "@/components/dashboard/dashboard-lists";
import { CloudProviderDistribution, ArchitectureTypeDistribution } from "@/components/dashboard/distributions";
import { AIActivityWidget, RecentConversationsWidget } from "@/components/dashboard/side-widgets";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Here's what's moving across your pipeline."
        actions={
          <Button asChild>
            <Link href="/projects">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <StatCards />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <PipelineChart />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <RecentProjects />
              <LatestPricingReports />
            </div>
            <RecentProposals />
          </div>

          <div className="flex flex-col gap-6">
            <AIActivityWidget />
            <CloudProviderDistribution />
            <ArchitectureTypeDistribution />
            <RecentConversationsWidget />
            <ActivityTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}
