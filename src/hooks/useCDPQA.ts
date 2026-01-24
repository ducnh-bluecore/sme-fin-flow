import { useState, useCallback } from 'react';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cdp-qa`;

export function useCDPQA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: tenantId } = useActiveTenantId();

  const sendMessage = useCallback(async (question: string) => {
    if (!tenantId) {
      toast.error('Vui lòng chọn tenant');
      return;
    }

    // Add user message
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Chưa đăng nhập');
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Quá nhiều yêu cầu, vui lòng thử lại sau');
        }
        if (response.status === 402) {
          throw new Error('Đã hết credits, vui lòng nạp thêm');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Có lỗi xảy ra');
      }

      if (!response.body) {
        throw new Error('Không nhận được phản hồi');
      }

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              // Update the last assistant message
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                  newMessages[lastIdx] = { role: 'assistant', content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
            }
          } catch { /* ignore */ }
        }
        // Final update
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
            newMessages[lastIdx] = { role: 'assistant', content: assistantContent };
          }
          return newMessages;
        });
      }

    } catch (error) {
      console.error('CDP QA error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      toast.error(errorMessage);
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, tenantId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
