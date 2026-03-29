import { EventEmitter } from 'stream';
import { applyPatch } from 'rfc6902';
import { Block } from './types';

const sessions =
  (global as any)._sessionManagerSessions || new Map<string, SessionManager>();
if (process.env.NODE_ENV !== 'production') {
  (global as any)._sessionManagerSessions = sessions;
}

const ACTIVE_TTL_MS = 30 * 60 * 1000;
const ENDED_TTL_MS = 5 * 60 * 1000;

class SessionManager {
  private static sessions: Map<string, SessionManager> = sessions;
  readonly id: string;
  private blocks = new Map<string, Block>();
  private events: { event: string; data: any }[] = [];
  private emitter = new EventEmitter();
  private cleanupTimer: ReturnType<typeof setTimeout>;
  private ended = false;
  private endedAt = 0;
  private selectionResolver: ((selected: string[]) => void) | null = null;

  constructor(id?: string) {
    this.id = id ?? crypto.randomUUID();

    this.cleanupTimer = setTimeout(() => {
      SessionManager.sessions.delete(this.id);
    }, ACTIVE_TTL_MS);
  }

  static getSession(id: string): SessionManager | undefined {
    return this.sessions.get(id);
  }

  static getAllSessions(): SessionManager[] {
    return Array.from(this.sessions.values());
  }

  static createSession(): SessionManager {
    const session = new SessionManager();
    this.sessions.set(session.id, session);
    return session;
  }

  removeAllListeners() {
    this.emitter.removeAllListeners();
  }

  emit(event: string, data: any) {
    // Node EventEmitter throws on 'error' events with no listener.
    // Guard against this so late errors (after SSE disconnect) don't crash the process.
    if (event === 'error' && this.emitter.listenerCount('error') === 0) {
      console.error('SessionManager: undelivered error event', data);
    } else {
      this.emitter.emit(event, data);
    }
    this.events.push({ event, data });
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Reschedule cleanup to shorter TTL when session ends
    if (!this.ended && (event === 'end' || event === 'error')) {
      this.ended = true;
      this.endedAt = Date.now();
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = setTimeout(() => {
        SessionManager.sessions.delete(this.id);
      }, ENDED_TTL_MS);
    }
  }

  emitBlock(block: Block) {
    this.blocks.set(block.id, block);
    this.emit('data', {
      type: 'block',
      block: block,
    });
  }

  getBlock(blockId: string): Block | undefined {
    return this.blocks.get(blockId);
  }

  updateBlock(blockId: string, patch: any[]) {
    const block = this.blocks.get(blockId);

    if (block) {
      applyPatch(block, patch);
      this.blocks.set(blockId, block);
      this.emit('data', {
        type: 'updateBlock',
        blockId: blockId,
        patch: patch,
      });
    }
  }

  getAllBlocks() {
    return Array.from(this.blocks.values());
  }

  waitForSelection(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      this.selectionResolver = resolve;
    });
  }

  submitSelection(selectedQuestions: string[]): boolean {
    if (!this.selectionResolver) return false;
    this.selectionResolver(selectedQuestions);
    this.selectionResolver = null;
    return true;
  }

  hasActiveSelection(): boolean {
    return this.selectionResolver !== null;
  }

  subscribe(listener: (event: string, data: any) => void): () => void {
    const currentEventsLength = this.events.length;

    const handler = (event: string) => (data: any) => listener(event, data);
    const dataHandler = handler('data');
    const endHandler = handler('end');
    const errorHandler = handler('error');

    this.emitter.on('data', dataHandler);
    this.emitter.on('end', endHandler);
    this.emitter.on('error', errorHandler);

    for (let i = 0; i < currentEventsLength; i++) {
      const { event, data } = this.events[i];
      listener(event, data);
    }

    return () => {
      this.emitter.off('data', dataHandler);
      this.emitter.off('end', endHandler);
      this.emitter.off('error', errorHandler);
    };
  }
}

// Periodic sweep to clean up ended sessions that survived their timer
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of SessionManager['sessions']) {
    if (session['ended'] && now - session['endedAt'] > ENDED_TTL_MS) {
      SessionManager['sessions'].delete(id);
    }
  }
}, ENDED_TTL_MS);

export default SessionManager;
