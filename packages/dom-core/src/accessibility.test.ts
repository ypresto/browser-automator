import { describe, it, expect, beforeEach } from 'vitest';
import { buildAccessibilityTree, formatAsYAML } from './accessibility.js';
import type { AccessibilitySnapshot } from './types.js';

describe('buildAccessibilityTree', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should build accessibility tree from simple DOM', async () => {
    document.body.innerHTML = `
      <button>Click me</button>
      <input type="text" placeholder="Enter text" />
    `;

    const tree = await buildAccessibilityTree();

    expect(tree).toBeDefined();
    expect(tree.url).toBeDefined();
    expect(tree.title).toBeDefined();
    expect(tree.elements.length).toBeGreaterThan(0);
  });

  it('should assign unique refs to elements', async () => {
    document.body.innerHTML = `
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    `;

    const tree = await buildAccessibilityTree();

    const refs = tree.elements.map((el) => el.ref);
    expect(refs).toEqual(['e1', 'e2', 'e3']);
  });

  it('should extract role and description', async () => {
    document.body.innerHTML = `
      <button>Submit Form</button>
      <input type="text" aria-label="Username" />
      <a href="/home">Home</a>
    `;

    const tree = await buildAccessibilityTree();

    expect(tree.elements.length).toBeGreaterThanOrEqual(3);
    expect(tree.elements[0]?.role).toBe('button');
    expect(tree.elements[0]?.description).toContain('Submit');

    expect(tree.elements[1]?.role).toBe('textbox');
    expect(tree.elements[1]?.description).toContain('Username');

    expect(tree.elements[2]?.role).toBe('link');
    expect(tree.elements[2]?.description).toContain('Home');
  });
});

describe('formatAsYAML', () => {
  it('should format snapshot as YAML string', () => {
    const snapshot: AccessibilitySnapshot = {
      url: 'https://example.com',
      title: 'Example Page',
      elements: [
        {
          role: 'button',
          ref: 'e1',
          description: 'Submit Form',
        },
        {
          role: 'textbox',
          state: ['focused'],
          ref: 'e2',
          description: 'Username input',
        },
      ],
    };

    const yaml = formatAsYAML(snapshot);

    expect(yaml).toContain('- Page URL: https://example.com');
    expect(yaml).toContain('- Page Title: Example Page');
    expect(yaml).toContain('- Page Snapshot:');
    expect(yaml).toContain('  - button [ref=e1]: "Submit Form"');
    expect(yaml).toContain('  - textbox [focused] [ref=e2]: "Username input"');
  });
});
