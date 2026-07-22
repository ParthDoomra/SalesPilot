/**
 * ArchitectureCanvas — Visual node flowchart displaying network and service dependencies.
 */

"use client";

import * as React from 'react';
import { ArrowRight, Server, Database, Cloud, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceCategory } from '@/types';

interface FlowNode {
  id: string;
  label: string;
  category: ServiceCategory;
  serviceName: string;
  connectedTo?: string[];
}

interface ArchitectureCanvasProps {
  nodes: FlowNode[];
  provider: string;
}

const CATEGORY_ICONS: Record<ServiceCategory, React.ComponentType<{ className?: string }>> = {
  Compute: Cpu,
  Database: Database,
  Storage: Cloud,
  Networking: Server,
  Security: ShieldAlert,
  Management: Server,
  'Backup & DR': ShieldAlert,
};

export function ArchitectureCanvas({ nodes, provider }: ArchitectureCanvasProps) {
  return (
    <div className="rounded-xl border border-border-subtle bg-background/50 schema-grid p-6">
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:flex-wrap">
        {nodes.map((node, index) => {
          const Icon = CATEGORY_ICONS[node.category] || Server;
          const isLast = index === nodes.length - 1;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex flex-col w-48 rounded-xl border bg-surface p-3.5 shadow-sm transition-all duration-300 hover:border-signal/50 hover:shadow-md",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-signal-soft p-1.5 text-signal">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {node.category}
                    </span>
                  </div>

                  <h5 className="mt-2.5 font-display text-sm font-semibold text-foreground">
                    {node.label}
                  </h5>

                  <p className="mt-0.5 text-xs text-muted-foreground/80 truncate">
                    {provider} {node.serviceName}
                  </p>
                </div>
              </div>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex items-center justify-center text-muted-foreground/30">
                  <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
