import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIChartRenderer, { type AIChartConfig } from './AIChartRenderer';

interface Segment {
  type: 'text' | 'chart';
  content: string;
}

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```chart\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'chart', content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return segments;
}

export default function AIMessageContent({ content }: { content: string }) {
  if (!content) return <p className="text-muted-foreground">...</p>;

  const segments = parseSegments(content);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:border [&_th]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-sm [&_td]:border [&_td]:border-border [&_tr:nth-child(even)]:bg-muted/30">
      {segments.map((seg, i) => {
        if (seg.type === 'chart') {
          try {
            const config: AIChartConfig = JSON.parse(seg.content);
            if (config.type && config.data && config.series) {
              return <AIChartRenderer key={i} config={config} />;
            }
          } catch {
            // Fallback: show as code block
          }
          return (
            <pre key={i} className="bg-muted rounded p-3 text-xs overflow-auto">
              <code>{seg.content}</code>
            </pre>
          );
        }
        return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{seg.content}</ReactMarkdown>;
      })}
    </div>
  );
}
