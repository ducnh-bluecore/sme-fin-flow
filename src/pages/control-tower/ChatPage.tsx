import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  { icon: TrendingUp, text: 'Doanh số hôm nay như thế nào?', color: 'text-emerald-400' },
  { icon: AlertTriangle, text: 'Có bao nhiêu cảnh báo đang active?', color: 'text-amber-400' },
  { icon: Package, text: 'Sản phẩm nào sắp hết hàng?', color: 'text-blue-400' },
  { icon: DollarSign, text: 'Tổng hợp KPIs quan trọng nhất', color: 'text-purple-400' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: tenantId } = useActiveTenantId();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Fetch context data for AI
      const [alertsRes, metricsRes] = await Promise.all([
        supabase
          .from('alert_instances')
          .select('id, title, severity, status, created_at')
          .eq('tenant_id', tenantId || '')
          .eq('status', 'active')
          .limit(10),
        supabase
          .from('object_calculated_metrics')
          .select('*')
          .eq('tenant_id', tenantId || '')
          .limit(20),
      ]);

      const context = {
        activeAlerts: alertsRes.data || [],
        productMetrics: metricsRes.data || [],
        timestamp: new Date().toISOString(),
      };

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          context,
          tenantId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      
      // Fallback response when edge function is not available
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Tôi hiểu bạn muốn hỏi về: "${text}"\n\nHiện tại tôi đang được cấu hình. Một số thông tin có thể hữu ích:\n\n• **Cảnh báo**: Kiểm tra trang Cảnh báo để xem các alerts đang active\n• **KPIs**: Xem Dashboard để có cái nhìn tổng quan\n• **Tồn kho**: Các sản phẩm có vấn đề sẽ hiển thị trong Alerts\n\nTính năng AI Assistant sẽ sớm được hoàn thiện!`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Đã xóa lịch sử chat');
  };

  return (
    <>
      <Helmet>
        <title>AI Assistant | Control Tower</title>
      </Helmet>

      <div className="h-[calc(100vh-8rem)]">
        <Card className="bg-slate-900/50 border-slate-800/50 h-full flex flex-col">
          {/* Header */}
          <CardHeader className="pb-3 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    AI Assistant
                    <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">Beta</Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-500">Hỏi đáp về KPIs, alerts và dữ liệu kinh doanh</p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearChat}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Xóa chat
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center mb-8">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">
                      Xin chào! Tôi là AI Assistant
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      Tôi có thể giúp bạn trả lời câu hỏi về doanh số, cảnh báo, tồn kho và các KPIs quan trọng khác.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                    {suggestedQuestions.map((q, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => sendMessage(q.text)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-left hover:bg-slate-800 transition-colors"
                      >
                        <q.icon className={`h-5 w-5 ${q.color} flex-shrink-0`} />
                        <span className="text-sm text-slate-300">{q.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={
                            msg.role === 'assistant' 
                              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                              : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                          }>
                            {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`p-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-amber-500 text-white rounded-br-sm'
                            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-60">
                            {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-2xl bg-slate-800 rounded-bl-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                            <span className="text-sm text-slate-400">Đang suy nghĩ...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Hỏi về KPIs, alerts, doanh số..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
              />
              <Button 
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="bg-violet-500 hover:bg-violet-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
