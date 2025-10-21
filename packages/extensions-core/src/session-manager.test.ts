import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const session1 = sessionManager.createSession('https://app.example.com');
      const session2 = sessionManager.createSession('https://app.example.com');

      expect(session1.sessionId).toBeDefined();
      expect(session2.sessionId).toBeDefined();
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should initialize session with empty tabIds and permissions', () => {
      const session = sessionManager.createSession('https://app.example.com');

      expect(session.callerOrigin).toBe('https://app.example.com');
      expect(session.tabIds).toEqual([]);
      expect(session.permissions).toEqual([]);
      expect(session.createdAt).toBeGreaterThan(0);
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', () => {
      const created = sessionManager.createSession('https://app.example.com');
      const retrieved = sessionManager.getSession(created.sessionId);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent session', () => {
      const result = sessionManager.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('closeSession', () => {
    it('should remove session', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.closeSession(session.sessionId);

      const retrieved = sessionManager.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('tab management', () => {
    it('should add tab to session', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addTabToSession(session.sessionId, 123);

      expect(session.tabIds).toContain(123);
    });

    it('should not add duplicate tabs', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addTabToSession(session.sessionId, 123);
      sessionManager.addTabToSession(session.sessionId, 123);

      expect(session.tabIds).toEqual([123]);
    });

    it('should remove tab from session', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addTabToSession(session.sessionId, 123);
      sessionManager.removeTabFromSession(session.sessionId, 123);

      expect(session.tabIds).not.toContain(123);
    });

    it('should check if tab is in session', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addTabToSession(session.sessionId, 123);

      expect(sessionManager.isTabInSession(session.sessionId, 123)).toBe(true);
      expect(sessionManager.isTabInSession(session.sessionId, 456)).toBe(false);
    });
  });

  describe('permission management', () => {
    it('should add permission to session', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addPermission(session.sessionId, {
        type: 'navigation',
        granted: true,
        requestedAt: Date.now(),
        grantedAt: Date.now(),
      });

      expect(session.permissions.length).toBe(1);
      expect(session.permissions[0]?.type).toBe('navigation');
    });

    it('should check if session has permission', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addPermission(session.sessionId, {
        type: 'navigation',
        granted: true,
        requestedAt: Date.now(),
        grantedAt: Date.now(),
      });

      expect(sessionManager.hasPermission(session.sessionId, 'navigation')).toBe(true);
      expect(sessionManager.hasPermission(session.sessionId, 'interaction')).toBe(false);
    });

    it('should not grant permission if not granted', () => {
      const session = sessionManager.createSession('https://app.example.com');
      sessionManager.addPermission(session.sessionId, {
        type: 'navigation',
        granted: false,
        requestedAt: Date.now(),
      });

      expect(sessionManager.hasPermission(session.sessionId, 'navigation')).toBe(false);
    });
  });
});
