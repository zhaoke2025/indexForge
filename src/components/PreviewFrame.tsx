type Props = {
  html: string;
  refreshKey: number;
};

const previewStorageScript = `<script>
    window.__indexForgePreviewStorage = (() => {
      const values = new Map();
      return {
        get length() { return values.size; },
        getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
        setItem(key, value) { values.set(String(key), String(value)); },
        removeItem(key) { values.delete(String(key)); },
        clear() { values.clear(); },
        key(index) { return Array.from(values.keys())[index] ?? null; }
      };
    })();
  </script>`;

function replaceSandboxedStorage(html: string) {
  const storageReference = /\b(?:(?:window|globalThis)\.)?(?:localStorage|sessionStorage)\b/g;
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (script, attributes: string, code: string) => {
    if (/\bsrc\s*=/i.test(attributes)) return script;
    return `<script${attributes}>${code.replace(storageReference, 'window.__indexForgePreviewStorage')}</script>`;
  });
}

function replaceDelayedInitialization(html: string) {
  return html.replace(/\bwindow\.onload\s*=\s*([A-Za-z_$][\w$]*)\s*;/g, (_statement, initializer: string) => `if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', ${initializer}, { once: true });
        } else {
          ${initializer}();
        }`);
}

export function buildPreviewHtml(html: string): string {
  const previewHtml = html
    .replace(
      /function loadPage\(file\) \{[\s\S]*?\n        \}/,
      `function loadPage(file) {
            contentFrame.src = 'about:blank';
        }`,
    );
  return replaceDelayedInitialization(replaceSandboxedStorage(previewHtml))
    .replace(/<head([^>]*)>/i, (head) => `${head}\n  ${previewStorageScript}`);
}

export default function PreviewFrame({ html, refreshKey }: Props) {
  return (
    <iframe
      key={refreshKey}
      className="h-full min-h-[520px] w-full border-0 bg-white"
      sandbox="allow-scripts allow-forms allow-modals allow-popups"
      srcDoc={buildPreviewHtml(html)}
      title="生成结果预览"
    />
  );
}
