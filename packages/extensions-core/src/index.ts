/**
 * @browser-automator/extensions-core
 * Browser extension core with tab/session/permission management
 */

export { SessionManager } from './session-manager.js';
export {
  PermissionManager,
  type PermissionRequest,
  type PermissionPolicy,
  type PermissionDecision,
} from './permission-manager.js';
export type {
  SessionInfo,
  Permission,
  TabInfo,
  TabManager,
  ExtensionCore,
} from './types.js';
