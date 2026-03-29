import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SessionManager from '@/lib/session';
import type { Block } from '@/lib/types';

vi.useFakeTimers();

describe('SessionManager', () => {
  beforeEach(() => {
    const sessions = (global as any)._sessionManagerSessions as
      | Map<string, any>
      | undefined;
    if (sessions) sessions.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createSession / getSession / getAllSessions', () => {
    it('createSession returns a SessionManager with a UUID id', () => {
      const session = SessionManager.createSession();
      expect(session).toBeInstanceOf(SessionManager);
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('createSession registers the session so getSession finds it', () => {
      const session = SessionManager.createSession();
      expect(SessionManager.getSession(session.id)).toBe(session);
    });

    it('getSession returns undefined for unknown id', () => {
      expect(SessionManager.getSession('not-a-real-id')).toBeUndefined();
    });

    it('getAllSessions returns all created sessions', () => {
      const s1 = SessionManager.createSession();
      const s2 = SessionManager.createSession();
      const all = SessionManager.getAllSessions();
      expect(all).toContain(s1);
      expect(all).toContain(s2);
    });

    it('getAllSessions returns empty array when no sessions', () => {
      expect(SessionManager.getAllSessions()).toEqual([]);
    });
  });

  describe('emit and subscribe', () => {
    let session: SessionManager;

    beforeEach(() => {
      session = SessionManager.createSession();
    });

    it('subscribe replays existing events before new ones', () => {
      session.emit('data', { x: 1 });
      session.emit('data', { x: 2 });

      const received: Array<{ event: string; data: any }> = [];
      session.subscribe((event, data) => received.push({ event, data }));

      expect(received).toHaveLength(2);
      expect(received[0].data.x).toBe(1);
      expect(received[1].data.x).toBe(2);
    });

    it('subscribe receives future events', () => {
      const received: Array<{ event: string; data: any }> = [];
      const unsub = session.subscribe((event, data) =>
        received.push({ event, data }),
      );

      session.emit('data', { value: 42 });

      expect(received).toHaveLength(1);
      expect(received[0].data.value).toBe(42);
      unsub();
    });

    it('unsubscribe stops receiving future events', () => {
      const received: any[] = [];
      const unsub = session.subscribe((_, data) => received.push(data));

      session.emit('data', { a: 1 });
      unsub();
      session.emit('data', { a: 2 });

      expect(received).toHaveLength(1);
    });

    it('emit end event marks session as ended', () => {
      expect(session['ended']).toBe(false);
      session.emit('end', {});
      expect(session['ended']).toBe(true);
    });

    it('emit error event marks session as ended', () => {
      // subscribe first so the EventEmitter has an 'error' listener (Node throws on unhandled 'error' events)
      const unsub = session.subscribe(() => {});
      session.emit('error', { message: 'fail' });
      unsub();
      expect(session['ended']).toBe(true);
    });

    it('emit does not mark session as ended for other events', () => {
      session.emit('data', { something: true });
      expect(session['ended']).toBe(false);
    });

    it('removeAllListeners stops future event delivery', () => {
      const received: any[] = [];
      session.subscribe((_, data) => received.push(data));
      session.removeAllListeners();
      session.emit('data', { shouldNotArrive: true });
      expect(received).toHaveLength(0);
    });
  });

  describe('blocks', () => {
    let session: SessionManager;

    beforeEach(() => {
      session = SessionManager.createSession();
    });

    it('emitBlock stores block and emits a data event', () => {
      const received: any[] = [];
      session.subscribe((event, data) => received.push({ event, data }));

      const block = { id: 'b1', type: 'text', data: 'hello' } as unknown as Block;
      session.emitBlock(block);

      expect(session.getBlock('b1')).toEqual(block);
      const dataEvent = received.find(
        (r) => r.event === 'data' && r.data.type === 'block',
      );
      expect(dataEvent).toBeDefined();
      expect(dataEvent.data.block).toEqual(block);
    });

    it('getBlock returns undefined for unknown block id', () => {
      expect(session.getBlock('ghost')).toBeUndefined();
    });

    it('updateBlock applies JSON patch and emits updateBlock event', () => {
      const block = { id: 'b2', type: 'text', data: 'original' } as unknown as Block;
      session.emitBlock(block);

      const received: any[] = [];
      session.subscribe((_, data) => received.push(data));
      // Clear replayed history (the emitBlock events)
      received.length = 0;

      session.updateBlock('b2', [{ op: 'replace', path: '/data', value: 'updated' }]);

      const updated = session.getBlock('b2') as any;
      expect(updated.data).toBe('updated');

      const updateEvent = received.find((d) => d.type === 'updateBlock');
      expect(updateEvent).toBeDefined();
    });

    it('updateBlock does nothing for unknown block id', () => {
      const received: any[] = [];
      session.subscribe((_, data) => received.push(data));
      received.length = 0; // clear replayed events

      session.updateBlock('no-such-block', [
        { op: 'replace', path: '/data', value: 'x' },
      ]);

      expect(received).toHaveLength(0);
    });

    it('getAllBlocks returns all stored blocks', () => {
      const b1 = { id: 'x1', type: 'text', data: 'A' } as unknown as Block;
      const b2 = { id: 'x2', type: 'text', data: 'B' } as unknown as Block;
      session.emitBlock(b1);
      session.emitBlock(b2);
      expect(session.getAllBlocks()).toHaveLength(2);
    });

    it('getAllBlocks returns empty array when no blocks stored', () => {
      expect(session.getAllBlocks()).toEqual([]);
    });
  });

  describe('TTL cleanup', () => {
    it('session is removed after active TTL (30 min)', () => {
      const session = SessionManager.createSession();
      const id = session.id;
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(SessionManager.getSession(id)).toBeUndefined();
    });

    it('session persists before active TTL expires', () => {
      const session = SessionManager.createSession();
      const id = session.id;
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(SessionManager.getSession(id)).toBe(session);
    });

    it('ended session is removed after ended TTL (5 min)', () => {
      const session = SessionManager.createSession();
      const id = session.id;
      session.emit('end', {});
      vi.advanceTimersByTime(6 * 60 * 1000);
      expect(SessionManager.getSession(id)).toBeUndefined();
    });

    it('ended session persists within ended TTL', () => {
      const session = SessionManager.createSession();
      const id = session.id;
      session.emit('end', {});
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(SessionManager.getSession(id)).toBe(session);
    });
  });

  describe('question selection gate', () => {
    it('waitForSelection creates a pending gate', () => {
      const session = SessionManager.createSession();
      expect(session.hasActiveSelection()).toBe(false);
      session.waitForSelection();
      expect(session.hasActiveSelection()).toBe(true);
    });

    it('submitSelection resolves the waitForSelection promise', async () => {
      vi.useRealTimers();
      const session = SessionManager.createSession();
      const promise = session.waitForSelection();
      const submitted = session.submitSelection(['q1', 'q2']);
      expect(submitted).toBe(true);
      const result = await promise;
      expect(result).toEqual(['q1', 'q2']);
      expect(session.hasActiveSelection()).toBe(false);
      vi.useFakeTimers();
    });

    it('submitSelection returns false when no gate is active', () => {
      const session = SessionManager.createSession();
      expect(session.submitSelection(['q1'])).toBe(false);
    });

    it('double submitSelection returns false on second call', async () => {
      vi.useRealTimers();
      const session = SessionManager.createSession();
      session.waitForSelection();
      expect(session.submitSelection(['q1'])).toBe(true);
      expect(session.submitSelection(['q2'])).toBe(false);
      vi.useFakeTimers();
    });
  });
});
