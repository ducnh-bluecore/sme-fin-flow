import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Download,
  FileSpreadsheet,
  Upload,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface DataTemplate {
  id: string;
  name: string;
  description: string;
  columns: {
    name: string;
    required: boolean;
    type: string;
    description: string;
    example: string;
  }[];
  sampleCsv: string;
}

const templates: DataTemplate[] = [
  {
    id: 'customers',
    name: 'Khách hàng (Customers)',
    description: 'Danh sách khách hàng để theo dõi công nợ và phân tích doanh thu',
    columns: [
      { name: 'name', required: true, type: 'text', description: 'Tên khách hàng/công ty', example: 'Công ty TNHH ABC' },
      { name: 'email', required: false, type: 'text', description: 'Email liên hệ', example: 'contact@abc.com.vn' },
      { name: 'phone', required: false, type: 'text', description: 'Số điện thoại', example: '028-1234-5678' },
      { name: 'address', required: false, type: 'text', description: 'Địa chỉ', example: '123 Nguyễn Huệ, Q1' },
      { name: 'tax_code', required: false, type: 'text', description: 'Mã số thuế', example: '0312345678' },
      { name: 'credit_limit', required: false, type: 'number', description: 'Hạn mức tín dụng (VND)', example: '500000000' },
      { name: 'payment_terms', required: false, type: 'number', description: 'Số ngày thanh toán', example: '30' },
      { name: 'status', required: false, type: 'text', description: '"active" hoặc "inactive"', example: 'active' },
    ],
    sampleCsv: `name,email,phone,address,tax_code,credit_limit,payment_terms,status
Công ty TNHH ABC,contact@abc.com.vn,028-1234-5678,"123 Nguyễn Huệ, Q1, TP.HCM",0312345678,500000000,30,active
Công ty CP XYZ,info@xyz.vn,024-9876-5432,"456 Lê Lợi, Hà Nội",0109876543,200000000,45,active`,
  },
  {
    id: 'vendors',
    name: 'Nhà cung cấp (Vendors)',
    description: 'Danh sách nhà cung cấp để quản lý mua hàng và công nợ phải trả',
    columns: [
      { name: 'name', required: true, type: 'text', description: 'Tên nhà cung cấp', example: 'NCC Vật liệu ABC' },
      { name: 'email', required: false, type: 'text', description: 'Email liên hệ', example: 'abc@supplier.vn' },
      { name: 'phone', required: false, type: 'text', description: 'Số điện thoại', example: '028-5555-1234' },
      { name: 'address', required: false, type: 'text', description: 'Địa chỉ', example: '789 Điện Biên Phủ, Q3' },
      { name: 'tax_code', required: false, type: 'text', description: 'Mã số thuế', example: '0301234567' },
      { name: 'bank_account', required: false, type: 'text', description: 'Số tài khoản ngân hàng', example: '0071001234567' },
      { name: 'bank_name', required: false, type: 'text', description: 'Tên ngân hàng', example: 'Vietcombank' },
      { name: 'payment_terms', required: false, type: 'number', description: 'Số ngày thanh toán', example: '30' },
    ],
    sampleCsv: `name,email,phone,address,tax_code,bank_account,bank_name,payment_terms,status
NCC Vật liệu ABC,abc@supplier.vn,028-5555-1234,"789 Điện Biên Phủ, Q3",0301234567,0071001234567,Vietcombank,30,active
NCC Thiết bị XYZ,xyz@equipment.com,024-6666-5678,"123 Trần Duy Hưng, HN",0101234567,0061001234567,Techcombank,45,active`,
  },
  {
    id: 'invoices',
    name: 'Hóa đơn bán (Invoices)',
    description: 'Hóa đơn bán hàng để theo dõi doanh thu và công nợ phải thu',
    columns: [
      { name: 'invoice_number', required: true, type: 'text', description: 'Số hóa đơn (unique)', example: 'INV-2025-0001' },
      { name: 'customer_name', required: true, type: 'text', description: 'Tên khách hàng', example: 'Công ty TNHH ABC' },
      { name: 'issue_date', required: true, type: 'date', description: 'Ngày phát hành', example: '2025-01-01' },
      { name: 'due_date', required: true, type: 'date', description: 'Ngày đến hạn', example: '2025-01-31' },
      { name: 'subtotal', required: true, type: 'number', description: 'Tổng trước thuế', example: '100000000' },
      { name: 'vat_amount', required: false, type: 'number', description: 'Tiền thuế VAT', example: '10000000' },
      { name: 'discount_amount', required: false, type: 'number', description: 'Tiền giảm giá', example: '0' },
      { name: 'total_amount', required: true, type: 'number', description: 'Tổng sau thuế', example: '110000000' },
      { name: 'status', required: false, type: 'text', description: 'Trạng thái', example: 'sent' },
    ],
    sampleCsv: `invoice_number,customer_name,issue_date,due_date,subtotal,vat_amount,discount_amount,total_amount,status,currency_code,notes
INV-2025-0001,Công ty TNHH ABC,2025-01-01,2025-01-31,100000000,10000000,0,110000000,sent,VND,Thanh toán 30 ngày
INV-2025-0002,Công ty CP XYZ,2025-01-02,2025-02-01,50000000,5000000,2000000,53000000,sent,VND,Giảm giá 2%`,
  },
  {
    id: 'bills',
    name: 'Hóa đơn mua (Bills)',
    description: 'Hóa đơn mua hàng để theo dõi chi phí và công nợ phải trả',
    columns: [
      { name: 'bill_number', required: true, type: 'text', description: 'Số hóa đơn nội bộ', example: 'BILL-2025-0001' },
      { name: 'vendor_name', required: true, type: 'text', description: 'Tên nhà cung cấp', example: 'NCC Vật liệu ABC' },
      { name: 'bill_date', required: true, type: 'date', description: 'Ngày hóa đơn', example: '2025-01-01' },
      { name: 'due_date', required: true, type: 'date', description: 'Ngày đến hạn', example: '2025-01-31' },
      { name: 'subtotal', required: true, type: 'number', description: 'Tổng trước thuế', example: '80000000' },
      { name: 'vat_amount', required: false, type: 'number', description: 'Tiền thuế VAT', example: '8000000' },
      { name: 'total_amount', required: true, type: 'number', description: 'Tổng sau thuế', example: '88000000' },
      { name: 'status', required: false, type: 'text', description: 'Trạng thái', example: 'approved' },
      { name: 'expense_category', required: false, type: 'text', description: 'Phân loại chi phí', example: 'materials' },
    ],
    sampleCsv: `bill_number,vendor_name,vendor_bill_number,bill_date,due_date,subtotal,vat_amount,discount_amount,total_amount,status,expense_category,currency_code
BILL-2025-0001,NCC Vật liệu ABC,VL-123456,2025-01-01,2025-01-31,80000000,8000000,0,88000000,approved,materials,VND
BILL-2025-0002,NCC Thiết bị XYZ,TB-789012,2025-01-05,2025-02-04,150000000,15000000,5000000,160000000,pending,equipment,VND`,
  },
  {
    id: 'bank_transactions',
    name: 'Giao dịch ngân hàng',
    description: 'Sao kê ngân hàng để đối chiếu và theo dõi dòng tiền',
    columns: [
      { name: 'bank_account_number', required: true, type: 'text', description: 'Số tài khoản ngân hàng', example: '0071001234567' },
      { name: 'transaction_date', required: true, type: 'date', description: 'Ngày giao dịch', example: '2025-01-02' },
      { name: 'transaction_type', required: true, type: 'text', description: '"credit" (vào) hoặc "debit" (ra)', example: 'credit' },
      { name: 'amount', required: true, type: 'number', description: 'Số tiền (luôn dương)', example: '50000000' },
      { name: 'description', required: false, type: 'text', description: 'Nội dung giao dịch', example: 'TT HĐ INV-2024-001' },
      { name: 'reference', required: false, type: 'text', description: 'Mã tham chiếu ngân hàng', example: 'FT25002123456' },
    ],
    sampleCsv: `bank_account_number,transaction_date,transaction_type,amount,description,reference
0071001234567,2025-01-02,credit,50000000,TT HĐ INV-2024-001 CONG TY ABC,FT25002123456
0071001234567,2025-01-03,debit,20000000,Chi lương tháng 12/2024,FT25003654321
0071001234567,2025-01-04,credit,30000000,TT HĐ INV-2024-002 CONG TY XYZ,FT25004789012`,
  },
  {
    id: 'expenses',
    name: 'Chi phí (Expenses)',
    description: 'Các khoản chi phí hoạt động để phân tích và kiểm soát',
    columns: [
      { name: 'expense_date', required: true, type: 'date', description: 'Ngày chi', example: '2025-01-01' },
      { name: 'category', required: true, type: 'text', description: 'Danh mục chi phí', example: 'rent' },
      { name: 'description', required: true, type: 'text', description: 'Mô tả chi tiết', example: 'Tiền thuê VP tháng 1' },
      { name: 'amount', required: true, type: 'number', description: 'Số tiền (VND)', example: '50000000' },
      { name: 'vendor_name', required: false, type: 'text', description: 'Tên người nhận', example: 'Công ty BĐS ABC' },
      { name: 'payment_method', required: false, type: 'text', description: 'Phương thức TT', example: 'bank_transfer' },
      { name: 'reference_number', required: false, type: 'text', description: 'Số chứng từ', example: 'CHI-2025-001' },
    ],
    sampleCsv: `expense_date,category,description,amount,vendor_name,payment_method,reference_number,subcategory,notes,is_recurring
2025-01-01,rent,Tiền thuê văn phòng tháng 1/2025,50000000,Công ty BĐS ABC,bank_transfer,CHI-2025-001,office,Hợp đồng 12 tháng,true
2025-01-02,utilities,Tiền điện tháng 12/2024,5000000,EVN,bank_transfer,CHI-2025-002,electricity,,false
2025-01-03,marketing,Quảng cáo Facebook tháng 1,20000000,Meta,card,CHI-2025-003,digital_ads,Campaign Q1,false`,
  },
  {
    id: 'orders',
    name: 'Đơn hàng (Orders)',
    description: 'Đơn hàng từ các kênh bán hàng để theo dõi chuyển đổi',
    columns: [
      { name: 'order_number', required: true, type: 'text', description: 'Mã đơn hàng', example: 'ORD-2025-0001' },
      { name: 'customer_name', required: true, type: 'text', description: 'Tên khách hàng', example: 'Nguyễn Văn A' },
      { name: 'source', required: true, type: 'text', description: 'Nguồn đơn hàng', example: 'shopee' },
      { name: 'order_date', required: true, type: 'datetime', description: 'Thời điểm đặt hàng', example: '2025-01-01T10:30:00' },
      { name: 'total_amount', required: true, type: 'number', description: 'Tổng giá trị', example: '1500000' },
      { name: 'status', required: false, type: 'text', description: 'Trạng thái', example: 'pending' },
      { name: 'notes', required: false, type: 'text', description: 'Ghi chú', example: 'Đơn từ website' },
    ],
    sampleCsv: `order_number,customer_name,source,order_date,total_amount,status,notes
ORD-2025-0001,Nguyễn Văn A,website,2025-01-01T10:30:00,1500000,pending,Đơn hàng từ website
SPE-2025-0001,Trần Thị B,shopee,2025-01-01T11:00:00,2500000,approved,Shopee Mall
LZD-2025-0001,Lê Văn C,lazada,2025-01-01T12:00:00,3200000,invoiced,LazMall`,
  },
];

const integrationSteps = [
  {
    step: 1,
    title: 'Chuẩn bị dữ liệu',
    description: 'Xuất dữ liệu từ hệ thống ERP/kế toán hoặc sàn TMĐT của bạn',
    tips: [
      'Đảm bảo dữ liệu đầy đủ các cột bắt buộc (*)',
      'Định dạng ngày tháng: YYYY-MM-DD hoặc DD/MM/YYYY',
      'Số tiền không có dấu phân cách hàng nghìn',
    ],
  },
  {
    step: 2,
    title: 'Chuyển đổi format',
    description: 'Điều chỉnh file theo template mẫu của hệ thống',
    tips: [
      'Sử dụng template CSV mẫu để đối chiếu cột',
      'Kiểm tra encoding UTF-8 cho tiếng Việt',
      'Loại bỏ các dòng trống hoặc header thừa',
    ],
  },
  {
    step: 3,
    title: 'Upload & Validate',
    description: 'Tải lên hệ thống và kiểm tra dữ liệu',
    tips: [
      'Hệ thống sẽ tự động validate format',
      'Xem preview trước khi xác nhận import',
      'Sửa lỗi nếu có và import lại',
    ],
  },
  {
    step: 4,
    title: 'Xác nhận & Đồng bộ',
    description: 'Dữ liệu được import vào hệ thống và sẵn sàng sử dụng',
    tips: [
      'Kiểm tra dữ liệu sau import trong các dashboard',
      'Thiết lập lịch đồng bộ tự động nếu cần',
      'Liên hệ support nếu có vấn đề',
    ],
  },
];

function TemplateCard({ template }: { template: DataTemplate }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template.sampleCsv);
    toast.success('Đã copy CSV mẫu');
  };

  const handleDownload = () => {
    const blob = new Blob([template.sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${template.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã tải template ${template.name}`);
  };

  return (
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Column definitions */}
            <div>
              <h4 className="font-medium mb-2 text-sm">Cấu trúc cột:</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Tên cột</th>
                      <th className="text-left p-2 font-medium">Bắt buộc</th>
                      <th className="text-left p-2 font-medium">Kiểu</th>
                      <th className="text-left p-2 font-medium hidden md:table-cell">Mô tả</th>
                      <th className="text-left p-2 font-medium hidden lg:table-cell">Ví dụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.columns.map((col) => (
                      <tr key={col.name} className="border-t">
                        <td className="p-2 font-mono text-xs">{col.name}</td>
                        <td className="p-2">
                          {col.required ? (
                            <Badge variant="destructive" className="text-[10px]">Bắt buộc</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Tùy chọn</Badge>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">{col.type}</td>
                        <td className="p-2 text-muted-foreground hidden md:table-cell">{col.description}</td>
                        <td className="p-2 font-mono text-xs hidden lg:table-cell">{col.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample CSV */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">CSV mẫu:</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Tải về
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap">{template.sampleCsv}</pre>
              </ScrollArea>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function DataGuidePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <Helmet>
        <title>Hướng dẫn tích hợp dữ liệu | Bluecore Platform</title>
        <meta name="description" content="Hướng dẫn chi tiết cách tích hợp và import dữ liệu vào Bluecore Platform" />
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Hướng dẫn tích hợp dữ liệu</h1>
                  <p className="text-sm text-muted-foreground">
                    Template, format và quy trình import dữ liệu vào hệ thống
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/data-hub">
                    <Database className="h-4 w-4 mr-2" />
                    Data Hub
                  </Link>
                </Button>
                <Button asChild>
                  <a href="/docs/system-data-requirements.md" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Tài liệu đầy đủ
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="templates">Template</TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Important Notice */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">Lưu ý quan trọng</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hệ thống Bluecore <strong>KHÔNG</strong> phải là nơi nhập liệu gốc. 
                      Dữ liệu được tích hợp từ các hệ thống ERP, kế toán, sàn TMĐT để phân tích và giám sát.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Data Flow Diagram */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Luồng dữ liệu
                  </CardTitle>
                  <CardDescription>
                    Cách dữ liệu được tích hợp vào hệ thống Bluecore
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Sources */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Nguồn dữ liệu</h4>
                      <div className="space-y-2">
                        {['ERP/Kế toán (SAP, MISA...)', 'Sàn TMĐT (Shopee, Lazada...)', 'Ngân hàng (API, File sao kê)'].map((source) => (
                          <div key={source} className="p-3 rounded-lg bg-muted/50 text-sm">
                            {source}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Methods */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Phương thức</h4>
                      <div className="space-y-2">
                        {[
                          { name: 'API Realtime', desc: 'REST/GraphQL' },
                          { name: 'File Import', desc: 'CSV, Excel, JSON' },
                          { name: 'Webhook', desc: 'Tự động theo lịch' },
                        ].map((method) => (
                          <div key={method.name} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="font-medium text-sm">{method.name}</p>
                            <p className="text-xs text-muted-foreground">{method.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outputs */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Đầu ra</h4>
                      <div className="space-y-2">
                        {['Dashboard CFO', 'Phân tích tài chính', 'Cảnh báo thông minh', 'Dự báo dòng tiền'].map((output) => (
                          <div key={output} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4 inline mr-2" />
                            {output}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Integration Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Quy trình import dữ liệu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    {integrationSteps.map((step, index) => (
                      <div key={step.step} className="relative">
                        {index < integrationSteps.length - 1 && (
                          <ArrowRight className="hidden md:block absolute -right-3 top-8 h-6 w-6 text-muted-foreground/30 z-10" />
                        )}
                        <div className="p-4 rounded-lg border bg-card h-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                              {step.step}
                            </span>
                            <h4 className="font-medium text-sm">{step.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{step.description}</p>
                          <ul className="space-y-1">
                            {step.tips.map((tip, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <span className="text-primary">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Supported Formats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Định dạng hỗ trợ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { format: 'CSV', ext: '.csv', note: 'Encoding UTF-8, dấu phân cách dấu phẩy hoặc chấm phẩy' },
                      { format: 'Excel', ext: '.xlsx, .xls', note: 'Sheet đầu tiên được sử dụng' },
                      { format: 'JSON', ext: '.json', note: 'Array of objects' },
                    ].map((f) => (
                      <div key={f.format} className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                          <span className="font-medium">{f.format}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{f.ext}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{f.note}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Template Import</h2>
                  <p className="text-sm text-muted-foreground">Click vào từng template để xem chi tiết và tải về</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {templates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </TabsContent>

            {/* Mapping Tab */}
            <TabsContent value="mapping" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mapping từ MISA</CardTitle>
                  <CardDescription>Cách chuyển đổi dữ liệu từ phần mềm MISA sang Bluecore</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Bảng MISA</th>
                          <th className="text-left p-3 font-medium">→</th>
                          <th className="text-left p-3 font-medium">Bảng Bluecore</th>
                          <th className="text-left p-3 font-medium">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { from: 'Danh mục khách hàng', to: 'customers', note: 'Map theo MST' },
                          { from: 'Danh mục nhà cung cấp', to: 'vendors', note: 'Map theo MST' },
                          { from: 'Hóa đơn bán hàng', to: 'invoices', note: 'Lấy HĐ đã phát hành' },
                          { from: 'Hóa đơn mua hàng', to: 'bills', note: 'Lấy HĐ đã nhập' },
                          { from: 'Sổ quỹ tiền mặt', to: 'bank_transactions', note: 'type=cash' },
                          { from: 'Sổ tiền gửi ngân hàng', to: 'bank_transactions', note: 'type=bank' },
                        ].map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3">{row.from}</td>
                            <td className="p-3 text-primary"><ArrowRight className="h-4 w-4" /></td>
                            <td className="p-3 font-mono text-sm">{row.to}</td>
                            <td className="p-3 text-muted-foreground">{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mapping từ SAP Business One</CardTitle>
                  <CardDescription>Cách chuyển đổi dữ liệu từ SAP B1 sang Bluecore</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">SAP Table</th>
                          <th className="text-left p-3 font-medium">→</th>
                          <th className="text-left p-3 font-medium">Bảng Bluecore</th>
                          <th className="text-left p-3 font-medium">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { from: 'OCRD (BP Master)', to: 'customers/vendors', note: 'BP_TYPE để phân loại' },
                          { from: 'OINV (AR Invoices)', to: 'invoices', note: 'DocStatus=O (Open)' },
                          { from: 'OPCH (AP Invoices)', to: 'bills', note: 'DocStatus=O (Open)' },
                          { from: 'OBNK (Bank Statements)', to: 'bank_transactions', note: 'Import statement' },
                        ].map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3 font-mono text-sm">{row.from}</td>
                            <td className="p-3 text-primary"><ArrowRight className="h-4 w-4" /></td>
                            <td className="p-3 font-mono text-sm">{row.to}</td>
                            <td className="p-3 text-muted-foreground">{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mapping từ sàn TMĐT</CardTitle>
                  <CardDescription>Cách import đơn hàng từ các sàn thương mại điện tử</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Nguồn</th>
                          <th className="text-left p-3 font-medium">Cột gốc</th>
                          <th className="text-left p-3 font-medium">→</th>
                          <th className="text-left p-3 font-medium">Cột Bluecore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { source: 'Shopee', from: 'Mã đơn hàng', to: 'order_number' },
                          { source: 'Shopee', from: 'Tên người mua', to: 'customer_name' },
                          { source: 'Shopee', from: 'Tổng tiền', to: 'total_amount' },
                          { source: 'Lazada', from: 'Order Number', to: 'order_number' },
                          { source: 'Lazada', from: 'Customer Name', to: 'customer_name' },
                          { source: 'TikTok', from: 'Order ID', to: 'order_number' },
                        ].map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3">
                              <Badge variant="outline">{row.source}</Badge>
                            </td>
                            <td className="p-3">{row.from}</td>
                            <td className="p-3 text-primary"><ArrowRight className="h-4 w-4" /></td>
                            <td className="p-3 font-mono text-sm">{row.to}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
