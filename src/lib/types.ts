import { ToolCall } from './models/types';

export type SystemMessage = {
  role: 'system';
  content: string;
};

export type AssistantMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
};

export type UserMessage = {
  role: 'user';
  content: string;
};

export type ToolMessage = {
  role: 'tool';
  id: string;
  name: string;
  content: string;
};

export type ChatTurnMessage = UserMessage | AssistantMessage;

export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolMessage;

export type Chunk = {
  content: string;
  metadata: Record<string, any>;
};

export type TextBlock = {
  id: string;
  type: 'text';
  data: string;
};

export type SourceBlock = {
  id: string;
  type: 'source';
  data: Chunk[];
};

export type SuggestionBlock = {
  id: string;
  type: 'suggestion';
  data: string[];
};

export type WidgetBlock = {
  id: string;
  type: 'widget';
  data: {
    widgetType: string;
    params: Record<string, any>;
  };
};

export type ReasoningResearchBlock = {
  id: string;
  type: 'reasoning';
  reasoning: string;
};

export type SearchingResearchBlock = {
  id: string;
  type: 'searching';
  searching: string[];
};

export type SearchResultsResearchBlock = {
  id: string;
  type: 'search_results';
  reading: Chunk[];
};

export type ReadingResearchBlock = {
  id: string;
  type: 'reading';
  reading: Chunk[];
};

export type UploadSearchingResearchBlock = {
  id: string;
  type: 'upload_searching';
  queries: string[];
};

export type UploadSearchResultsResearchBlock = {
  id: string;
  type: 'upload_search_results';
  results: Chunk[];
};

export type ResearchBlockSubStep =
  | ReasoningResearchBlock
  | SearchingResearchBlock
  | SearchResultsResearchBlock
  | ReadingResearchBlock
  | UploadSearchingResearchBlock
  | UploadSearchResultsResearchBlock;

export type ResearchBlock = {
  id: string;
  type: 'research';
  data: {
    subSteps: ResearchBlockSubStep[];
    question?: string;
    questionIndex?: number;
    questionTotal?: number;
  };
};

export type CitationDetail = {
  citationIndex: number;
  status: 'pass' | 'weak' | 'fail';
  similarity: number;
  matchedSnippet: string;
  sentence: string;
};

export type VerificationBlock = {
  id: string;
  type: 'verification';
  data: {
    status: 'verified' | 'partial' | 'none';
    totalCitations: number;
    passed: number;
    weak: number;
    failed: number;
    wasCorrected: boolean;
    accuracyScore?: number;
    results?: CitationDetail[];
  };
};

export type ClassificationBlock = {
  id: string;
  type: 'classification';
  data: {
    standaloneFollowUp: string;
    skipSearch: boolean;
  };
};

export type CostBlock = {
  id: string;
  type: 'cost';
  costUsd: number;
  modelId: string;
  totalSpentUsd?: number;
  budgetUsd?: number | null;
};

export type QuestionCategory = {
  category: string;
  questions: string[];
};

export type QuestionsBlock = {
  id: string;
  type: 'questions';
  data: {
    sessionId: string;
    categories: QuestionCategory[];
    status: 'pending' | 'confirmed';
    selectedQuestions?: string[];
  };
};

export type Block =
  | TextBlock
  | SourceBlock
  | SuggestionBlock
  | WidgetBlock
  | ResearchBlock
  | VerificationBlock
  | ClassificationBlock
  | CostBlock
  | QuestionsBlock;
