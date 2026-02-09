import ReactMarkdown from 'react-markdown';
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
    <div className="prose prose-sm dark:prose-invert max-w-none">
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
        return <ReactMarkdown key={i}>{seg.content}</ReactMarkdown>;
      })}
    </div>
  );
}
