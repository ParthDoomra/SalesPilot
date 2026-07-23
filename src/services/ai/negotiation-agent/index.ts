/**
 * AI Negotiation Agent Service
 *
 * Uses the project's single source of truth (Requirement JSON, Selected Architecture,
 * Pricing Estimate, and Proposal) to produce contextual negotiation strategies,
 * cost optimization suggestions, objection handling, discount tiers, and ROI metrics.
 */

import { getRequirement } from '@/services/firebase/requirements';
import { getArchitectureByProject } from '@/services/firebase/architectures';
import { estimatePricing } from '@/services/ai/pricing';
import { buildProposal } from '@/services/ai/proposal/builder';
import { llm } from '@/services/ai/llm-service';
import type { CloudProvider, RequirementField } from '@/types';

export type NegotiationActionType =
  | 'welcome'
  | 'reduce-cost'
  | 'improve-performance'
  | 'increase-availability'
  | 'simplify-architecture'
  | 'explain-pricing'
  | 'prepare-response';

export interface NegotiationContext {
  projectId: string;
  companyName: string;
  industry: string;
  solutionType: string;
  budgetAmount: number;
  budgetCurrency: string;
  budgetPeriod: string;
  currentMonthlyCost: number;
  selectedProvider: CloudProvider;
  availabilitySLA: string;
  databaseEngine: string;
  storageGb: number;
  servicesList: string[];
  workload: string;
  complianceList: string[];
}

export interface NegotiationResponse {
  answer: string;
  suggestions: string[];
  discountTiers?: Array<{ discountPercent: number; monthlyTotal: number; annualSavings: number; note: string }>;
  tradeOffs?: Array<{ dimension: 'Cost' | 'Performance' | 'Availability'; impact: string; recommendation: string }>;
  quickAction?: NegotiationActionType;
}

export function extractHumanText(content: string): string {
  if (!content) return '';
  const str = content.trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed.message === 'string') return parsed.message;
      if (typeof parsed.answer === 'string') return parsed.answer;
      if (typeof parsed.content === 'string') return parsed.content;
      if (typeof parsed.response === 'string') return parsed.response;
    } catch {
      // Fall through
    }
  }
  return content;
}

function getFieldValueString(field?: RequirementField<unknown>): string {
  if (!field || field.value === null || field.value === undefined) return '';
  if (Array.isArray(field.value)) return field.value.join(', ');
  return String(field.value);
}

function getFieldValueNumber(field?: RequirementField<unknown>): number {
  if (!field || field.value === null || field.value === undefined) return 0;
  const num = Number(field.value);
  return isNaN(num) ? 0 : num;
}

function formatCurrencyDisplay(amount: number, currencyCode: string = 'USD'): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const numFormatted = amount.toLocaleString('en-US');
  if (code === 'INR') {
    return `₹${numFormatted}/month`;
  }
  if (code === 'EUR') {
    return `€${numFormatted}/month`;
  }
  if (code === 'GBP') {
    return `£${numFormatted}/month`;
  }
  return `$${numFormatted}/month`;
}

/**
 * Aggregates full project context across Requirement, Architecture, Pricing, and Proposal.
 */
export async function getProjectNegotiationContext(projectId: string): Promise<NegotiationContext> {
  const requirement = await getRequirement(projectId);
  const architecture = await getArchitectureByProject(projectId);

  const companyName = getFieldValueString(requirement?.company) || 'Client Organization';
  const industry = getFieldValueString(requirement?.industry) || 'General';
  const solutionType = getFieldValueString(requirement?.solutionType) || 'Cloud Solution';
  const budgetAmount = getFieldValueNumber(requirement?.budget);
  const budgetCurrency = getFieldValueString(requirement?.budgetCurrency) || 'USD';
  const budgetPeriod = getFieldValueString(requirement?.budgetPeriod) || 'monthly';
  const availabilitySLA = getFieldValueString(requirement?.availability) || '99.9% SLA';
  const databaseEngine = getFieldValueString(requirement?.database) || 'PostgreSQL';
  const storageGb = getFieldValueNumber(requirement?.storage) || 500;
  const workload = getFieldValueString(requirement?.workload) || 'Production Business App';

  const rawCompliance = requirement?.compliance?.value;
  const complianceList = Array.isArray(rawCompliance)
    ? rawCompliance.map(String)
    : rawCompliance
    ? [String(rawCompliance)]
    : ['SOC 2', 'ISO 27001'];

  const selectedProvider = architecture?.selectedProvider || 'Azure';
  const selectedOption = architecture?.options.find((o) => o.id === architecture.selectedOptionId) || architecture?.options[0];

  let currentMonthlyCost = budgetAmount || 12000;
  if (selectedOption?.costEstimateRange) {
    const matches = selectedOption.costEstimateRange.match(/\$?([0-9,]+)/);
    if (matches && matches[1]) {
      const num = parseInt(matches[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0) currentMonthlyCost = num;
    }
  }

  let servicesList: string[] = selectedOption?.services.map((s) => `${s.name} (${s.category})`) || ['Virtual Machines', 'Managed Database', 'Cloud Storage'];

  if (requirement && architecture) {
    try {
      const pricing = estimatePricing(architecture, requirement);
      const selOpt = pricing.options.find((o) => o.optionId === pricing.selectedOptionId) || pricing.options[0];
      if (selOpt?.monthlyCost) {
        currentMonthlyCost = selOpt.monthlyCost;
      }
    } catch {
      // Fallback to option cost
    }
  }

  return {
    projectId,
    companyName,
    industry,
    solutionType,
    budgetAmount,
    budgetCurrency,
    budgetPeriod,
    currentMonthlyCost,
    selectedProvider,
    availabilitySLA,
    databaseEngine,
    storageGb,
    servicesList,
    workload,
    complianceList,
  };
}

/**
 * Executes a negotiation query or quick action using project-specific context.
 */
export async function generateNegotiationResponse(
  projectId: string,
  userMessage: string,
  actionType?: NegotiationActionType
): Promise<NegotiationResponse> {
  const ctx = await getProjectNegotiationContext(projectId);

  const formattedCost = formatCurrencyDisplay(ctx.currentMonthlyCost, ctx.budgetCurrency);
  const formattedBudget = ctx.budgetAmount > 0 ? formatCurrencyDisplay(ctx.budgetAmount, ctx.budgetCurrency) : 'Not explicitly specified';
  const isOverBudget = ctx.budgetAmount > 0 && ctx.currentMonthlyCost > ctx.budgetAmount;
  const budgetStatusText = ctx.budgetAmount > 0 ? (isOverBudget ? '⚠️ Over Budget' : '✅ Within Budget') : 'ℹ️ Budget Unspecified';

  // Calculate discount tiers based on actual project monthly cost
  const discountTiers = [5, 10, 15, 20].map((pct) => {
    const monthlyTotal = Math.round(ctx.currentMonthlyCost * (1 - pct / 100));
    const monthlySavings = Math.round(ctx.currentMonthlyCost * (pct / 100));
    const annualSavings = monthlySavings * 12;
    return {
      discountPercent: pct,
      monthlyTotal,
      annualSavings,
      note: pct >= 15 ? 'Requires 3-year commitment or enterprise agreement' : 'Standard volume commitment discount',
    };
  });

  // Welcome summary prompt
  if (actionType === 'welcome' || (!userMessage.trim() && !actionType)) {
    return generateFallbackNegotiationResponse(ctx, 'welcome', 'welcome', discountTiers);
  }

  const promptContext = `
You are SalesPilot's AI Sales Engineer assisting a Sales Engineer during client negotiations.
You MUST speak in clear, non-technical, simple business English while directly referencing the REAL PROJECT DATA:
- Client Company: ${ctx.companyName} (${ctx.industry} industry)
- Solution Type: ${ctx.solutionType} (${ctx.workload})
- Selected Cloud Provider: ${ctx.selectedProvider}
- Current Estimated Monthly Cost: ${formattedCost}
- Client Stated Budget: ${formattedBudget}
- Budget Status: ${budgetStatusText}
- Target SLA & Availability: ${ctx.availabilitySLA}
- Database Engine: ${ctx.databaseEngine}
- Storage Size: ${ctx.storageGb} GB
- Provisioned Services: ${ctx.servicesList.join(', ')}
- Compliance Requirements: ${ctx.complianceList.join(', ')}

Sales Engineer Query / Request: "${userMessage}"

INSTRUCTIONS:
1. Speak as an expert AI Sales Engineer helping the user negotiate with the client.
2. Structure your response into clear business sections:
   - 🎯 **Recommendation**: Executive summary of what to propose.
   - ⚖️ **Trade-offs & Customer Impact**: Business impact on performance, uptime, or security.
   - 💡 **Estimated Savings & Pricing Options**: Specific monetary figures formatted cleanly (${ctx.budgetCurrency === 'INR' ? '₹X/month' : '$X/month'}). Never format currency as "INR $X".
   - 💬 **Suggested Customer Talking Points**: Exact words the sales engineer can use in client meetings.
3. Use simple business English (avoid overly dense engineering jargon).
4. If asked to reduce cost by a percentage (e.g. 20%) or fit a budget (e.g. ₹2 lakh/month), calculate the exact new target amount and explain what architectural changes allow achieving it.
5. If asked for three pricing options (Budget, Recommended, Premium), outline all 3 clearly with costs, features, and trade-offs.
`;

  try {
    const res = await llm.complete(promptContext, {
      systemPrompt:
        'You are an expert AI Sales Engineer for cloud solution architecture and enterprise negotiations. You speak in simple business English and explain recommendations, trade-offs, estimated savings, and customer impact using real project numbers.',
      temperature: 0.3,
    });

    if (res.content) {
      const cleanText = extractHumanText(res.content);
      return buildStructuredNegotiationResponse(cleanText, ctx, discountTiers, actionType);
    }
  } catch {
    // Fallback heuristic response engine
  }

  return generateFallbackNegotiationResponse(ctx, userMessage, actionType, discountTiers);
}

function buildStructuredNegotiationResponse(
  aiText: string,
  ctx: NegotiationContext,
  discountTiers: Array<{ discountPercent: number; monthlyTotal: number; annualSavings: number; note: string }>,
  actionType?: NegotiationActionType
): NegotiationResponse {
  const suggestions = [
    'Reduce cost by 20%',
    'Customer prefers Azure',
    'Customer budget is ₹2 lakh/month',
    'Explain why this service is required',
    'Suggest cheaper alternatives',
    'Compare AWS vs Azure',
    'Prepare answers to customer objections',
    'Generate a negotiation strategy',
    'Create three pricing options (Budget, Recommended, Premium)',
  ];

  return {
    answer: aiText,
    suggestions,
    discountTiers,
    quickAction: actionType,
  };
}

function generateFallbackNegotiationResponse(
  ctx: NegotiationContext,
  userMessage: string,
  actionType: NegotiationActionType | undefined,
  discountTiers: Array<{ discountPercent: number; monthlyTotal: number; annualSavings: number; note: string }>
): NegotiationResponse {
  const lowerQuery = userMessage.toLowerCase();
  const formattedCost = formatCurrencyDisplay(ctx.currentMonthlyCost, ctx.budgetCurrency);
  const formattedBudget = ctx.budgetAmount > 0 ? formatCurrencyDisplay(ctx.budgetAmount, ctx.budgetCurrency) : 'Not explicitly set';
  const isOver = ctx.budgetAmount > 0 && ctx.currentMonthlyCost > ctx.budgetAmount;
  const budgetStatusText = ctx.budgetAmount > 0 ? (isOver ? '⚠️ Over Budget' : '✅ Within Budget') : 'ℹ️ Budget Not Stated';

  let answer = '';

  if (actionType === 'welcome' || lowerQuery === 'welcome') {
    const budgetOptCost = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 0.78), ctx.budgetCurrency);
    const recOptCost = formattedCost;
    const premOptCost = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 1.35), ctx.budgetCurrency);

    answer = `👋 **Welcome to the AI Sales Engineer Negotiation Assistant**

Here is the current commercial & technical summary for **${ctx.companyName}**:

📊 **Project Financial Summary**:
- **Current Monthly Cost**: **${formattedCost}**
- **Customer Stated Budget**: **${formattedBudget}**
- **Budget Status**: **${budgetStatusText}**

---

💡 **Three Negotiation Options**:

1. 🥉 **Budget Option** (${budgetOptCost}):
   - *Included*: Single-AZ deployment, standard compute, baseline ${ctx.databaseEngine}.
   - *SLA*: 99.5% uptime.
   - *Best For*: Tight budget alignment or initial trial deployment.

2. 🥈 **Recommended Option** (${recOptCost}) — *Current Architecture*:
   - *Included*: Multi-AZ deployment, managed ${ctx.databaseEngine} with automated backups, full ${ctx.complianceList.join(', ')} compliance.
   - *SLA*: 99.9% uptime.
   - *Best For*: Optimal balance of speed, high availability, and security.

3. 🥇 **Premium Option** (${premOptCost}):
   - *Included*: Multi-Region failover, high-IOPS database, 24/7 dedicated enterprise support.
   - *SLA*: 99.99% uptime.
   - *Best For*: Mission-critical high-traffic workloads.

---

🎯 **Recommended Strategy**:
> We recommend presenting the **Recommended Option (${recOptCost})** as the default proposal because it satisfies ${ctx.companyName}'s compliance (${ctx.complianceList.join(', ')}) and ${ctx.availabilitySLA} uptime goals. ${isOver ? `Since this is currently over budget, we can offer a **15% discount** (${formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 0.85), ctx.budgetCurrency)}) by securing a 1-year Reserved Instance commitment.` : 'It comfortably aligns with the client budget.'}

How would you like to proceed? Select a suggested strategy below or type a custom question!`;
  } else if (lowerQuery.includes('20%') || lowerQuery.includes('reduce cost by 20')) {
    const target20 = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 0.8), ctx.budgetCurrency);
    const savings20 = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 0.2), ctx.budgetCurrency);
    answer = `🎯 **Recommendation**: Reduce ${ctx.companyName}'s monthly cloud expenditure by 20% to **${target20}** (saving **${savings20}**).

💡 **How We Achieve 20% Savings**:
1. **Commit to 1-Year Reserved Instances**: Committing baseline compute and ${ctx.databaseEngine} database nodes yields an instant 15% discount.
2. **Automate Data Archival**: Move older logs and backups to cold cloud storage after 30 days.

⚖️ **Trade-offs & Customer Impact**:
- No change to system performance or capacity.
- Requires 1-year contract commitment.

💬 **Suggested Customer Talking Point**:
> *"By committing to a 1-year savings plan for baseline servers, we can lower your monthly investment to ${target20} without sacrificing any performance or security."*`;
  } else if (lowerQuery.includes('azure') || lowerQuery.includes('prefers azure')) {
    answer = `🎯 **Recommendation**: Align solution architecture to **Microsoft Azure** for ${ctx.companyName}.

💡 **Business Alignment & Savings**:
- If ${ctx.companyName} uses Windows Server or SQL Server, Azure Hybrid Benefit saves up to **40% on licensing costs**.
- Native integration with Microsoft Entra ID (Azure AD) simplifies security.

⚖️ **Trade-offs & Customer Impact**:
- Zero application code rewrites required.
- Simplified single-vendor billing if client already holds a Microsoft Enterprise Agreement.

💬 **Suggested Customer Talking Point**:
> *"Moving this workload to Azure allows us to apply your existing Microsoft enterprise licensing discounts, lowering your ongoing running costs while keeping authentication in your current Azure Active Directory."*`;
  } else if (lowerQuery.includes('lakh') || lowerQuery.includes('2 lakh')) {
    const targetLakh = formatCurrencyDisplay(200000, 'INR');
    answer = `🎯 **Recommendation**: Adapt architecture to fit a **${targetLakh}** budget limit for ${ctx.companyName}.

💡 **Budget Optimization Plan**:
1. **Right-size Database Instance**: Use burstable compute nodes for ${ctx.databaseEngine} during non-peak hours.
2. **Single Region Deployment**: Keep compute and storage within the primary region to eliminate cross-region bandwidth charges.

⚖️ **Trade-offs & Customer Impact**:
- SLA remains at 99.9% uptime during standard business hours.
- Saves ~25% compared to multi-region redundant architecture.

💬 **Suggested Customer Talking Point**:
> *"We can comfortably fit within your ${targetLakh} budget target by tailoring standby server redundancy to match your actual operating hours."*`;
  } else if (lowerQuery.includes('pricing options') || lowerQuery.includes('three pricing')) {
    const budgetTotal = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 0.78), ctx.budgetCurrency);
    const recTotal = formattedCost;
    const premiumTotal = formatCurrencyDisplay(Math.round(ctx.currentMonthlyCost * 1.35), ctx.budgetCurrency);

    answer = `🎯 **Recommendation**: Present 3 Tiered Options to ${ctx.companyName}:

### 1. 🥉 Budget Option (${budgetTotal})
- **Included**: Single-AZ compute, baseline ${ctx.databaseEngine}, standard storage.
- **SLA**: 99.5% uptime.
- **Best For**: Cost-conscious initial rollout.

### 2. 🥈 Recommended Option (${recTotal}) — *Current Proposal*
- **Included**: Multi-AZ compute, managed ${ctx.databaseEngine} with automated backups, full compliance (${ctx.complianceList.join(', ')}).
- **SLA**: 99.9% uptime.
- **Best For**: Optimal balance of reliability, speed, and cost.

### 3. 🥇 Premium Option (${premiumTotal})
- **Included**: Multi-Region active-passive failover, dedicated high-IOPS database, 24/7 priority enterprise support.
- **SLA**: 99.99% uptime.
- **Best For**: Mission-critical high-traffic scale.`;
  } else if (lowerQuery.includes('objection') || lowerQuery.includes('objections')) {
    answer = `🎯 **Recommendation**: Objections Playbook for ${ctx.companyName}:

#### 1. Objection: *"Your price is higher than our internal estimate."*
- **Talking Point**: *"Our estimate includes fully managed ${ctx.databaseEngine} and automated backups, which eliminates the need to hire dedicated database administrators—saving you significant staffing costs."*

#### 2. Objection: *"We aren't sure about committing to a 3-year plan."*
- **Talking Point**: *"We can start on a flexible 1-year agreement, which secures a 15% discount immediately while preserving your flexibility to adjust instance sizes as user demand grows."*`;
  } else {
    answer = `🎯 **Recommendation**: Sales Engineer Strategy for ${ctx.companyName}

**Current Proposal**: ${formattedCost} on **${ctx.selectedProvider}**  
**Stated Customer Budget**: ${formattedBudget}  
**Budget Status**: ${budgetStatusText}  

💡 **Key Business Strengths of Our Solution**:
1. **Fully Managed Operations**: Includes managed ${ctx.databaseEngine} and ${ctx.storageGb} GB cloud storage, removing administrative burden from the client team.
2. **Security & Compliance**: Built natively for ${ctx.complianceList.join(', ')} standards and ${ctx.availabilitySLA} uptime reliability.

⚖️ **Trade-offs & Customer Impact**:
- Choosing Reserved Instances offers 20-30% cost reduction in exchange for annual commitment.
- Single-region setup minimizes bandwidth charges while keeping 99.9% uptime.

💬 **Suggested Customer Talking Point**:
> *"This architecture was specifically designed for ${ctx.companyName} to provide ${ctx.availabilitySLA} uptime and full ${ctx.complianceList.join(', ')} compliance without over-provisioning unused capacity."*`;
  }

  return {
    answer,
    suggestions: [
      'Reduce cost by 20%',
      'Customer prefers Azure',
      'Customer budget is ₹2 lakh/month',
      'Explain why this service is required',
      'Suggest cheaper alternatives',
      'Compare AWS vs Azure',
      'Prepare answers to customer objections',
      'Generate a negotiation strategy',
      'Create three pricing options (Budget, Recommended, Premium)',
    ],
    discountTiers,
    quickAction: actionType,
  };
}
