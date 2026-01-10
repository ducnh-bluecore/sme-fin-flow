import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Plus,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Image,
  Smile,
  Check,
  CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  isGroup?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

const mockChats: Chat[] = [
  { id: '1', name: 'Nhóm Bán hàng Q1', avatar: 'BH', lastMessage: 'Đã cập nhật báo cáo doanh số...', time: '2 phút', unread: 3, online: true, isGroup: true },
  { id: '2', name: 'Nguyễn Văn A', avatar: 'NA', lastMessage: 'Ok em, để anh check lại', time: '15 phút', unread: 0, online: true },
  { id: '3', name: 'Nhóm Kho TT', avatar: 'KT', lastMessage: 'Hàng về rồi nha mọi người', time: '1 giờ', unread: 5, online: true, isGroup: true },
  { id: '4', name: 'Trần Thị B', avatar: 'TB', lastMessage: 'Cảm ơn anh!', time: '2 giờ', unread: 0, online: false },
  { id: '5', name: 'Lê Văn C', avatar: 'LC', lastMessage: 'Để em gửi file qua', time: '3 giờ', unread: 1, online: true },
  { id: '6', name: 'Phạm Thị D', avatar: 'PD', lastMessage: 'Báo cáo tuần này...', time: 'Hôm qua', unread: 0, online: false },
];

const mockMessages: Message[] = [
  { id: '1', content: 'Chào anh, em muốn hỏi về đơn hàng #12345', sender: 'other', time: '09:30', status: 'read' },
  { id: '2', content: 'Chào em, đơn hàng đó đang được xử lý nhé', sender: 'me', time: '09:32', status: 'read' },
  { id: '3', content: 'Dự kiến giao trong ngày hôm nay', sender: 'me', time: '09:32', status: 'read' },
  { id: '4', content: 'Em cảm ơn anh. Khách hàng đang hỏi nên em cần biết để thông báo lại', sender: 'other', time: '09:35', status: 'read' },
  { id: '5', content: 'Ok em, để anh check lại với bên giao hàng', sender: 'me', time: '09:38', status: 'delivered' },
];

function ChatListItem({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        active 
          ? 'bg-amber-500/10 border border-amber-500/30' 
          : 'hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`${chat.isGroup ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'} text-white text-sm font-semibold`}>
              {chat.avatar}
            </AvatarFallback>
          </Avatar>
          {!chat.isGroup && chat.online && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium truncate ${active ? 'text-amber-400' : 'text-slate-200'}`}>
              {chat.name}
            </span>
            <span className="text-xs text-slate-500">{chat.time}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-slate-500 truncate max-w-[150px]">{chat.lastMessage}</span>
            {chat.unread > 0 && (
              <Badge className="h-5 min-w-5 flex items-center justify-center bg-amber-500 text-white text-xs">
                {chat.unread}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isMe = message.sender === 'me';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
        <div className={`p-3 rounded-2xl ${
          isMe 
            ? 'bg-amber-500 text-white rounded-br-sm' 
            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
          <span className="text-xs text-slate-500">{message.time}</span>
          {isMe && (
            message.status === 'read' 
              ? <CheckCheck className="h-3 w-3 text-blue-400" />
              : <Check className="h-3 w-3 text-slate-500" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState<Chat | null>(mockChats[0]);
  const [messageText, setMessageText] = useState('');

  const filteredChats = mockChats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = mockChats.reduce((sum, c) => sum + c.unread, 0);

  return (
    <>
      <Helmet>
        <title>Tin nhắn | Control Tower</title>
      </Helmet>

      <div className="h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Chat List */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-400" />
                  Tin nhắn
                </CardTitle>
                {totalUnread > 0 && (
                  <Badge className="bg-amber-500 text-white">{totalUnread}</Badge>
                )}
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-2">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-2">
                  {filteredChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      active={activeChat?.id === chat.id}
                      onClick={() => setActiveChat(chat)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-2 flex flex-col">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-semibold">
                            {activeChat.avatar}
                          </AvatarFallback>
                        </Avatar>
                        {activeChat.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">{activeChat.name}</h3>
                        <p className="text-xs text-slate-500">
                          {activeChat.online ? 'Đang hoạt động' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-hidden p-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-2">
                      {mockMessages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Input */}
                <div className="p-4 border-t border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                      <Image className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Nhập tin nhắn..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="pr-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                      />
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-slate-200">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Chọn cuộc trò chuyện để bắt đầu</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
