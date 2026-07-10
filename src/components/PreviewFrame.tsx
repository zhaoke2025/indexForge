type Props = {
  html: string;
  refreshKey: number;
};

function buildPreviewHtml(html: string): string {
  return html.replace(
    /function loadPage\(file\) \{[\s\S]*?\n        \}/,
    `function loadPage(file) {
            contentFrame.src = 'about:blank';
        }`,
  );
}

export default function PreviewFrame({ html, refreshKey }: Props) {
  return (
    <iframe
      key={refreshKey}
      className="h-full min-h-[520px] w-full border-0 bg-white"
      sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
      srcDoc={buildPreviewHtml(html)}
      title="生成结果预览"
    />
  );
}
