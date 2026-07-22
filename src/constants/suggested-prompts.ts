/**
 * Suggested conversation starters displayed when a conversation is empty.
 */

export interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon: string;  // Lucide icon name
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: 'ERP Deployment',
    prompt: 'We need a cloud-based ERP system for 500 employees in India with high availability.',
    icon: 'Server',
  },
  {
    label: 'Healthcare Platform',
    prompt: 'We are building a HIPAA-compliant patient records system with encrypted storage.',
    icon: 'HeartPulse',
  },
  {
    label: 'E-Commerce',
    prompt: 'I need to architect a multi-region e-commerce platform handling 10,000 concurrent users.',
    icon: 'ShoppingCart',
  },
  {
    label: 'Data Lake',
    prompt: 'We want a centralized data lake for analytics across 140 retail stores with real-time dashboards.',
    icon: 'Database',
  },
  {
    label: 'DevOps Migration',
    prompt: 'We are migrating our CI/CD pipeline to the cloud and need cost-optimised compute and storage.',
    icon: 'GitBranch',
  },
  {
    label: 'Financial Services',
    prompt: 'We need a core banking platform migration with active-active failover across two regions.',
    icon: 'Landmark',
  },
];
