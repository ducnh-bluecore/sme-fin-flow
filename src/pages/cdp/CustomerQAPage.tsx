import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageCircle, User, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useCDPQA } from '@/hooks/useCDPQA';

const SUGGESTED_QUESTIONS = [
  'Có bao nhiêu khách hàng VIP đang hoạt động?',
  'Top 10 khách hàng theo giá trị LTV?',
  'So sánh LTV theo cohort năm 2024 và 2023?',
  'Tỷ lệ giữ chân khách hàng theo nguồn?',
  'Khách hàng nào có nguy cơ rời bỏ cao?',
  'Phân bổ khách hàng theo tier?',
];

export default function CustomerQAPage() {
  const { messages, isLoading, sendMessage, clearMessages } = useCDPQA();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput('');
    await sendMessage(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>Hỏi về Khách hàng | CDP - Bluecore</title>
        <meta name="description" content="Hỏi đáp tự nhiên về dữ liệu khách hàng với AI" />
      </Helmet>

      <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Hỏi về Khách hàng
                <Badge variant="secondary" className="ml-2">AI</Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Đặt câu hỏi bằng tiếng Việt tự nhiên về dữ liệu khách hàng
              </p>
            </div>
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearMessages}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Bắt đầu cuộc trò chuyện</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  Hỏi bất kỳ câu hỏi nào về khách hàng. AI sẽ truy vấn dữ liệu và trả lời cho bạn.
                </p>
                
                {/* Suggested Questions */}
                <div className="w-full max-w-lg">
                  <p className="text-xs text-muted-foreground mb-3">Câu hỏi gợi ý:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSuggestedQuestion(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về khách hàng..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </CDPLayout>
  );
}
