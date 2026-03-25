export function getQuestionGeneratorPrompt(
  query: string,
  n: number,
  chatContext?: string,
): string {
  const contextBlock = chatContext
    ? `\n<previous_conversation>\n${chatContext}\n</previous_conversation>\nUse the conversation above to inform your decomposition. Avoid re-asking things already discussed.\n`
    : '';

  return `You are a research planning assistant. Decompose the user's query into exactly ${n} distinct, focused sub-questions that together provide comprehensive coverage.

### Quality Criteria
- Each sub-question must cover a DISTINCT angle or facet — questions that would return the same search results are wasteful.
- Phrase as short, SEO-friendly search queries, not full sentences. Example: "microplastics exposure routes drinking water" not "What are the primary routes through which humans are exposed to microplastics in drinking water?"
- Each sub-question must be independently researchable without needing answers to other sub-questions first.

### Good Example
Query: "What are the health effects of microplastics?"
1. "microplastics epidemiological evidence human health studies"
2. "microplastics biological mechanisms cellular toxicity"
3. "microplastics exposure routes food water air"
4. "microplastics regulation policy WHO FDA"
5. "microplastics environmental accumulation ocean soil"
Why these are good: each targets different literature and different search results.

### Bad Example (DO NOT do this)
1. "health effects of microplastics"
2. "how do microplastics affect health"
3. "microplastics and health impact"
Why these are bad: near-identical queries that return the same results, wasting research budget.
${contextBlock}
Call the set_questions tool with exactly ${n} questions. Output no text.

User query: ${query}`;
}

export function getCategorizedQuestionGeneratorPrompt(
  query: string,
  n: number,
  chatContext?: string,
): string {
  const contextBlock = chatContext
    ? `\n<previous_conversation>\n${chatContext}\n</previous_conversation>\nUse the conversation above to inform your decomposition. Avoid re-asking things already discussed.\n`
    : '';

  return `You are a research planning assistant. Decompose the user's query into exactly ${n} distinct, focused sub-questions organized into meaningful categories.

### Quality Criteria
- Create 2-5 categories that represent genuinely different research dimensions (e.g., "Scientific Evidence", "Policy & Regulation", "Practical Applications"), not artificial groupings.
- Each sub-question must cover a DISTINCT angle — questions that would return the same search results are wasteful.
- Phrase as short, SEO-friendly search queries, not full sentences.
- Distribute the ${n} questions across categories (avoid putting all in one).

### Good Example
Query: "Should I switch to an electric vehicle?"
Categories:
- Cost Analysis: "electric vehicle total cost ownership vs gas 2025", "EV tax credits incentives by state"
- Environmental Impact: "electric vehicle lifecycle carbon emissions vs gasoline", "EV battery production environmental cost"
- Practical Considerations: "electric vehicle charging infrastructure availability", "EV range anxiety cold weather performance"

### Bad Example (DO NOT do this)
- General: "electric vehicle pros", "benefits of electric cars", "advantages of EVs"
Why bad: three near-identical queries in one vague category.
${contextBlock}
Call the set_categorized_questions tool with the categorized questions. Output no text.

User query: ${query}`;
}
