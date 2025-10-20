# Browser Automator

Playwright-MCP like 

## DOM Core (@browser-automator/dom-core)

- Provides [playwright-mcp core automation tools](https://github.com/microsoft/playwright-mcp#tools) compatible interface
- Defines plain TS interface for it
- Implements playwright-mcp equivalent accessibility tree using [axe-core](https://github.com/dequelabs/axe-core)

## Browser Extensions Core (@browser-automator/extensions-core)

- Provides playwright-mcp compatible tab management (`browser_tabs`) interface
- Proxies any operations inside tab to actual extension
- Session management
  - Session initiation/reconnect from controller web page
  - Only tabs opened by current session is accessible
- Permission management
  - asks user before allowing to access
- Defines TS interface for extension communication
  - Actual extension will implement this interface and pass it to core to instantiate

## Browser Automator Chrome Extension

- Architecture Overview:
  - Controller web page -> Content Script -> Service Worker -> Injected Script -> dom-core
- User accesses agent web page (a Controller)
- Chrome Extension starts content scripts and it communicates with service worker
- Controller will send postMessage() on window with fixed UUIDv4 key (for collision prevention), and received by Content Script
- Then service worker of extension will open new tab
- Injected script (`web_accessible_resources`) will do actual operations using `@browser-automator/core`

## Browser Automator  (@browser-automator/controller)

- Mount as dedicated endpoint in your web server (defaults to /browser-automator)
- Chrome Extension will connects to that page with /browser-automator?token=...

## NOTE: Security Model

- Permission request before starting opreation with injected script layer
- Session isolation of automated tabs
- Only expose playwright-mcp compatible interface,
  so only able to interact with contents of permission allowed tabs.
