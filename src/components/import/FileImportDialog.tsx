import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileSpreadsheet, 
  Table, 
  FileText, 
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  Loader2,
  AlertTriangle,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { parseFile, validateHeaders, type ParsedData } from '@/lib/fileParser';
import { useDataImport } from '@/hooks/useDataImport';

// Template definitions
const importTemplates = [
  {
    id: 'invoices',
    name: 'Hóa đơn bán hàng',
    description: 'Mẫu import danh sách hóa đơn AR',
    icon: FileSpreadsheet,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    columns: ['invoice_number', 'customer_name', 'issue_date', 'due_date', 'subtotal', 'vat_amount', 'total_amount', 'status', 'notes'],
    sampleData: [
      ['INV-2026-001', 'Công ty ABC', '2026-01-15', '2026-02-15', '10000000', '1000000', '11000000', 'pending', 'Thanh toán 30 ngày'],
      ['INV-2026-002', 'Công ty XYZ', '2026-01-16', '2026-01-31', '5500000', '550000', '6050000', 'paid', ''],
    ]
  },
  {
    id: 'bills',
    name: 'Hóa đơn mua hàng',
    description: 'Mẫu import công nợ phải trả AP',
    icon: FileSpreadsheet,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    columns: ['bill_number', 'vendor_name', 'bill_date', 'due_date', 'subtotal', 'vat_amount', 'total_amount', 'expense_category', 'notes'],
    sampleData: [
      ['BILL-2026-001', 'NCC Văn phòng phẩm', '2026-01-10', '2026-02-10', '2000000', '200000', '2200000', 'office_supplies', 'Mua VPP Q1'],
      ['BILL-2026-002', 'Điện lực EVN', '2026-01-05', '2026-01-20', '15000000', '1500000', '16500000', 'utilities', 'Tiền điện T12'],
    ]
  },
  {
    id: 'bank_transactions',
    name: 'Giao dịch ngân hàng',
    description: 'Mẫu import sao kê ngân hàng',
    icon: Table,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    columns: ['transaction_date', 'reference', 'description', 'amount', 'transaction_type', 'bank_account_number'],
    sampleData: [
      ['2026-01-15', 'FT26015123456', 'Thanh toan hoa don INV-001', '11000000', 'credit', '1234567890'],
      ['2026-01-16', 'FT26016789012', 'Chi phi van phong', '-2200000', 'debit', '1234567890'],
    ]
  },
  {
    id: 'customers',
    name: 'Danh sách khách hàng',
    description: 'Mẫu import thông tin khách hàng',
    icon: FileText,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    columns: ['name', 'email', 'phone', 'address', 'tax_code', 'credit_limit', 'payment_terms', 'customer_type'],
    sampleData: [
      ['Công ty TNHH ABC', 'contact@abc.vn', '0901234567', '123 Nguyễn Huệ, Q.1, TP.HCM', '0312345678', '100000000', '30', 'corporate'],
      ['Anh Nguyễn Văn A', 'nguyenvana@gmail.com', '0987654321', '456 Lê Lợi, Q.3, TP.HCM', '', '50000000', '15', 'individual'],
    ]
  },
  {
    id: 'vendors',
    name: 'Danh sách nhà cung cấp',
    description: 'Mẫu import thông tin NCC',
    icon: FileText,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    columns: ['name', 'email', 'phone', 'address', 'tax_code', 'bank_account', 'bank_name', 'payment_terms'],
    sampleData: [
      ['NCC Thiết bị VP', 'sales@thietbivp.vn', '02812345678', '789 Trần Hưng Đạo, Q.5, TP.HCM', '0398765432', '9876543210', 'Vietcombank', '30'],
      ['Công ty Vận tải XYZ', 'info@vantaixyz.com', '02898765432', '321 CMT8, Q.10, TP.HCM', '0312345999', '1234509876', 'Techcombank', '15'],
    ]
  },
  {
    id: 'expenses',
    name: 'Chi phí hoạt động',
    description: 'Mẫu import chi phí',
    icon: Table,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    columns: ['expense_date', 'description', 'category', 'amount', 'vendor_name', 'payment_method', 'reference_number', 'notes'],
    sampleData: [
      ['2026-01-10', 'Mua văn phòng phẩm', 'other', '500000', 'Nhà sách Phương Nam', 'cash', 'EXP-001', 'Mua giấy, bút'],
      ['2026-01-12', 'Tiền xăng xe', 'logistics', '300000', 'Petrolimex', 'bank_transfer', 'EXP-002', 'Đi gặp khách hàng'],
    ]
  },
  {
    id: 'products',
    name: 'Sản phẩm / Dịch vụ',
    description: 'Mẫu import danh mục sản phẩm',
    icon: FileText,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    columns: ['sku', 'name', 'description', 'unit_price', 'cost_price', 'unit', 'category', 'is_active'],
    sampleData: [
      ['SP001', 'Laptop Dell XPS 15', 'Laptop cao cấp 15 inch', '35000000', '30000000', 'cái', 'electronics', 'true'],
      ['DV001', 'Tư vấn kế toán', 'Dịch vụ tư vấn theo giờ', '500000', '0', 'giờ', 'service', 'true'],
    ]
  },
  {
    id: 'payments',
    name: 'Thanh toán khách hàng',
    description: 'Mẫu import thanh toán AR',
    icon: Table,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    columns: ['payment_date', 'invoice_number', 'customer_name', 'amount', 'payment_method', 'reference_number', 'bank_account', 'notes'],
    sampleData: [
      ['2026-01-20', 'INV-2026-001', 'Công ty ABC', '11000000', 'bank_transfer', 'PAY-001', '1234567890', 'Thanh toán đủ'],
      ['2026-01-22', 'INV-2026-002', 'Công ty XYZ', '3000000', 'cash', 'PAY-002', '', 'Thanh toán một phần'],
    ]
  },
  {
    id: 'revenues',
    name: 'Doanh thu',
    description: 'Mẫu import doanh thu theo kênh',
    icon: FileSpreadsheet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    columns: ['revenue_date', 'source', 'channel', 'description', 'amount', 'currency', 'reference_id', 'notes'],
    sampleData: [
      ['2026-01-15', 'shopee', 'online', 'Doanh thu bán hàng Shopee', '15000000', 'VND', 'REV-001', 'Tuần 3 tháng 1'],
      ['2026-01-15', 'direct', 'offline', 'Bán hàng trực tiếp', '8000000', 'VND', 'REV-002', 'Cửa hàng Q1'],
    ]
  },
  {
    id: 'bank_accounts',
    name: 'Tài khoản ngân hàng',
    description: 'Mẫu import danh sách tài khoản',
    icon: Table,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    columns: ['account_number', 'account_name', 'bank_name', 'currency', 'current_balance', 'status'],
    sampleData: [
      ['1234567890', 'TK chính Công ty ABC', 'Vietcombank', 'VND', '500000000', 'active'],
      ['0987654321', 'TK tiết kiệm', 'Techcombank', 'VND', '1000000000', 'active'],
    ]
  },
  {
    id: 'orders',
    name: 'Đơn hàng',
    description: 'Mẫu import đơn hàng e-commerce',
    icon: FileSpreadsheet,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    columns: ['order_id', 'order_date', 'customer_name', 'source', 'status', 'subtotal', 'shipping_fee', 'discount', 'total_amount', 'payment_status'],
    sampleData: [
      ['ORD-2026-001', '2026-01-15', 'Nguyễn Văn A', 'shopee', 'completed', '500000', '30000', '50000', '480000', 'paid'],
      ['ORD-2026-002', '2026-01-16', 'Trần Thị B', 'lazada', 'processing', '1200000', '0', '100000', '1100000', 'pending'],
    ]
  },
  {
    id: 'budgets',
    name: 'Ngân sách',
    description: 'Mẫu import kế hoạch ngân sách',
    icon: Table,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    columns: ['name', 'category', 'period_type', 'period_year', 'period_month', 'budgeted_amount', 'start_date', 'end_date', 'notes'],
    sampleData: [
      ['NS Marketing Q1', 'marketing', 'quarterly', '2026', '', '50000000', '2026-01-01', '2026-03-31', 'Ngân sách quảng cáo'],
      ['NS Lương T1', 'salary', 'monthly', '2026', '1', '200000000', '2026-01-01', '2026-01-31', 'Chi phí nhân sự'],
    ]
  },
  {
    id: 'cash_forecasts',
    name: 'Dự báo dòng tiền',
    description: 'Mẫu import dự báo cash flow',
    icon: FileSpreadsheet,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    columns: ['forecast_date', 'opening_balance', 'inflows', 'outflows', 'closing_balance', 'forecast_type', 'notes'],
    sampleData: [
      ['2026-01-15', '500000000', '150000000', '80000000', '570000000', 'weekly', 'Dự báo tuần 3'],
      ['2026-01-22', '570000000', '200000000', '120000000', '650000000', 'weekly', 'Dự báo tuần 4'],
    ]
  },
  {
    id: 'cash_flow_direct',
    name: 'Dòng tiền trực tiếp',
    description: 'Mẫu import báo cáo lưu chuyển tiền tệ theo phương pháp trực tiếp',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-600/10',
    columns: [
      'period_start', 'period_end', 'period_type', 'is_actual',
      'cash_from_customers', 'cash_from_interest_received', 'cash_from_other_operating',
      'cash_to_suppliers', 'cash_to_employees', 'cash_for_rent', 'cash_for_utilities', 'cash_for_taxes', 'cash_for_interest_paid', 'cash_for_other_operating',
      'cash_from_asset_sales', 'cash_for_asset_purchases', 'cash_for_investments',
      'cash_from_loans', 'cash_from_equity', 'cash_for_loan_repayments', 'cash_for_dividends',
      'opening_cash_balance', 'notes'
    ],
    sampleData: [
      ['2025-12-01', '2025-12-31', 'monthly', 'true', '850000000', '5000000', '10000000', '320000000', '180000000', '45000000', '12000000', '35000000', '8000000', '15000000', '0', '50000000', '0', '0', '0', '25000000', '0', '500000000', 'Báo cáo tháng 12/2025'],
      ['2026-01-01', '2026-01-31', 'monthly', 'false', '920000000', '6000000', '12000000', '350000000', '185000000', '45000000', '13000000', '40000000', '9000000', '18000000', '20000000', '80000000', '0', '100000000', '0', '30000000', '0', '698000000', 'Dự báo tháng 01/2026'],
    ]
  },
  {
    id: 'inventory_items',
    name: 'Tồn kho sản phẩm',
    description: 'Mẫu import danh sách hàng tồn kho để phân tích tuổi tồn',
    icon: Table,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    columns: ['sku', 'product_name', 'category', 'quantity_on_hand', 'unit_cost', 'last_received_date', 'last_sold_date', 'warehouse_location', 'reorder_point', 'notes'],
    sampleData: [
      ['SKU001', 'Áo thun nam basic', 'Thời trang', '150', '85000', '2025-11-15', '2026-01-05', 'Kho A1', '50', 'Bán chạy'],
      ['SKU002', 'Giày thể thao nữ', 'Giày dép', '45', '320000', '2025-08-20', '2025-10-10', 'Kho B2', '20', 'Tồn kho lâu'],
      ['SKU003', 'Túi xách da', 'Phụ kiện', '12', '450000', '2025-05-01', '2025-06-15', 'Kho C1', '10', 'Hàng tồn >6 tháng'],
    ]
  },
  {
    id: 'promotions',
    name: 'Chương trình khuyến mãi',
    description: 'Mẫu import danh sách khuyến mãi và đánh giá ROI',
    icon: FileSpreadsheet,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    columns: ['name', 'description', 'promotion_type', 'discount_type', 'discount_value', 'start_date', 'end_date', 'budget', 'target_revenue', 'status', 'channels', 'notes'],
    sampleData: [
      ['Flash Sale 12.12', 'Giảm giá cuối năm', 'flash_sale', 'percentage', '30', '2025-12-12', '2025-12-12', '50000000', '200000000', 'completed', 'shopee,lazada,tiktok', 'Chiến dịch thành công'],
      ['Tết 2026', 'Khuyến mãi Tết Nguyên Đán', 'seasonal', 'percentage', '20', '2026-01-15', '2026-02-15', '100000000', '500000000', 'active', 'all', 'Chiến dịch đang chạy'],
    ]
  },
  {
    id: 'supplier_payments',
    name: 'Lịch thanh toán NCC',
    description: 'Mẫu import lịch thanh toán nhà cung cấp',
    icon: Table,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    columns: ['vendor_name', 'bill_number', 'bill_date', 'due_date', 'total_amount', 'paid_amount', 'payment_status', 'payment_priority', 'bank_account', 'notes'],
    sampleData: [
      ['NCC Vải ABC', 'BILL-2025-089', '2025-12-15', '2026-01-15', '85000000', '0', 'pending', 'high', 'VCB-123456', 'Thanh toán đúng hạn để giữ ưu đãi'],
      ['NCC Phụ kiện XYZ', 'BILL-2025-092', '2025-12-20', '2026-02-20', '32000000', '10000000', 'partial', 'medium', 'TCB-789012', 'Đã thanh toán 30%'],
    ]
  },
  {
    id: 'gl_accounts',
    name: 'Tài khoản kế toán',
    description: 'Mẫu import hệ thống tài khoản',
    icon: Table,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    columns: ['account_code', 'account_name', 'account_type', 'parent_code', 'is_active', 'description'],
    sampleData: [
      ['111', 'Tiền mặt', 'asset', '', 'true', 'Tiền mặt tại quỹ'],
      ['112', 'Tiền gửi ngân hàng', 'asset', '', 'true', 'Tiền gửi các ngân hàng'],
      ['131', 'Phải thu khách hàng', 'asset', '', 'true', 'Công nợ phải thu'],
    ]
  },
  {
    id: 'bank_covenants',
    name: 'Điều khoản vay ngân hàng',
    description: 'Mẫu import covenant với ngân hàng',
    icon: FileText,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    columns: ['lender_name', 'covenant_name', 'covenant_type', 'threshold_value', 'threshold_operator', 'current_value', 'warning_threshold', 'measurement_frequency', 'next_measurement_date', 'is_active', 'notes'],
    sampleData: [
      ['Vietcombank', 'Tỷ lệ nợ/EBITDA', 'financial_ratio', '3.0', '<=', '2.5', '2.8', 'quarterly', '2026-03-31', 'true', 'Covenant khoản vay dài hạn'],
      ['Techcombank', 'Tỷ lệ thanh toán nhanh', 'financial_ratio', '1.2', '>=', '1.5', '1.3', 'quarterly', '2026-03-31', 'true', 'Quick ratio'],
    ]
  },
  {
    id: 'scenarios',
    name: 'Kịch bản tài chính',
    description: 'Mẫu import kịch bản dự báo',
    icon: FileSpreadsheet,
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
    columns: ['name', 'description', 'scenario_type', 'base_year', 'forecast_months', 'status'],
    sampleData: [
      ['Kịch bản cơ sở 2026', 'Dự báo dựa trên xu hướng hiện tại', 'forecast', '2026', '12', 'active'],
      ['Kịch bản tăng trưởng', 'Dự báo tăng trưởng 20% doanh thu', 'optimistic', '2026', '12', 'draft'],
    ]
  },
  {
    id: 'strategic_initiatives',
    name: 'Sáng kiến chiến lược',
    description: 'Mẫu import các dự án chiến lược',
    icon: FileText,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    columns: ['title', 'description', 'category', 'status', 'priority', 'start_date', 'end_date', 'budget', 'spent', 'progress', 'owner', 'notes'],
    sampleData: [
      ['Mở rộng kênh online', 'Phát triển kênh bán hàng trực tuyến mới', 'growth', 'in_progress', 'high', '2026-01-01', '2026-06-30', '500000000', '150000000', '30', 'Nguyễn Văn A', 'Tăng 30% doanh thu online'],
      ['Tối ưu chi phí vận hành', 'Cắt giảm chi phí logistics', 'efficiency', 'planning', 'medium', '2026-02-01', '2026-12-31', '200000000', '0', '0', 'Trần Thị B', 'Tiết kiệm 15% chi phí'],
    ]
  },
  {
    id: 'journal_entries',
    name: 'Bút toán kế toán',
    description: 'Mẫu import bút toán ghi sổ',
    icon: Table,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    columns: ['entry_number', 'entry_date', 'description', 'reference', 'entry_type', 'status', 'total_debit', 'total_credit'],
    sampleData: [
      ['JE-2026-001', '2026-01-15', 'Ghi nhận doanh thu tháng 1', 'INV-001', 'standard', 'posted', '110000000', '110000000'],
      ['JE-2026-002', '2026-01-20', 'Trích khấu hao TSCĐ', '', 'adjusting', 'draft', '15000000', '15000000'],
    ]
  },
  {
    id: 'credit_notes',
    name: 'Phiếu giảm giá (Credit Note)',
    description: 'Mẫu import phiếu điều chỉnh giảm',
    icon: FileText,
    color: 'text-lime-500',
    bg: 'bg-lime-500/10',
    columns: ['credit_note_number', 'credit_note_date', 'customer_name', 'reason', 'description', 'subtotal', 'vat_amount', 'total_amount', 'status'],
    sampleData: [
      ['CN-2026-001', '2026-01-18', 'Công ty ABC', 'Hàng lỗi', 'Giảm giá sản phẩm lỗi', '5000000', '500000', '5500000', 'approved'],
      ['CN-2026-002', '2026-01-20', 'Công ty XYZ', 'Chiết khấu', 'Chiết khấu thanh toán sớm', '2000000', '200000', '2200000', 'draft'],
    ]
  },
  {
    id: 'debit_notes',
    name: 'Phiếu tăng giá (Debit Note)',
    description: 'Mẫu import phiếu điều chỉnh tăng',
    icon: FileText,
    color: 'text-orange-600',
    bg: 'bg-orange-600/10',
    columns: ['debit_note_number', 'debit_note_date', 'customer_name', 'reason', 'description', 'subtotal', 'vat_amount', 'total_amount', 'status'],
    sampleData: [
      ['DN-2026-001', '2026-01-19', 'Công ty ABC', 'Phí vận chuyển', 'Phụ thu phí ship đặc biệt', '500000', '50000', '550000', 'approved'],
      ['DN-2026-002', '2026-01-21', 'Công ty XYZ', 'Điều chỉnh giá', 'Điều chỉnh tăng giá sản phẩm', '1000000', '100000', '1100000', 'draft'],
    ]
  },
];

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'validating' | 'valid' | 'invalid';
  errorMessage?: string;
  parsedData?: ParsedData;
  selectedTemplate?: string;
}

export function FileImportDialog({ open, onOpenChange, onImportComplete }: FileImportDialogProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const dataImport = useDataImport();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      status: 'validating' as const,
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Parse each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const parsed = await parseFile(file);
      
      setUploadedFiles(prev => prev.map((f, idx) => {
        if (f.file === file) {
          if (parsed.errors.length > 0 && parsed.rows.length === 0) {
            return {
              ...f,
              status: 'invalid',
              errorMessage: parsed.errors[0],
              parsedData: parsed,
            };
          }
          return {
            ...f,
            status: 'valid',
            parsedData: parsed,
          };
        }
        return f;
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileTemplate = (index: number, templateId: string) => {
    setUploadedFiles(prev => prev.map((f, i) => {
      if (i === index) {
        const template = importTemplates.find(t => t.id === templateId);
        if (template && f.parsedData) {
          const validation = validateHeaders(f.parsedData.headers, template.columns);
          return {
            ...f,
            selectedTemplate: templateId,
            status: validation.valid ? 'valid' : 'invalid',
            errorMessage: validation.valid ? undefined : `Thiếu cột: ${validation.missingColumns.join(', ')}`,
          };
        }
        return { ...f, selectedTemplate: templateId };
      }
      return f;
    }));
  };

  const downloadTemplate = (template: typeof importTemplates[0], format: 'csv' | 'xlsx') => {
    try {
      // Generate CSV content with BOM for Excel compatibility
      const headers = template.columns.join(',');
      const rows = template.sampleData.map(row => 
        row.map(cell => {
          // Escape cells that contain commas or quotes
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      );
      const csvContent = '\ufeff' + [headers, ...rows].join('\r\n');
      
      // Create blob and URL
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `template_${template.id}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success(`Đã tải template ${template.name}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Không thể tải file. Vui lòng thử lại.');
    }
  };

  const handleImport = async () => {
    const validFiles = uploadedFiles.filter(f => f.status === 'valid' && f.selectedTemplate && f.parsedData);
    if (validFiles.length === 0) {
      toast.error('Không có file hợp lệ để import. Vui lòng chọn loại dữ liệu cho mỗi file.');
      return;
    }

    if (!dataImport.isReady) {
      toast.error('Chưa chọn tenant. Vui lòng chọn workspace trước khi import.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setImportResults(null);

    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const templateId = file.selectedTemplate!;
      const rows = file.parsedData!.rows;

      setProgress(Math.round((i / validFiles.length) * 50));

      try {
        let result: { success: number; failed: number; errors: string[] };

        switch (templateId) {
          case 'customers':
            result = await dataImport.importCustomers.mutateAsync(rows);
            break;
          case 'vendors':
            result = await dataImport.importVendors.mutateAsync(rows);
            break;
          case 'products':
            result = await dataImport.importProducts.mutateAsync(rows);
            break;
          case 'invoices':
            result = await dataImport.importInvoices.mutateAsync(rows);
            break;
          case 'bills':
            result = await dataImport.importBills.mutateAsync(rows);
            break;
          case 'bank_transactions':
            result = await dataImport.importBankTransactions.mutateAsync(rows);
            break;
          case 'expenses':
            result = await dataImport.importExpenses.mutateAsync(rows);
            break;
          case 'payments':
            result = await dataImport.importPayments.mutateAsync(rows);
            break;
          case 'revenues':
            result = await dataImport.importRevenues.mutateAsync(rows);
            break;
          case 'bank_accounts':
            result = await dataImport.importBankAccounts.mutateAsync(rows);
            break;
          case 'orders':
            result = await dataImport.importOrders.mutateAsync(rows);
            break;
          case 'budgets':
            result = await dataImport.importBudgets.mutateAsync(rows);
            break;
          case 'cash_forecasts':
            result = await dataImport.importCashForecasts.mutateAsync(rows);
            break;
          case 'gl_accounts':
            result = await dataImport.importGLAccounts.mutateAsync(rows);
            break;
          case 'bank_covenants':
            result = await dataImport.importBankCovenants.mutateAsync(rows);
            break;
          case 'scenarios':
            result = await dataImport.importScenarios.mutateAsync(rows);
            break;
          case 'strategic_initiatives':
            result = await dataImport.importStrategicInitiatives.mutateAsync(rows);
            break;
          case 'journal_entries':
            result = await dataImport.importJournalEntries.mutateAsync(rows);
            break;
          case 'credit_notes':
            result = await dataImport.importCreditNotes.mutateAsync(rows);
            break;
          case 'debit_notes':
            result = await dataImport.importDebitNotes.mutateAsync(rows);
            break;
          default:
            result = { success: 0, failed: rows.length, errors: [`Không hỗ trợ loại dữ liệu: ${templateId}`] };
        }

        totalSuccess += result.success;
        totalFailed += result.failed;
        allErrors.push(...result.errors.slice(0, 5)); // Limit errors shown
      } catch (error) {
        totalFailed += rows.length;
        allErrors.push(`${file.file.name}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      }

      setProgress(Math.round(((i + 1) / validFiles.length) * 100));
    }

    setImportResults({ success: totalSuccess, failed: totalFailed, errors: allErrors });
    setIsProcessing(false);

    if (totalSuccess > 0) {
      toast.success(`Đã import thành công ${totalSuccess} dòng dữ liệu`);
      onImportComplete?.();
    }
    if (totalFailed > 0) {
      toast.error(`${totalFailed} dòng dữ liệu bị lỗi`);
    }
  };

  const resetDialog = () => {
    setUploadedFiles([]);
    setImportResults(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Dữ liệu
          </DialogTitle>
          <DialogDescription>
            Tải lên file CSV, Excel hoặc JSON để import dữ liệu vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <FileUp className="w-4 h-4 mr-2" />
              Tải lên file
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Download className="w-4 h-4 mr-2" />
              Tải Template mẫu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">Thả file vào đây...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">Kéo thả file vào đây hoặc click để chọn</p>
                  <p className="text-sm text-muted-foreground">
                    Hỗ trợ: CSV, Excel (.xlsx, .xls), JSON - Tối đa 10MB
                  </p>
                </>
              )}
            </div>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">File đã chọn ({uploadedFiles.length})</h4>
                {uploadedFiles.map((item, idx) => (
                  <Card key={idx}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileSpreadsheet className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(item.file.size / 1024).toFixed(1)} KB
                              {item.parsedData && ` • ${item.parsedData.rows.length} dòng`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.status === 'validating' && (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Đang đọc
                            </Badge>
                          )}
                          
                          {item.status !== 'validating' && (
                            <Select
                              value={item.selectedTemplate || ''}
                              onValueChange={(value) => updateFileTemplate(idx, value)}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Chọn loại dữ liệu" />
                              </SelectTrigger>
                              <SelectContent>
                                {importTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          
                          {item.selectedTemplate && item.status === 'valid' && (
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Hợp lệ
                            </Badge>
                          )}
                          {item.selectedTemplate && item.status === 'invalid' && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Lỗi
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {item.errorMessage && (
                        <p className="text-xs text-destructive mt-2">{item.errorMessage}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Import results */}
            {importResults && (
              <Card className={importResults.failed > 0 ? 'border-amber-500/50' : 'border-emerald-500/50'}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {importResults.failed > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Kết quả import: {importResults.success} thành công, {importResults.failed} thất bại
                      </p>
                      {importResults.errors.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {importResults.errors.map((err, i) => (
                            <p key={i}>• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import button */}
            {uploadedFiles.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetDialog}>
                  Xóa tất cả
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isProcessing || !uploadedFiles.some(f => f.status === 'valid' && f.selectedTemplate)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang import...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {uploadedFiles.filter(f => f.status === 'valid' && f.selectedTemplate).length} file
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Đang xử lý... {progress}%
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Tải về template mẫu để chuẩn bị dữ liệu đúng định dạng trước khi import
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {importTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card 
                    key={template.id}
                    className={`
                      cursor-pointer transition-all hover:border-primary/50
                      ${selectedTemplate === template.id ? 'border-primary ring-1 ring-primary' : ''}
                    `}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${template.bg}`}>
                          <Icon className={`w-5 h-5 ${template.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.columns.slice(0, 4).map(col => (
                              <Badge key={col} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {col}
                              </Badge>
                            ))}
                            {template.columns.length > 4 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{template.columns.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedTemplate === template.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTemplate(template, 'csv');
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            CSV
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTemplate(template, 'xlsx');
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
