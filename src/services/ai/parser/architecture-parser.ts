/**
 * Architecture Parser
 *
 * Extracts and parses LLM JSON outputs into typed ArchitectureOption structures.
 * Provides resilient fallbacks if LLM output has formatting quirks.
 */

import type { ArchitectureOption, CloudProvider, CloudServiceNode, ServiceCategory } from '@/types';
import { extractJSON } from './requirement-parser';
import { parserLogger } from '@/utils/logger';

export function parseArchitectureResponse(
  rawResponse: string,
  provider: CloudProvider,
): ArchitectureOption[] | null {
  try {
    const jsonStr = extractJSON(rawResponse);
    const parsed = JSON.parse(jsonStr) as { options?: unknown[] };

    if (!parsed || !Array.isArray(parsed.options)) {
      parserLogger.warn('Parsed response does not contain an options array');
      return null;
    }

    const options: ArchitectureOption[] = [];

    for (const rawOpt of parsed.options) {
      if (!rawOpt || typeof rawOpt !== 'object') continue;
      const opt = rawOpt as Record<string, unknown>;

      const id = String(opt.id || `opt_${Math.random().toString(36).slice(2, 7)}`);
      const name = String(opt.name || 'Cloud Solution Architecture');
      const type = (['performance', 'balanced', 'budget'].includes(String(opt.type))
        ? String(opt.type)
        : 'balanced') as ArchitectureOption['type'];

      const starRating = typeof opt.starRating === 'number' ? opt.starRating : 4;
      const badgeText = String(opt.badgeText || (type === 'performance' ? 'High Scale' : type === 'budget' ? 'Cost Optimized' : 'Recommended'));
      const costEstimateRange = String(opt.costEstimateRange || '₹2,50,000 - ₹3,00,000 / mo');
      const confidence = typeof opt.confidence === 'number' ? Math.min(100, Math.max(50, opt.confidence)) : 90;
      const description = String(opt.description || 'Cloud solution architecture custom-tailored for your workload requirements.');
      const recommendationReason = String(opt.recommendationReason || 'Selected based on workload scale and reliability requirements.');

      // Parse services
      const services: CloudServiceNode[] = [];
      if (Array.isArray(opt.services)) {
        for (const rawSrv of opt.services) {
          if (!rawSrv || typeof rawSrv !== 'object') continue;
          const srv = rawSrv as Record<string, unknown>;
          services.push({
            id: String(srv.id || `srv_${Math.random().toString(36).slice(2, 7)}`),
            name: String(srv.name || `${provider} Service`),
            provider,
            category: (srv.category || 'Compute') as ServiceCategory,
            tier: String(srv.tier || 'Standard'),
            reason: String(srv.reason || 'Provides managed infrastructure for workload requirements.'),
            confidence: typeof srv.confidence === 'number' ? Math.min(100, Math.max(50, srv.confidence)) : 90,
            estimatedMonthlyCostRange: srv.estimatedMonthlyCostRange ? String(srv.estimatedMonthlyCostRange) : undefined,
          });
        }
      }

      // Parse visual flow nodes
      const visualFlowNodes: ArchitectureOption['visualFlowNodes'] = [];
      if (Array.isArray(opt.visualFlowNodes)) {
        for (const rawNode of opt.visualFlowNodes) {
          if (!rawNode || typeof rawNode !== 'object') continue;
          const n = rawNode as Record<string, unknown>;
          visualFlowNodes.push({
            id: String(n.id || `f_${Math.random().toString(36).slice(2, 7)}`),
            label: String(n.label || 'Component'),
            category: (n.category || 'Compute') as ServiceCategory,
            serviceName: String(n.serviceName || 'Service'),
            connectedTo: Array.isArray(n.connectedTo) ? n.connectedTo.map(String) : undefined,
          });
        }
      }

      options.push({
        id,
        name,
        type,
        starRating,
        badgeText,
        costEstimateRange,
        confidence,
        description,
        recommendationReason,
        services,
        visualFlowNodes,
      });
    }

    return options.length > 0 ? options : null;
  } catch (err) {
    parserLogger.error('Failed to parse architecture response', { error: String(err) });
    return null;
  }
}
