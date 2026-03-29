'use client';

import { Message } from '@/components/ChatWindow';
import { Block, QuestionCategory } from '@/lib/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import crypto from 'crypto';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getSuggestions } from '../actions';
import { MinimalProvider } from '../models/types';
import { applyPatch } from 'rfc6902';
import { Widget } from '@/components/ChatWindow';
import { PipelineOverrides, PIPELINE_OVERRIDES_LS_KEY } from '@/lib/config/pipeline';

// Pre-compiled regex patterns used in buildSection (avoid re-creation per call)
const CITATION_REGEX_PATTERN = /\[([^\]]+)\]/g;
const DIGIT_CITATION_REGEX_PATTERN = /\[(\d+)\]/g;

export type Section = {
  message: Message;
  widgets: Widget[];
  parsedTextBlocks: string[];
  speechMessage: string;
  thinkingEnded: boolean;
  suggestions?: string[];
};

type ChatContext = {
  messages: Message[];
  sections: Section[];
  chatHistory: [string, string][];
  files: File[];
  fileIds: string[];
  sources: string[];
  chatId: string | undefined;
  isMessagesLoaded: boolean;
  loading: boolean;
  notFound: boolean;
  messageAppeared: boolean;
  isReady: boolean;
  hasError: boolean;
  errorMessage: string;
  chatModelProvider: ChatModelProvider;
  embeddingModelProvider: EmbeddingModelProvider;
  researchEnded: boolean;
  researchProgress: { questionsCompleted: number; questionTotal: number } | null;
  verifying: boolean;
  pipelineOverrides: PipelineOverrides;
  pendingQuestions: {
    sessionId: string;
    categories: QuestionCategory[];
  } | null;
  setResearchEnded: (ended: boolean) => void;
  setPipelineOverrides: (overrides: PipelineOverrides) => void;
  submitQuestionSelection: (
    sessionId: string,
    selectedQuestions: string[],
  ) => Promise<void>;
  setSources: (sources: string[]) => void;
  setFiles: (files: File[]) => void;
  setFileIds: (fileIds: string[]) => void;
  sendMessage: (
    message: string,
    messageId?: string,
    rewrite?: boolean,
  ) => Promise<void>;
  rewrite: (messageId: string) => void;
  setChatModelProvider: (provider: ChatModelProvider) => void;
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void;
};

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}

interface ChatModelProvider {
  key: string;
  providerId: string;
}

interface EmbeddingModelProvider {
  key: string;
  providerId: string;
}

const checkConfig = async (
  setChatModelProvider: (provider: ChatModelProvider) => void,
  setEmbeddingModelProvider: (provider: EmbeddingModelProvider) => void,
  setIsConfigReady: (ready: boolean) => void,
  setHasError: (hasError: boolean) => void,
  setErrorMessage: (msg: string) => void,
) => {
  try {
    let chatModelKey = localStorage.getItem('chatModelKey');
    let chatModelProviderId = localStorage.getItem('chatModelProviderId');
    let embeddingModelKey = localStorage.getItem('embeddingModelKey');
    let embeddingModelProviderId = localStorage.getItem(
      'embeddingModelProviderId',
    );

    const res = await fetch(`/api/providers`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Provider fetching failed with status code ${res.status}`,
      );
    }

    const data = await res.json();
    const providers: MinimalProvider[] = data.providers;

    if (providers.length === 0) {
      throw new Error(
        'No chat model providers found. Please configure them in the settings page.',
      );
    }

    const chatModelProvider =
      providers.find((p) => p.id === chatModelProviderId) ??
      providers.find(
        (p) =>
          p.chatModels.length > 0 &&
          p.name.toLowerCase().includes('deepseek'),
      ) ??
      providers.find((p) => p.chatModels.length > 0);

    if (!chatModelProvider) {
      throw new Error(
        'No chat models found, please configure them in the settings page.',
      );
    }

    chatModelProviderId = chatModelProvider.id;

    const chatModel =
      chatModelProvider.chatModels.find((m) => m.key === chatModelKey) ??
      chatModelProvider.chatModels.find((m) =>
        m.name.toLowerCase().includes('deepseek'),
      ) ??
      chatModelProvider.chatModels[0];
    chatModelKey = chatModel.key;

    const embeddingModelProvider =
      providers.find((p) => p.id === embeddingModelProviderId) ??
      providers.find((p) => p.embeddingModels.length > 0);

    if (!embeddingModelProvider) {
      throw new Error(
        'No embedding models found, please configure them in the settings page.',
      );
    }

    embeddingModelProviderId = embeddingModelProvider.id;

    const embeddingModel =
      embeddingModelProvider.embeddingModels.find(
        (m) => m.key === embeddingModelKey,
      ) ?? embeddingModelProvider.embeddingModels[0];
    embeddingModelKey = embeddingModel.key;

    localStorage.setItem('chatModelKey', chatModelKey);
    localStorage.setItem('chatModelProviderId', chatModelProviderId);
    localStorage.setItem('embeddingModelKey', embeddingModelKey);
    localStorage.setItem('embeddingModelProviderId', embeddingModelProviderId);

    setChatModelProvider({
      key: chatModelKey,
      providerId: chatModelProviderId,
    });

    setEmbeddingModelProvider({
      key: embeddingModelKey,
      providerId: embeddingModelProviderId,
    });

    setIsConfigReady(true);
  } catch (err: any) {
    console.error('An error occurred while checking the configuration:', err);
    toast.error(err.message);
    setIsConfigReady(false);
    setHasError(true);
    setErrorMessage(err.message ?? 'Failed to connect to the server.');
  }
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  chatHistory: React.MutableRefObject<[string, string][]>,
  setSources: (sources: string[]) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(`/api/chats/${chatId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages as Message[];

  setMessages(messages);

  const history: [string, string][] = [];
  messages.forEach((msg) => {
    history.push(['human', msg.query]);

    const textBlocks = msg.responseBlocks
      .filter(
        (block): block is Block & { type: 'text' } => block.type === 'text',
      )
      .map((block) => block.data)
      .join('\n');

    if (textBlocks) {
      history.push(['assistant', textBlocks]);
    }
  });

  console.debug(new Date(), 'app:messages_loaded');

  if (messages.length > 0) {
    document.title = messages[0].query;
  }

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  chatHistory.current = history;
  setSources(data.chat.sources);
  setIsMessagesLoaded(true);
};

const buildSection = (msg: Message): Section => {
  const textBlocks: string[] = [];
  let speechMessage = '';
  let thinkingEnded = false;
  let suggestions: string[] = [];

  const sourceBlocks = msg.responseBlocks.filter(
    (block): block is Block & { type: 'source' } => block.type === 'source',
  );
  const sources = sourceBlocks.flatMap((block) => block.data);

  const widgetBlocks = msg.responseBlocks
    .filter((b) => b.type === 'widget')
    .map((b) => b.data) as Widget[];

  msg.responseBlocks.forEach((block) => {
    if (block.type === 'text') {
      let processedText = block.data;
      const citationRegex = new RegExp(CITATION_REGEX_PATTERN);
      const regex = new RegExp(DIGIT_CITATION_REGEX_PATTERN);

      if (processedText.includes('<think>')) {
        const openThinkTag = processedText.match(/<think>/g)?.length || 0;
        const closeThinkTag = processedText.match(/<\/think>/g)?.length || 0;

        if (openThinkTag && !closeThinkTag) {
          processedText += '</think> <a> </a>';
        }
      }

      if (block.data.includes('</think>')) {
        thinkingEnded = true;
      }

      if (sources.length > 0) {
        processedText = processedText.replace(
          citationRegex,
          (_, capturedContent: string) => {
            const numbers = capturedContent
              .split(',')
              .map((numStr) => numStr.trim());

            const linksHtml = numbers
              .map((numStr) => {
                const number = parseInt(numStr);

                if (isNaN(number) || number <= 0) {
                  return `[${numStr}]`;
                }

                const source = sources[number - 1];
                const url = source?.metadata?.url;

                if (url) {
                  return `<citation href="${url}" data-index="${number}">${numStr}</citation>`;
                } else {
                  return ``;
                }
              })
              .join('');

            return linksHtml;
          },
        );
        speechMessage += block.data.replace(regex, '');
      } else {
        processedText = processedText.replace(regex, '');
        speechMessage += block.data.replace(regex, '');
      }

      textBlocks.push(processedText);
    } else if (block.type === 'suggestion') {
      suggestions = block.data;
    }
  });

  return {
    message: msg,
    parsedTextBlocks: textBlocks,
    speechMessage,
    thinkingEnded,
    suggestions,
    widgets: widgetBlocks,
  };
};

export const chatContext = createContext<ChatContext>({
  chatHistory: [],
  chatId: '',
  fileIds: [],
  files: [],
  sources: [],
  hasError: false,
  errorMessage: '',
  isMessagesLoaded: false,
  isReady: false,
  loading: false,
  messageAppeared: false,
  messages: [],
  sections: [],
  notFound: false,
  chatModelProvider: { key: '', providerId: '' },
  embeddingModelProvider: { key: '', providerId: '' },
  researchEnded: false,
  researchProgress: null,
  verifying: false,
  pipelineOverrides: {},
  pendingQuestions: null,
  rewrite: () => {},
  sendMessage: async () => {},
  submitQuestionSelection: async () => {},
  setFileIds: () => {},
  setFiles: () => {},
  setSources: () => {},
  setPipelineOverrides: () => {},
  setChatModelProvider: () => {},
  setEmbeddingModelProvider: () => {},
  setResearchEnded: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const params: { chatId: string } = useParams();

  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const [chatId, setChatId] = useState<string | undefined>(params.chatId);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [researchEnded, setResearchEnded] = useState(false);
  const [researchProgress, setResearchProgress] = useState<{
    questionsCompleted: number;
    questionTotal: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<{
    sessionId: string;
    categories: QuestionCategory[];
  } | null>(null);

  const chatHistory = useRef<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  const [sources, setSources] = useState<string[]>(['web', 'academic']);
  const [pipelineOverrides, setPipelineOverrides] = useState<PipelineOverrides>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(PIPELINE_OVERRIDES_LS_KEY);
      if (stored) return JSON.parse(stored) as PipelineOverrides;
    } catch { /* ignore */ }
    return {};
  });

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const [chatModelProvider, setChatModelProvider] = useState<ChatModelProvider>(
    {
      key: '',
      providerId: '',
    },
  );

  const [embeddingModelProvider, setEmbeddingModelProvider] =
    useState<EmbeddingModelProvider>({
      key: '',
      providerId: '',
    });

  const [isConfigReady, setIsConfigReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const sendMessageRef = useRef<ChatContext['sendMessage']>(async () => {});

  // SSE batching: collect rapid setMessages updaters and flush once per frame
  const pendingUpdatesRef = useRef<Array<(msgs: Message[]) => Message[]>>([]);
  const batchScheduledRef = useRef(false);

  const flushMessageUpdates = useCallback(() => {
    batchScheduledRef.current = false;
    const updates = pendingUpdatesRef.current;
    if (updates.length === 0) return;
    pendingUpdatesRef.current = [];
    setMessages((prev) => updates.reduce((msgs, fn) => fn(msgs), prev));
  }, []);

  const enqueueMessageUpdate = useCallback(
    (updater: (msgs: Message[]) => Message[]) => {
      pendingUpdatesRef.current.push(updater);
      if (!batchScheduledRef.current) {
        batchScheduledRef.current = true;
        requestAnimationFrame(flushMessageUpdates);
      }
    },
    [flushMessageUpdates],
  );

  const prevSectionsRef = useRef<Map<string, Section>>(new Map());

  const sections = useMemo<Section[]>(() => {
    const cache = prevSectionsRef.current;
    const next = messages.map((msg) => {
      const prev = cache.get(msg.messageId);
      if (prev && prev.message === msg) return prev;
      const built = buildSection(msg);
      cache.set(msg.messageId, built);
      return built;
    });
    // Evict stale entries for messages no longer present
    const currentIds = new Set(messages.map((m) => m.messageId));
    for (const id of cache.keys()) {
      if (!currentIds.has(id)) cache.delete(id);
    }
    return next;
  }, [messages]);

  const isReconnectingRef = useRef(false);
  const handledMessageEndRef = useRef<Set<string>>(new Set());

  const checkReconnect = async () => {
    if (isReconnectingRef.current) return;

    setIsReady(true);
    console.debug(new Date(), 'app:ready');

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      if (lastMsg.status === 'answering') {
        setLoading(true);
        setResearchEnded(false);
        setMessageAppeared(false);

        isReconnectingRef.current = true;

        const res = await fetch(`/api/reconnect/${lastMsg.backendId}`, {
          method: 'POST',
        });

        if (!res.body) throw new Error('No response body');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');

        let partialChunk = '';

        const messageHandler = getMessageHandler(lastMsg);

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            partialChunk += decoder.decode(value, { stream: true });

            const lines = partialChunk.split('\n');
            partialChunk = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                messageHandler(json);
              } catch {
                // Malformed line — skip it
              }
            }
          }
        } finally {
          isReconnectingRef.current = false;
        }
      }
    }
  };

  useEffect(() => {
    checkConfig(
      setChatModelProvider,
      setEmbeddingModelProvider,
      setIsConfigReady,
      setHasError,
      setErrorMessage,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.chatId && params.chatId !== chatId) {
      setChatId(params.chatId);
      setMessages([]);
      chatHistory.current = [];
      setFiles([]);
      setFileIds([]);
      setIsMessagesLoaded(false);
      setNotFound(false);
      setNewChatCreated(false);
    }
  }, [params.chatId, chatId]);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        chatHistory,
        setSources,
        setNotFound,
        setFiles,
        setFileIds,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isMessagesLoaded, newChatCreated, messages.length]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isConfigReady && newChatCreated) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else if (isMessagesLoaded && isConfigReady && !newChatCreated) {
      checkReconnect();
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isConfigReady, newChatCreated]);

  const submitQuestionSelection = useCallback(
    async (sessionId: string, selectedQuestions: string[]) => {
      setPendingQuestions(null);
      try {
        const res = await fetch('/api/chat/select-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, selectedQuestions }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error('Question selection failed:', data);
        }
      } catch (err) {
        console.error('Question selection request failed:', err);
      }
    },
    [],
  );

  const rewrite = useCallback((messageId: string) => {
    const index = messagesRef.current.findIndex(
      (msg) => msg.messageId === messageId,
    );

    if (index === -1) return;

    setMessages((prev) => prev.slice(0, index));

    chatHistory.current = chatHistory.current.slice(0, index * 2);

    const messageToRewrite = messagesRef.current[index];
    sendMessageRef.current(messageToRewrite.query, messageToRewrite.messageId, true);
  }, []);

  useEffect(() => {
    if (isReady && initialMessage && isConfigReady) {
      if (!isConfigReady) {
        toast.error('Cannot send message before the configuration is ready');
        return;
      }
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigReady, isReady, initialMessage]);

  const getMessageHandler = (message: Message) => {
    const messageId = message.messageId;

    return async (data: any) => {
      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        flushMessageUpdates();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'error' as const }
              : msg,
          ),
        );
        return;
      }

      if (data.type === 'researchProgress') {
        setResearchProgress({
          questionsCompleted: data.questionsCompleted,
          questionTotal: data.questionTotal,
        });
      }

      if (data.type === 'researchComplete') {
        setResearchEnded(true);
        if (
          message.responseBlocks.find(
            (b) => b.type === 'source' && b.data.length > 0,
          )
        ) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'verificationStart') {
        setVerifying(true);
      }

      if (data.type === 'verificationComplete') {
        setVerifying(false);
        if (data.data && data.data.totalCitations > 0) {
          const verificationBlock: Block = {
            id: crypto.randomBytes(7).toString('hex'),
            type: 'verification',
            data: data.data,
          };
          enqueueMessageUpdate((prev) =>
            prev.map((msg) => {
              if (msg.messageId === messageId) {
                return {
                  ...msg,
                  responseBlocks: [...msg.responseBlocks, verificationBlock],
                };
              }
              return msg;
            }),
          );
        }
      }

      if (data.type === 'block') {
        enqueueMessageUpdate((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const exists = msg.responseBlocks.findIndex(
                (b) => b.id === data.block.id,
              );

              if (exists !== -1) {
                const existingBlocks = [...msg.responseBlocks];
                existingBlocks[exists] = data.block;

                return {
                  ...msg,
                  responseBlocks: existingBlocks,
                };
              }

              return {
                ...msg,
                responseBlocks: [...msg.responseBlocks, data.block],
              };
            }
            return msg;
          }),
        );

        if (
          data.block.type === 'questions' &&
          data.block.data?.status === 'pending'
        ) {
          setPendingQuestions({
            sessionId: data.block.data.sessionId,
            categories: data.block.data.categories,
          });
        }

        if (
          data.block.type === 'questions' &&
          data.block.data?.status === 'confirmed'
        ) {
          setPendingQuestions(null);
        }

        if (
          (data.block.type === 'source' && data.block.data.length > 0) ||
          data.block.type === 'text'
        ) {
          setMessageAppeared(true);
        }
      }

      if (data.type === 'updateBlock') {
        // Clear pending questions when the block is confirmed
        const patchSetsConfirmed = Array.isArray(data.patch) &&
          data.patch.some(
            (p: any) =>
              p.path === '/data/status' && p.value === 'confirmed',
          );
        if (patchSetsConfirmed) {
          setPendingQuestions(null);
        }

        enqueueMessageUpdate((prev) =>
          prev.map((msg) => {
            if (msg.messageId === messageId) {
              const updatedBlocks = msg.responseBlocks.map((block) => {
                if (block.id === data.blockId) {
                  const updatedBlock = { ...block };
                  applyPatch(updatedBlock, data.patch);
                  return updatedBlock;
                }
                return block;
              });
              return { ...msg, responseBlocks: updatedBlocks };
            }
            return msg;
          }),
        );
      }

      if (data.type === 'messageEnd') {
        if (handledMessageEndRef.current.has(messageId)) {
          return;
        }

        handledMessageEndRef.current.add(messageId);

        // Flush any pending batched updates before final state changes
        flushMessageUpdates();

        const currentMsg = messagesRef.current.find(
          (msg) => msg.messageId === messageId,
        );

        const newHistory: [string, string][] = [
          ...chatHistory.current,
          ['human', message.query],
          [
            'assistant',
            currentMsg?.responseBlocks.find((b) => b.type === 'text')?.data ||
              '',
          ],
        ];

        chatHistory.current = newHistory;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === messageId
              ? { ...msg, status: 'completed' as const }
              : msg,
          ),
        );

        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        // Check if there are sources and no suggestions

        const hasSourceBlocks = currentMsg?.responseBlocks.some(
          (block) => block.type === 'source' && block.data.length > 0,
        );
        const hasSuggestions = currentMsg?.responseBlocks.some(
          (block) => block.type === 'suggestion',
        );

        if (hasSourceBlocks && !hasSuggestions) {
          const suggestions = await getSuggestions(newHistory);
          const suggestionBlock: Block = {
            id: crypto.randomBytes(7).toString('hex'),
            type: 'suggestion',
            data: suggestions,
          };

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.messageId === messageId) {
                return {
                  ...msg,
                  responseBlocks: [...msg.responseBlocks, suggestionBlock],
                };
              }
              return msg;
            }),
          );
        }
      }
    };
  };

  const sendMessage: ChatContext['sendMessage'] = useCallback(
    async (message, messageId, rewrite = false) => {
      if (loading || !message) return;
      setLoading(true);
      setResearchEnded(false);
      setResearchProgress(null);
      setMessageAppeared(false);

      if (messagesRef.current.length <= 1) {
        window.history.replaceState(null, '', `/c/${chatId}`);
      }

      messageId = messageId ?? crypto.randomBytes(7).toString('hex');
      const backendId = crypto.randomBytes(20).toString('hex');

      const newMessage: Message = {
        messageId,
        chatId: chatId!,
        backendId,
        query: message,
        responseBlocks: [],
        status: 'answering',
        createdAt: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);

      const messageIndex = messagesRef.current.findIndex(
        (m) => m.messageId === messageId,
      );

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          message: {
            messageId: messageId,
            chatId: chatId!,
            content: message,
          },
          chatId: chatId!,
          files: fileIds,
          sources: sources,
          overrides:
            Object.keys(pipelineOverrides).length > 0
              ? pipelineOverrides
              : undefined,
          history: rewrite
            ? chatHistory.current.slice(
                0,
                messageIndex === -1 ? undefined : messageIndex,
              )
            : chatHistory.current,
          chatModel: {
            key: chatModelProvider.key,
            providerId: chatModelProvider.providerId,
          },
          embeddingModel: {
            key: embeddingModelProvider.key,
            providerId: embeddingModelProvider.providerId,
          },
          systemInstructions: localStorage.getItem('systemInstructions'),
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      let partialChunk = '';

      const messageHandler = getMessageHandler(newMessage);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        partialChunk += decoder.decode(value, { stream: true });

        const lines = partialChunk.split('\n');
        // Keep the last element — it may be an incomplete line
        partialChunk = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            messageHandler(json);
          } catch {
            // Malformed line — skip it
          }
        }
      }

      // Safety net: if the stream ended without a proper messageEnd/error event,
      // reset any stuck loading state so the UI doesn't hang indefinitely.
      flushMessageUpdates();
      setLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === messageId && msg.status === 'answering'
            ? { ...msg, status: 'error' as const }
            : msg,
        ),
      );
    },
    [
      loading,
      chatId,
      fileIds,
      sources,
      pipelineOverrides,
      chatModelProvider,
      embeddingModelProvider,
    ],
  );

  sendMessageRef.current = sendMessage;

  return (
    <chatContext.Provider
      value={{
        messages,
        sections,
        chatHistory: chatHistory.current,
        files,
        fileIds,
        sources,
        chatId,
        hasError,
        errorMessage,
        isMessagesLoaded,
        isReady,
        loading,
        messageAppeared,
        notFound,
        setFileIds,
        setFiles,
        setSources,
        setPipelineOverrides,
        pipelineOverrides,
        pendingQuestions,
        rewrite,
        sendMessage,
        submitQuestionSelection,
        setChatModelProvider,
        chatModelProvider,
        embeddingModelProvider,
        setEmbeddingModelProvider,
        researchEnded,
        researchProgress,
        verifying,
        setResearchEnded,
      }}
    >
      {children}
    </chatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(chatContext);
  return ctx;
};
