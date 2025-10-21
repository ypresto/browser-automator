/**
 * Permission Manager for Browser Automator
 * Implements origin-based permission model
 */

export interface PermissionRequest {
  action: string; // 'navigate', 'click', 'type', 'evaluate', etc.
  callerOrigin: string; // Origin of controller (e.g., https://app.example.com)
  targetOrigin: string; // Origin of target page (e.g., https://google.com)
  element?: string;
  ref?: string;
  text?: string;
  url?: string;
}

export interface PermissionPolicy {
  callerOrigin: string;
  targetOrigin: string;
  allowedActions: Set<string>;
}

export interface PermissionDecision {
  allow: boolean;
  remember: boolean;
}

export class PermissionManager {
  // Permission policies: Map<callerOrigin, Map<targetOrigin, Set<allowedActions>>>
  private policies = new Map<string, Map<string, Set<string>>>();

  /**
   * Check if action is allowed
   * Returns true if permission policy exists, false if permission needed
   */
  isAllowed(request: PermissionRequest): boolean {
    const { callerOrigin, targetOrigin, action } = request;

    const callerPolicies = this.policies.get(callerOrigin);
    if (!callerPolicies) {
      return false; // No policies for this caller
    }

    const targetActions = callerPolicies.get(targetOrigin);
    if (!targetActions) {
      return false; // No policies for this target
    }

    return targetActions.has(action);
  }

  /**
   * Grant permission (from user approval)
   */
  grantPermission(request: PermissionRequest, remember: boolean): void {
    if (!remember) {
      // One-time permission, don't save policy
      return;
    }

    const { callerOrigin, targetOrigin, action } = request;

    // Get or create caller policies
    if (!this.policies.has(callerOrigin)) {
      this.policies.set(callerOrigin, new Map());
    }

    const callerPolicies = this.policies.get(callerOrigin)!;

    // Get or create target policies
    if (!callerPolicies.has(targetOrigin)) {
      callerPolicies.set(targetOrigin, new Set());
    }

    const targetActions = callerPolicies.get(targetOrigin)!;

    // Add action to allowed set
    targetActions.add(action);

    console.log(`[PermissionManager] Granted: ${callerOrigin} → ${action} on ${targetOrigin}`);
  }

  /**
   * Revoke all permissions for a caller origin
   */
  revokeCallerPermissions(callerOrigin: string): void {
    this.policies.delete(callerOrigin);
    console.log(`[PermissionManager] Revoked all permissions for: ${callerOrigin}`);
  }

  /**
   * Revoke permissions for specific target
   */
  revokeTargetPermissions(callerOrigin: string, targetOrigin: string): void {
    const callerPolicies = this.policies.get(callerOrigin);
    if (callerPolicies) {
      callerPolicies.delete(targetOrigin);
      console.log(`[PermissionManager] Revoked: ${callerOrigin} → ${targetOrigin}`);
    }
  }

  /**
   * Get all policies for a caller
   */
  getPolicies(callerOrigin: string): PermissionPolicy[] {
    const callerPolicies = this.policies.get(callerOrigin);
    if (!callerPolicies) {
      return [];
    }

    const policies: PermissionPolicy[] = [];
    for (const [targetOrigin, allowedActions] of callerPolicies.entries()) {
      policies.push({
        callerOrigin,
        targetOrigin,
        allowedActions: new Set(allowedActions),
      });
    }

    return policies;
  }

  /**
   * Validate that request origin matches expected origin
   * Used by content script to verify request is for the correct page
   */
  validateOrigin(requestOrigin: string, actualOrigin: string): boolean {
    return requestOrigin === actualOrigin;
  }

  /**
   * Determine target origin for permission check
   */
  static getTargetOrigin(action: string, args: any, currentPageOrigin?: string): string {
    // For URL-based actions, use the target URL's origin
    if (action === 'navigate' || action === 'createTab') {
      if (args.url) {
        try {
          return new URL(args.url).origin;
        } catch {
          return 'invalid-url';
        }
      }
    }

    // For other actions, use current page's origin
    return currentPageOrigin || 'unknown';
  }

  /**
   * Check if action requires permission
   */
  static requiresPermission(action: string): boolean {
    const sensitiveActions = ['navigate', 'createTab', 'click', 'type', 'evaluate'];
    return sensitiveActions.includes(action);
  }

  /**
   * Validate caller origin is from secure context
   */
  static isSecureOrigin(origin: string): boolean {
    // Allow HTTPS and localhost
    return origin.startsWith('https://') ||
           origin.startsWith('http://localhost') ||
           origin.startsWith('http://127.0.0.1');
  }
}
