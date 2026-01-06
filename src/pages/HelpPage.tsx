import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Book,
  MessageCircle,
  Video,
  FileText,
  ExternalLink,
  Search,
  ChevronRight,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const helpCategories = [
  { 
    title: 'Bắt đầu', 
    icon: Book, 
    description: 'Hướng dẫn cơ bản cho người mới',
    articles: 12,
  },
  { 
    title: 'Dashboard & Báo cáo', 
    icon: FileText, 
    description: 'Cách xem và tùy chỉnh báo cáo',
    articles: 8,
  },
  { 
    title: 'Hóa đơn & Đối soát', 
    icon: FileText, 
    description: 'Quản lý hóa đơn và đối soát',
    articles: 15,
  },
  { 
    title: 'Video hướng dẫn', 
    icon: Video, 
    description: 'Xem video hướng dẫn chi tiết',
    articles: 6,
  },
];

const faqs = [
  { 
    question: 'Làm thế nào để kết nối tài khoản ngân hàng?',
    answer: 'Truy cập menu Tích hợp dữ liệu > Kết nối ngân hàng, chọn ngân hàng của bạn và làm theo hướng dẫn xác thực. Hệ thống hỗ trợ hầu hết các ngân hàng lớn tại Việt Nam.',
  },
  { 
    question: 'Tôi có thể xuất báo cáo theo định dạng nào?',
    answer: 'Hệ thống hỗ trợ xuất báo cáo theo các định dạng: Excel (.xlsx), CSV, PDF và JSON. Bạn có thể tùy chỉnh các trường dữ liệu cần xuất.',
  },
  { 
    question: 'Làm sao để thiết lập cảnh báo tự động?',
    answer: 'Vào mục Cảnh báo > Cấu hình cảnh báo. Tại đây bạn có thể thiết lập các ngưỡng cảnh báo cho tiền mặt, công nợ quá hạn, và các chỉ số tài chính khác.',
  },
  { 
    question: 'Hệ thống có hỗ trợ đa tiền tệ không?',
    answer: 'Có, hệ thống hỗ trợ đa tiền tệ. Bạn có thể cấu hình tỷ giá chuyển đổi tự động hoặc nhập thủ công trong phần Cài đặt > Hệ thống.',
  },
  { 
    question: 'Làm thế nào để phân quyền người dùng?',
    answer: 'Truy cập Quản trị & Bảo mật > Phân quyền RBAC. Tại đây bạn có thể tạo các role với quyền hạn cụ thể và gán cho từng người dùng.',
  },
];

export default function HelpPage() {
  return (
    <>
      <Helmet>
        <title>Trợ giúp | Bluecore Finance</title>
        <meta name="description" content="Trung tâm trợ giúp và hỗ trợ" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Trung tâm trợ giúp</h1>
          <p className="text-muted-foreground mb-6">Tìm câu trả lời cho mọi thắc mắc của bạn</p>
          
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm câu hỏi hoặc hướng dẫn..." 
              className="pl-12 h-12 text-lg"
            />
          </div>
        </motion.div>

        {/* Help Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-semibold text-lg mb-4">Danh mục hướng dẫn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpCategories.map((category, index) => (
              <Card key={index} className="p-5 bg-card shadow-card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{category.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{category.articles} bài viết</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="data-card"
        >
          <h2 className="font-semibold text-lg mb-4">Câu hỏi thường gặp</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold text-lg mb-4">Liên hệ hỗ trợ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Chat trực tuyến</h4>
                  <p className="text-xs text-muted-foreground">Phản hồi trong 5 phút</p>
                </div>
              </div>
              <Button className="w-full">Bắt đầu chat</Button>
            </Card>
            
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h4 className="font-semibold">Email hỗ trợ</h4>
                  <p className="text-xs text-muted-foreground">support@bluecore.vn</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">Gửi email</Button>
            </Card>
            
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h4 className="font-semibold">Hotline</h4>
                  <p className="text-xs text-muted-foreground">1900-xxxx</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>8:00 - 18:00, T2-T6</span>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </>
  );
}
