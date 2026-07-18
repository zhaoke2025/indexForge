import { describe, expect, it } from 'vitest';
import { buildPreviewHtml } from './PreviewFrame';

describe('preview HTML sandbox compatibility', () => {
  it('routes browser storage calls to the in-memory preview storage', () => {
    const html = `<!DOCTYPE html><html><head></head><body>
      <script>
        const collapsed = localStorage.getItem('sidebarCollapsed');
        window.localStorage.setItem('sidebarCollapsed', 'true');
        globalThis.sessionStorage.removeItem('activeMenu');
      </script>
    </body></html>`;

    const preview = buildPreviewHtml(html);
    expect(preview).toContain('window.__indexForgePreviewStorage = (() =>');
    expect(preview).toContain("window.__indexForgePreviewStorage.getItem('sidebarCollapsed')");
    expect(preview).toContain("window.__indexForgePreviewStorage.setItem('sidebarCollapsed', 'true')");
    expect(preview).toContain("window.__indexForgePreviewStorage.removeItem('activeMenu')");
  });

  it('does not rewrite storage text outside inline scripts or external script URLs', () => {
    const html = `<!DOCTYPE html><html><head>
      <script src="https://example.com/localStorage.js"></script>
    </head><body><p>localStorage</p></body></html>`;

    const preview = buildPreviewHtml(html);
    expect(preview).toContain('src="https://example.com/localStorage.js"');
    expect(preview).toContain('<p>localStorage</p>');
  });

  it('does not wait for external resources before initializing generated menus', () => {
    const html = `<!DOCTYPE html><html><head>
      <script src="https://cdn.tailwindcss.com"></script>
    </head><body><script>
      function init() { renderPrimaryMenu(); }
      window.onload = init;
    </script></body></html>`;

    const preview = buildPreviewHtml(html);
    expect(preview).not.toContain('window.onload = init');
    expect(preview).toContain("document.addEventListener('DOMContentLoaded', init, { once: true })");
    expect(preview).toContain('init();');
  });
});
