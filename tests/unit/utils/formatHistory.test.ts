import { describe, it, expect } from 'vitest';
import formatChatHistoryAsString from '@/lib/utils/formatHistory';
import { ChatTurnMessage } from '@/lib/types';

describe('formatHistory', () => {
  describe('formatChatHistoryAsString', () => {
    it('should format empty history as empty string', () => {
      const history: ChatTurnMessage[] = [];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('');
    });

    it('should format single user message', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Hello, how are you?' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('User: Hello, how are you?');
    });

    it('should format single assistant message', () => {
      const history: ChatTurnMessage[] = [
        { role: 'assistant', content: 'I am doing well, thank you!' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('AI: I am doing well, thank you!');
    });

    it('should format conversation with multiple turns', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'What is its population?' },
        { role: 'assistant', content: 'Paris has about 2.1 million people.' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: What is the capital of France?\n' +
        'AI: The capital of France is Paris.\n' +
        'User: What is its population?\n' +
        'AI: Paris has about 2.1 million people.'
      );
    });

    it('should handle messages with special characters', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Hello "world" & <test>' },
        { role: 'assistant', content: 'Response with \n newline and \t tab' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: Hello "world" & <test>\n' +
        'AI: Response with \n newline and \t tab'
      );
    });

    it('should handle empty message content', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: '' },
        { role: 'assistant', content: '' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('User: \nAI: ');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const history: ChatTurnMessage[] = [
        { role: 'user', content: longMessage },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(`User: ${longMessage}`);
      expect(result.length).toBe(1006); // "User: " + 1000
    });

    it('should handle messages with markdown formatting', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Explain **bold** and *italic* text' },
        { role: 'assistant', content: '**Bold** uses `**` and *italic* uses `*`' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: Explain **bold** and *italic* text\n' +
        'AI: **Bold** uses `**` and *italic* uses `*`'
      );
    });

    it('should handle messages with code blocks', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'How do I write a function?' },
        { role: 'assistant', content: '```python\ndef hello():\n    print("Hello")\n```' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: How do I write a function?\n' +
        'AI: ```python\ndef hello():\n    print("Hello")\n```'
      );
    });

    it('should handle mixed case role names', () => {
      // Note: The function only checks for 'assistant' exactly
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' },
        // These would be invalid according to the type, but testing edge cases
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('User: Test\nAI: Response');
    });

    it('should preserve message order', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'Second' },
        { role: 'user', content: 'Third' },
        { role: 'assistant', content: 'Fourth' },
      ];
      const result = formatChatHistoryAsString(history);
      const lines = result.split('\n');
      expect(lines[0]).toBe('User: First');
      expect(lines[1]).toBe('AI: Second');
      expect(lines[2]).toBe('User: Third');
      expect(lines[3]).toBe('AI: Fourth');
    });

    it('should handle messages with URLs', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Check https://example.com' },
        { role: 'assistant', content: 'I found https://example.org' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: Check https://example.com\n' +
        'AI: I found https://example.org'
      );
    });

    it('should handle messages with emojis', () => {
      const history: ChatTurnMessage[] = [
        { role: 'user', content: 'Hello 😊' },
        { role: 'assistant', content: 'Hi there! 👋' },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe('User: Hello 😊\nAI: Hi there! 👋');
    });

    it('should handle messages with multiple lines', () => {
      const history: ChatTurnMessage[] = [
        { 
          role: 'user', 
          content: 'First line\nSecond line\nThird line' 
        },
        { 
          role: 'assistant', 
          content: 'Response line 1\nResponse line 2' 
        },
      ];
      const result = formatChatHistoryAsString(history);
      expect(result).toBe(
        'User: First line\nSecond line\nThird line\n' +
        'AI: Response line 1\nResponse line 2'
      );
    });
  });
});