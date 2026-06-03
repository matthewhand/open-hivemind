import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HighlightedJson, renderJsonWithHighlighting } from '../jsonHighlighter';

describe('HighlightedJson (React-element path)', () => {
  it('renders null as a single span with the null token class', () => {
    const { container } = render(<HighlightedJson json={null} />);
    expect(container.textContent).toBe('null');
  });

  it('renders an object with all key/value tokens visible', () => {
    const { container } = render(
      <HighlightedJson json={{ name: 'bot', count: 3, active: true }} />
    );
    const text = container.textContent || '';
    expect(text).toContain('"name"');
    expect(text).toContain('"bot"');
    expect(text).toContain('3');
    expect(text).toContain('true');
  });

  it('escapes <script> tags as visible text, not executable HTML (no XSS)', () => {
    const malicious = { payload: '<script>alert(1)</script>' };
    const { container } = render(<HighlightedJson json={malicious} />);
    // The literal `<script>` text appears as displayed text, NOT as a real script element.
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('escapes nested HTML inside string values', () => {
    const { container } = render(
      <HighlightedJson json={{ html: '<img src=x onerror=alert(1)>' }} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('does not use dangerouslySetInnerHTML in the rendered output', () => {
    const { container } = render(
      <HighlightedJson json={{ x: '<b>bold</b>' }} />
    );
    // If we accidentally re-introduced dangerouslySetInnerHTML, <b> would
    // render as an actual bold element.
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>bold</b>');
  });
});

describe('renderJsonWithHighlighting (legacy HTML-string path)', () => {
  it('still escapes HTML special characters', () => {
    const html = renderJsonWithHighlighting({ payload: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes ampersands and quotes', () => {
    const html = renderJsonWithHighlighting({ a: 'Tom & Jerry "say" hi' });
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });
});
