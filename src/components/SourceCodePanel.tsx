type Props = {
  html: string;
};

export default function SourceCodePanel({ html }: Props) {
  return (
    <textarea
      className="h-full min-h-[520px] w-full resize-none border-0 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none"
      readOnly
      value={html}
    />
  );
}
