/**
 * Intelligent Mock LLM Provider
 *
 * Used when no API key is provided (or LLM_PROVIDER=mock).
 * Uses rule-based NLP heuristic extraction to parse requirements from user input
 * and handles "I don't know / your choice / recommend for me" requests with
 * industry-standard enterprise defaults.
 */

import type { LLMProvider, LLMCompletionOptions, LLMCompletionResult, LLMStreamChunk } from '@/types';

export class MockProvider implements LLMProvider {
  async complete(prompt: string, options?: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const extracted: Record<string, { value: unknown; confidence: number }> = {};
    const followUps: string[] = [];

    // Parse the user text from prompt
    const userTextMatch = prompt.match(/## Customer's Latest Message\s*\n([\s\S]*)/i);
    const userText = userTextMatch ? userTextMatch[1].trim() : prompt;
    const textLower = userText.toLowerCase();

    // Check if user is asking for recommendations or expressing uncertainty
    const isUncertain = textLower.includes("don't know") ||
      textLower.includes("dont know") ||
      textLower.includes("not sure") ||
      textLower.includes("your choice") ||
      textLower.includes("you choose") ||
      textLower.includes("you decide") ||
      textLower.includes("recommend") ||
      textLower.includes("default") ||
      textLower.includes("suggest");

    // 1. Solution Type
    if (textLower.includes('erp')) {
      extracted.solutionType = { value: 'ERP System', confidence: 95 };
    } else if (textLower.includes('crm')) {
      extracted.solutionType = { value: 'CRM Platform', confidence: 95 };
    } else if (textLower.includes('data lake') || textLower.includes('analytics')) {
      extracted.solutionType = { value: 'Data Lake & Analytics', confidence: 90 };
    } else if (textLower.includes('e-commerce') || textLower.includes('ecommerce')) {
      extracted.solutionType = { value: 'E-Commerce Platform', confidence: 95 };
    } else if (textLower.includes('banking') || textLower.includes('core banking')) {
      extracted.solutionType = { value: 'Core Banking Platform', confidence: 95 };
    } else if (textLower.includes('patient records') || textLower.includes('hipaa')) {
      extracted.solutionType = { value: 'Healthcare EMR', confidence: 90 };
    }

    // 2. Employees / Users
    const employeeMatch = userText.match(/(\d[\d,]*)\s*(employees|staff|people|headcount)/i);
    if (employeeMatch) {
      const count = parseInt(employeeMatch[1].replace(/,/g, ''), 10);
      extracted.employees = { value: count, confidence: 95 };
    }

    const userMatch = userText.match(/(\d[\d,]*)\s*(users|seats|concurrent|licenses)/i);
    if (userMatch) {
      const count = parseInt(userMatch[1].replace(/,/g, ''), 10);
      extracted.users = { value: count, confidence: 95 };
    } else if (employeeMatch && !extracted.users) {
      const count = parseInt(employeeMatch[1].replace(/,/g, ''), 10);
      extracted.users = { value: count, confidence: 80 };
    }

    // 3. Region — word-boundary matches so "users"/"because" don't false-trigger.
    if (/\bindia\b/.test(textLower)) {
      extracted.region = { value: 'India', confidence: 95 };
    } else if (/\bmulti-?region\b/.test(textLower)) {
      extracted.region = { value: 'Multi-Region Global', confidence: 90 };
    } else if (/\b(us|usa|united states|america)\b/.test(textLower)) {
      extracted.region = { value: 'United States', confidence: 90 };
    } else if (/\b(europe|eu|emea)\b/.test(textLower)) {
      extracted.region = { value: 'Europe', confidence: 90 };
    } else if (/\b(apac|asia|asia pacific)\b/.test(textLower)) {
      extracted.region = { value: 'Asia Pacific', confidence: 90 };
    }

    // 4. Budget & Currency
    const inrMatch = userText.match(/(?:₹|inr|rs\.?)\s*(\d[\d,]*)(?:\s*\/\s*(month|mo|year|yr))?/i);
    const usdMatch = userText.match(/(?:\$|usd)\s*(\d[\d,]*)(?:\s*\/\s*(month|mo|year|yr))?/i);

    if (inrMatch) {
      extracted.budget = { value: parseInt(inrMatch[1].replace(/,/g, ''), 10), confidence: 95 };
      extracted.budgetCurrency = { value: 'INR', confidence: 98 };
      const period = inrMatch[2]?.toLowerCase().startsWith('y') ? 'yearly' : 'monthly';
      extracted.budgetPeriod = { value: period, confidence: 90 };
    } else if (usdMatch) {
      extracted.budget = { value: parseInt(usdMatch[1].replace(/,/g, ''), 10), confidence: 95 };
      extracted.budgetCurrency = { value: 'USD', confidence: 98 };
      const period = usdMatch[2]?.toLowerCase().startsWith('y') ? 'yearly' : 'monthly';
      extracted.budgetPeriod = { value: period, confidence: 90 };
    }

    // 5. Cloud Provider
    if (textLower.includes('aws') || textLower.includes('amazon')) {
      extracted.cloudProvider = { value: 'AWS', confidence: 95 };
    } else if (textLower.includes('azure') || textLower.includes('microsoft')) {
      extracted.cloudProvider = { value: 'Azure', confidence: 95 };
    } else if (textLower.includes('gcp') || textLower.includes('google cloud')) {
      extracted.cloudProvider = { value: 'GCP', confidence: 95 };
    }

    // 6. Compliance & Security
    const compliances: string[] = [];
    if (textLower.includes('hipaa')) compliances.push('HIPAA');
    if (textLower.includes('soc2') || textLower.includes('soc 2')) compliances.push('SOC 2');
    if (textLower.includes('gdpr')) compliances.push('GDPR');
    if (textLower.includes('pci')) compliances.push('PCI-DSS');
    if (textLower.includes('iso')) compliances.push('ISO 27001');

    if (compliances.length > 0) {
      extracted.compliance = { value: compliances, confidence: 95 };
      extracted.security = { value: 'High / Enterprise Grade', confidence: 85 };
    }

    // 7. Database
    if (textLower.includes('postgres') || textLower.includes('postgresql')) {
      extracted.database = { value: 'PostgreSQL', confidence: 95 };
    } else if (textLower.includes('mongo') || textLower.includes('mongodb')) {
      extracted.database = { value: 'MongoDB', confidence: 95 };
    } else if (textLower.includes('mysql')) {
      extracted.database = { value: 'MySQL', confidence: 95 };
    } else if (textLower.includes('dynamodb')) {
      extracted.database = { value: 'DynamoDB', confidence: 95 };
    }

    // 8. Company — explicit "Company: X" label, or a proper noun + legal/entity suffix.
    const companyLabelMatch = userText.match(/\bcompany(?:\s*name)?\s*[:\-]\s*([^\n,.;]{2,60})/i);
    const companySuffixMatch = userText.match(
      /\b([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,3})\s+(?:Inc|LLC|Ltd|Limited|Corp|Corporation|Pvt|Private|Technologies|Systems|Solutions|Industries|Group|Enterprises|Bank)\b/,
    );
    if (companyLabelMatch) {
      extracted.company = { value: companyLabelMatch[1].trim(), confidence: 90 };
    } else if (companySuffixMatch) {
      extracted.company = { value: companySuffixMatch[0].trim(), confidence: 82 };
    }

    // 9. Industry — keyword → normalised vertical.
    const industryMap: Array<[RegExp, string]> = [
      [/\b(healthcare|hospital|clinic|patient|medical|pharma)\b/, 'Healthcare'],
      [/\b(bank|banking|fintech|financial|finance|insurance|lending)\b/, 'Financial Services'],
      [/\b(retail|e-?commerce|ecommerce|store|merchandis)\b/, 'Retail & E-Commerce'],
      [/\b(manufactur|factory|industrial|automotive)\b/, 'Manufacturing'],
      [/\b(education|university|school|edtech|learning)\b/, 'Education'],
      [/\b(logistics|supply chain|shipping|freight|warehous)\b/, 'Logistics'],
      [/\b(telecom|telco|communications)\b/, 'Telecommunications'],
      [/\b(government|public sector|municipal)\b/, 'Government'],
      [/\b(media|entertainment|streaming|publishing)\b/, 'Media & Entertainment'],
      [/\b(energy|oil|gas|utility|utilities|power grid)\b/, 'Energy & Utilities'],
      [/\b(real estate|property|proptech)\b/, 'Real Estate'],
      [/\b(hospitality|hotel|travel|tourism)\b/, 'Hospitality & Travel'],
    ];
    for (const [pattern, value] of industryMap) {
      if (pattern.test(textLower)) {
        extracted.industry = { value, confidence: 85 };
        break;
      }
    }

    // 10. Availability / SLA
    const slaMatch = userText.match(/(\d{2}(?:\.\d{1,2})?)\s*%/);
    if (slaMatch) {
      extracted.availability = { value: `${slaMatch[1]}% SLA`, confidence: 90 };
    } else if (/\bhigh availability|multi-az|multi az|\bha\b/.test(textLower)) {
      extracted.availability = { value: 'High Availability (Multi-AZ)', confidence: 82 };
    }

    // 11. Storage
    if (/\bobject storage|blob|s3\b|data lake\b/.test(textLower)) {
      extracted.storage = { value: 'Object Storage', confidence: 85 };
    } else if (/\bssd|nvme|high performance storage\b/.test(textLower)) {
      extracted.storage = { value: 'High-Performance SSD', confidence: 85 };
    } else if (/\bnas|san|file storage|block storage\b/.test(textLower)) {
      extracted.storage = { value: 'Managed Block / File Storage', confidence: 82 };
    }

    // 12. Networking
    if (/\bvpn|cdn|load balanc|vpc|vnet|private link|firewall|zero trust network\b/.test(textLower)) {
      const parts: string[] = [];
      if (/\bcdn\b/.test(textLower)) parts.push('CDN');
      if (/\bvpn\b/.test(textLower)) parts.push('VPN');
      if (/\bload balanc/.test(textLower)) parts.push('Load Balancer');
      if (/\bvpc|vnet|private link\b/.test(textLower)) parts.push('Private VPC');
      if (/\bfirewall|zero trust network\b/.test(textLower)) parts.push('Firewall / WAF');
      extracted.networking = {
        value: parts.length ? parts.join(' + ') : 'Managed Cloud Networking',
        confidence: 82,
      };
    }

    // 13. Security posture (independent of compliance frameworks)
    if (/\bencryption|aes-256|aes 256|tls|zero trust|waf|iam|mfa|hsm|kms\b/.test(textLower)) {
      extracted.security = { value: 'Enterprise Encryption & Access Control', confidence: 82 };
    }

    // Handle "I don't know / Your choice / Recommend for me"
    if (isUncertain || Object.keys(extracted).length === 0) {
      if (!extracted.cloudProvider) {
        extracted.cloudProvider = { value: 'AWS (Amazon Web Services)', confidence: 85 };
      }
      if (!extracted.database) {
        extracted.database = { value: 'PostgreSQL (Managed RDS)', confidence: 85 };
      }
      if (!extracted.availability) {
        extracted.availability = { value: '99.9% (Multi-AZ Deployment)', confidence: 85 };
      }
      if (!extracted.backup) {
        extracted.backup = { value: 'Daily Automated Snapshots & 30-Day PITR', confidence: 85 };
      }
      if (!extracted.disasterRecovery) {
        extracted.disasterRecovery = { value: 'Cross-Region Backup Replication', confidence: 80 };
      }
      if (!extracted.storage) {
        extracted.storage = { value: 'High Performance SSD (GP3) + S3 Cold Storage', confidence: 80 };
      }
      if (!extracted.security) {
        extracted.security = { value: 'Enterprise TLS 1.3 & AES-256 KMS Encryption', confidence: 85 };
      }
      if (!extracted.compliance) {
        extracted.compliance = { value: ['SOC 2 Type II', 'ISO 27001'], confidence: 80 };
      }
    }

    let replyMsg = '';
    if (isUncertain) {
      replyMsg = `No problem at all! As your presales solution architect, I've selected battle-tested enterprise defaults for your project:

• **Cloud Provider**: AWS (Amazon Web Services) — *Industry standard for scale and elasticity.*
• **Database**: Managed PostgreSQL (Amazon RDS) — *Reliable relational ACID compliance.*
• **Availability**: 99.9% SLA (Multi-AZ Deployment) — *Automatic failover across availability zones.*
• **Backup & DR**: Daily Automated Snapshots with Cross-Region Replication.
• **Security & Compliance**: AES-256 KMS Encryption with SOC 2 / ISO 27001 baselines.

These parameters have been automatically added to your **Requirement Model** on the right. You can modify any of them at any time!`;
    } else {
      replyMsg = `I've analyzed your input and updated your solution architecture requirements:

${Object.entries(extracted).map(([k, v]) => `• **${k}**: ${Array.isArray(v.value) ? v.value.join(', ') : v.value}`).join('\n')}

Would you like to review these settings or customize specific parameters?`;
    }

    if (!extracted.budget) {
      followUps.push('Do you have an estimated monthly or annual budget, or would you like me to generate cost estimates for this setup?');
    }

    const jsonContent = JSON.stringify({
      message: replyMsg,
      extractedFields: extracted,
      followUpQuestions: followUps,
    });

    return {
      content: jsonContent,
      tokensUsed: 200,
      model: 'mock-requirement-agent-v2',
    };
  }

  async *streamComplete(prompt: string, options?: LLMCompletionOptions): AsyncIterable<LLMStreamChunk> {
    const result = await this.complete(prompt, options);
    yield { content: result.content, done: true };
  }
}
