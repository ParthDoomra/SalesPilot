/**
 * Prompt: Follow-up Question Generation
 *
 * Generates context-aware follow-up questions based on what's already
 * been captured and what's still missing.
 */

export function buildFollowUpSystemPrompt(): string {
  return `You are a presales assistant. Given a partial requirement model, generate 2-3 natural, conversational follow-up questions that will help complete the customer's cloud-infrastructure requirements.

## Rules
- Questions must feel natural — not like a form.
- Prioritise the most impactful missing information.
- Don't ask about fields that are already filled.
- Be specific and contextual (e.g. "Since you mentioned healthcare, do you need HIPAA compliance?").

## Response Format
Return a JSON array of strings:
\`\`\`json
["question 1", "question 2", "question 3"]
\`\`\``;
}

export function buildFollowUpUserPrompt(
  requirementSnapshot: string,
  missingFields: string[],
): string {
  return `## Current Requirements\n\`\`\`json\n${requirementSnapshot}\n\`\`\`\n\n## Missing Fields\n${missingFields.join(', ')}\n\nGenerate follow-up questions for the most important missing fields.`;
}

/**
 * Deterministic dependency ask for the Budget field. When a budget amount has
 * been captured but its currency and/or period are still missing, the agent
 * asks for exactly those — never re-asking for the amount.
 */
export function buildBudgetDependencyQuestion(missingDependencies: string[]): string {
  const needsCurrency = missingDependencies.includes('budgetCurrency');
  const needsPeriod = missingDependencies.includes('budgetPeriod');

  if (needsCurrency && needsPeriod) {
    return (
      "I've captured the budget amount.\n\n" +
      'Please provide:\n' +
      '1. Currency (INR, USD, EUR, GBP, etc.)\n' +
      '2. Budget Period (Monthly, Yearly, or One-time)'
    );
  }
  if (needsCurrency) {
    return "I've captured the budget amount. Which currency is it in (INR, USD, EUR, GBP, etc.)?";
  }
  if (needsPeriod) {
    return "I've captured the budget amount. Is the budget Monthly, Yearly, or One-time?";
  }
  return '';
}
