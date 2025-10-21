/**
 * Session management for browser automation
 */

import type { SessionInfo, Permission } from './types.js';

export class SessionManager {
  private sessions = new Map<string, SessionInfo>();

  createSession(callerOrigin: string): SessionInfo {
    const sessionId = this.generateSessionId();
    const session: SessionInfo = {
      sessionId,
      createdAt: Date.now(),
      callerOrigin,
      tabIds: [],
      permissions: [],
      grantedOrigins: new Set(), // Track origins granted for this session
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Grant origin for session (all actions to this origin allowed in session)
   */
  grantOriginForSession(sessionId: string, targetOrigin: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.grantedOrigins.add(targetOrigin);
      console.log(`[SessionManager] Granted origin for session ${sessionId}: ${targetOrigin}`);
    }
  }

  /**
   * Check if origin is granted for session
   */
  isOriginGrantedForSession(sessionId: string, targetOrigin: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.grantedOrigins.has(targetOrigin) : false;
  }

  getSession(sessionId: string): SessionInfo | null {
    return this.sessions.get(sessionId) || null;
  }

  closeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  addTabToSession(sessionId: string, tabId: number): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.tabIds.includes(tabId)) {
      session.tabIds.push(tabId);
    }
  }

  removeTabFromSession(sessionId: string, tabId: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tabIds = session.tabIds.filter((id) => id !== tabId);
    }
  }

  isTabInSession(sessionId: string, tabId: number): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.tabIds.includes(tabId) : false;
  }

  addPermission(sessionId: string, permission: Permission): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.permissions.push(permission);
    }
  }

  hasPermission(
    sessionId: string,
    type: Permission['type'],
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return session.permissions.some(
      (p) => p.type === type && p.granted,
    );
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
