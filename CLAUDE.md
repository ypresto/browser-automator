# CLAUDE note

- Use pnpm
- Use tsc --init
- Plan, write test, then implement
- Firstly, design every interface between components
- Introduce https://github.com/GoogleChromeLabs/comlink for postMessage() abstraction
- Use deepwiki for any library usages
- Use web search for documents
- Do not stop until end of implementation
- Chrome real browser test will be done by human after you finished
- Use monorepo with pnpm, place everything under src for non-chrome-extension codes.
- Use ESM where possible.
- Avoid JS class where possible and appropriate.
- Use vitest for testing, use test file name foo.ts -> foo.test.ts in same dir
- Try to pass all typechecks and tests until you need to fallback to non-essential solution
