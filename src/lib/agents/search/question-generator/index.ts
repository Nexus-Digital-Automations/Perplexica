import BaseLLM from '@/lib/models/base/llm';
import { ChatTurnMessage, QuestionCategory } from '@/lib/types';
import {
  getQuestionGeneratorPrompt,
  getCategorizedQuestionGeneratorPrompt,
} from '@/lib/prompts/search/question-generator';
import {
  tokenize,
  jaccardSimilarity,
} from '@/lib/verification/textSimilarity';
import z from 'zod';

const SET_QUESTIONS_TOOL = {
  name: 'set_questions',
  description: 'Output the list of sub-questions for the research plan.',
  schema: z.object({
    questions: z.array(z.string()).describe('The list of sub-questions'),
  }),
};

const SET_CATEGORIZED_QUESTIONS_TOOL = {
  name: 'set_categorized_questions',
  description:
    'Output the categorized list of sub-questions for the research plan.',
  schema: z.object({
    categories: z
      .array(
        z.object({
          category: z.string().describe('Category name'),
          questions: z
            .array(z.string())
            .describe('Questions in this category'),
        }),
      )
      .describe('Questions organized by research category'),
  }),
};

const DEDUP_THRESHOLD = 0.45;

class QuestionGenerator {
  async generate(
    query: string,
    n: number,
    llm: BaseLLM<any>,
    chatHistory: ChatTurnMessage[],
  ): Promise<string[]> {
    if (n === 1) {
      return [query];
    }

    try {
      const chatContext = this.buildChatContext(chatHistory);
      const prompt = getQuestionGeneratorPrompt(query, n, chatContext);
      const result = await llm.generateText({
        messages: [{ role: 'user', content: prompt }],
        tools: [SET_QUESTIONS_TOOL],
      });

      const toolCall = result.toolCalls.find(
        (tc) => tc.name === 'set_questions',
      );

      if (
        toolCall &&
        Array.isArray(toolCall.arguments.questions) &&
        toolCall.arguments.questions.length > 0
      ) {
        const raw = toolCall.arguments.questions.slice(0, n) as string[];
        return this.deduplicateQuestions(raw);
      }

      return [query];
    } catch {
      return [query];
    }
  }

  async generateCategorized(
    query: string,
    n: number,
    llm: BaseLLM<any>,
    chatHistory: ChatTurnMessage[],
  ): Promise<QuestionCategory[]> {
    if (n === 1) {
      return [{ category: 'General', questions: [query] }];
    }

    try {
      const chatContext = this.buildChatContext(chatHistory);
      const prompt = getCategorizedQuestionGeneratorPrompt(
        query,
        n,
        chatContext,
      );
      const result = await llm.generateText({
        messages: [{ role: 'user', content: prompt }],
        tools: [SET_CATEGORIZED_QUESTIONS_TOOL],
      });

      const toolCall = result.toolCalls.find(
        (tc) => tc.name === 'set_categorized_questions',
      );

      if (
        toolCall &&
        Array.isArray(toolCall.arguments.categories) &&
        toolCall.arguments.categories.length > 0
      ) {
        const categories = toolCall.arguments
          .categories as QuestionCategory[];

        // Enforce total question limit
        let total = 0;
        const trimmed: QuestionCategory[] = [];
        for (const cat of categories) {
          if (total >= n) break;
          const remaining = n - total;
          const questions = cat.questions.slice(0, remaining);
          if (questions.length > 0) {
            trimmed.push({ category: cat.category, questions });
            total += questions.length;
          }
        }

        // Deduplicate across all categories
        const allQuestions = trimmed.flatMap((c) => c.questions);
        const deduped = this.deduplicateQuestions(allQuestions);
        const dedupedSet = new Set(deduped);

        const result2: QuestionCategory[] = [];
        for (const cat of trimmed) {
          const filtered = cat.questions.filter((q) => dedupedSet.has(q));
          if (filtered.length > 0) {
            result2.push({ category: cat.category, questions: filtered });
          }
        }

        return result2.length > 0
          ? result2
          : [{ category: 'General', questions: [query] }];
      }

      return [{ category: 'General', questions: [query] }];
    } catch {
      return [{ category: 'General', questions: [query] }];
    }
  }

  private buildChatContext(chatHistory: ChatTurnMessage[]): string | undefined {
    if (chatHistory.length === 0) return undefined;
    return chatHistory
      .slice(-10)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');
  }

  private deduplicateQuestions(questions: string[]): string[] {
    // Use unigrams only for short-text dedup — bigrams dilute Jaccard
    // for queries under ~10 words.
    const kept: { question: string; unigrams: Set<string> }[] = [];

    for (const q of questions) {
      const { unigrams } = tokenize(q);
      const isDuplicate = kept.some(
        (k) => jaccardSimilarity(unigrams, k.unigrams) > DEDUP_THRESHOLD,
      );
      if (!isDuplicate) {
        kept.push({ question: q, unigrams });
      }
    }

    // Diversity telemetry
    if (kept.length >= 2) {
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < kept.length; i++) {
        for (let j = i + 1; j < kept.length; j++) {
          totalSim += jaccardSimilarity(kept[i].unigrams, kept[j].unigrams);
          pairs++;
        }
      }
      const avgSimilarity = totalSim / pairs;
      if (avgSimilarity > 0.4) {
        console.warn(
          `[QuestionGenerator] Low diversity: avg pairwise similarity ${avgSimilarity.toFixed(2)} across ${kept.length} questions`,
        );
      }
    }

    return kept.map((k) => k.question);
  }
}

export default QuestionGenerator;
