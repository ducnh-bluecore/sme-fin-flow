import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileSpreadsheet, Upload, Link2, Database, CheckCircle2, 
  AlertCircle, Info, Download, Copy, ExternalLink, 
  ShoppingCart, Building2, FileText, Users, Wallet,
  ArrowRightLeft, CreditCard, TrendingUp, Settings2, Zap
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// Data entity templates with CSV examples
const dataTemplates = [
  {
    id: "customers",
    name: "Khách hàng",
    icon: Users,
    color: "text-blue-500",
    description: "Danh sách khách hàng và thông tin liên hệ",
    usedFor: [
      { feature: "AR Operations", desc: "Quản lý công nợ phải thu, theo dõi hạn mức tín dụng" },
      { feature: "Invoice Tracking", desc: "Tạo và gửi hóa đơn cho khách hàng" },
      { feature: "DSO Analysis", desc: "Phân tích thời gian thu tiền trung bình (Days Sales Outstanding)" },
      { feature: "Credit/Debit Notes", desc: "Quản lý giấy báo có/nợ liên quan đến khách hàng" },
    ],
    csvHeader: "name*,email,phone,address,tax_code,credit_limit,payment_terms,status",
    csvSample: `name*,email,phone,address,tax_code,credit_limit,payment_terms,status
Công ty TNHH ABC,contact@abc.com.vn,028-1234-5678,"123 Nguyễn Huệ, Q1, TP.HCM",0312345678,500000000,30,active
Công ty CP XYZ,info@xyz.vn,024-9876-5432,"456 Lê Lợi, Hà Nội",0109876543,200000000,45,active`,
    jsonSample: `{
  "name": "Công ty TNHH ABC",
  "email": "contact@abc.com.vn",
  "phone": "028-1234-5678",
  "address": "123 Nguyễn Huệ, Q1, TP.HCM",
  "tax_code": "0312345678",
  "credit_limit": 500000000,
  "payment_terms": 30,
  "status": "active"
}`,
    fields: [
      { name: "name", required: true, type: "text", desc: "Tên khách hàng/công ty" },
      { name: "email", required: false, type: "text", desc: "Email liên hệ" },
      { name: "phone", required: false, type: "text", desc: "Số điện thoại" },
      { name: "address", required: false, type: "text", desc: "Địa chỉ" },
      { name: "tax_code", required: false, type: "text", desc: "Mã số thuế" },
      { name: "credit_limit", required: false, type: "number", desc: "Hạn mức tín dụng (VND)" },
      { name: "payment_terms", required: false, type: "number", desc: "Số ngày thanh toán (mặc định: 30)" },
      { name: "status", required: false, type: "text", desc: "'active' hoặc 'inactive'" },
    ],
    sourceMapping: {
      misa: { "Mã khách hàng": "tax_code", "Tên khách hàng": "name", "Địa chỉ": "address" },
      sap: { "BP_NAME": "name", "TAX_NUMBER": "tax_code", "ADDRESS": "address" },
      excel: { "Tên công ty": "name", "MST": "tax_code", "Email": "email" },
    }
  },
  {
    id: "vendors",
    name: "Nhà cung cấp",
    icon: Building2,
    color: "text-amber-500",
    description: "Danh sách nhà cung cấp và điều khoản thanh toán",
    usedFor: [
      { feature: "AP Operations", desc: "Quản lý công nợ phải trả, theo dõi thanh toán" },
      { feature: "Bills Management", desc: "Nhập và quản lý hóa đơn mua hàng" },
      { feature: "DPO Analysis", desc: "Phân tích thời gian thanh toán trung bình (Days Payable Outstanding)" },
      { feature: "Cash Flow Planning", desc: "Dự báo dòng tiền chi trả cho NCC" },
    ],
    csvHeader: "name*,email,phone,address,tax_code,payment_terms,status",
    csvSample: `name*,email,phone,address,tax_code,payment_terms,status
NCC Vật liệu ABC,info@nccabc.vn,028-1111-2222,"789 Lý Thường Kiệt, Q10, TP.HCM",0301234567,45,active
NCC Thiết bị XYZ,contact@xyz-equipment.vn,024-3333-4444,"123 Hai Bà Trưng, Hà Nội",0109999888,30,active`,
    jsonSample: `{
  "name": "NCC Vật liệu ABC",
  "email": "info@nccabc.vn",
  "phone": "028-1111-2222",
  "address": "789 Lý Thường Kiệt, Q10, TP.HCM",
  "tax_code": "0301234567",
  "payment_terms": 45,
  "status": "active"
}`,
    fields: [
      { name: "name", required: true, type: "text", desc: "Tên nhà cung cấp" },
      { name: "email", required: false, type: "text", desc: "Email liên hệ" },
      { name: "phone", required: false, type: "text", desc: "Số điện thoại" },
      { name: "address", required: false, type: "text", desc: "Địa chỉ" },
      { name: "tax_code", required: false, type: "text", desc: "Mã số thuế" },
      { name: "payment_terms", required: false, type: "number", desc: "Số ngày thanh toán (mặc định: 30)" },
      { name: "status", required: false, type: "text", desc: "'active' hoặc 'inactive'" },
    ],
    sourceMapping: {
      misa: { "Mã NCC": "tax_code", "Tên NCC": "name", "Địa chỉ": "address" },
      sap: { "CardName": "name", "TaxNumber": "tax_code", "Address": "address" },
    }
  },
  {
    id: "products",
    name: "Sản phẩm/Dịch vụ",
    icon: ShoppingCart,
    color: "text-cyan-500",
    description: "Danh mục sản phẩm và dịch vụ với giá bán/giá vốn",
    usedFor: [
      { feature: "Gross Margin", desc: "Tính biên lợi nhuận gộp từ giá bán và giá vốn" },
      { feature: "Unit Economics", desc: "Phân tích kinh tế đơn vị (CAC, LTV, contribution margin)" },
      { feature: "Invoice/Order Items", desc: "Chi tiết sản phẩm trong hóa đơn và đơn hàng" },
      { feature: "Inventory Valuation", desc: "Định giá tồn kho theo giá vốn" },
    ],
    csvHeader: "sku*,name*,unit,unit_price,cost_price,category,is_active",
    csvSample: `sku*,name*,unit,unit_price,cost_price,category,is_active
SKU001,Sản phẩm A,cái,150000,100000,Điện tử,true
SKU002,Dịch vụ tư vấn,giờ,500000,0,Dịch vụ,true
SKU003,Phần mềm X,license,2000000,500000,Phần mềm,true`,
    jsonSample: `{
  "sku": "SKU001",
  "name": "Sản phẩm A",
  "unit": "cái",
  "unit_price": 150000,
  "cost_price": 100000,
  "category": "Điện tử",
  "is_active": true
}`,
    fields: [
      { name: "sku", required: true, type: "text", desc: "Mã sản phẩm (unique)" },
      { name: "name", required: true, type: "text", desc: "Tên sản phẩm/dịch vụ" },
      { name: "unit", required: false, type: "text", desc: "Đơn vị tính (cái, kg, giờ...)" },
      { name: "unit_price", required: false, type: "number", desc: "Giá bán (VND)" },
      { name: "cost_price", required: false, type: "number", desc: "Giá vốn (VND)" },
      { name: "category", required: false, type: "text", desc: "Danh mục sản phẩm" },
      { name: "is_active", required: false, type: "boolean", desc: "true/false" },
    ],
    sourceMapping: {
      misa: { "Mã hàng": "sku", "Tên hàng": "name", "Đơn giá": "unit_price", "Giá vốn": "cost_price" },
      sap: { "ItemCode": "sku", "ItemName": "name", "Price": "unit_price" },
      shopee: { "SKU": "sku", "Product Name": "name", "Price": "unit_price" },
    }
  },
  {
    id: "invoices",
    name: "Hóa đơn bán",
    icon: FileText,
    color: "text-green-500",
    description: "Hóa đơn bán hàng và công nợ phải thu (AR)",
    usedFor: [
      { feature: "AR Operations", desc: "Theo dõi công nợ phải thu, hóa đơn chờ thanh toán" },
      { feature: "AR Aging", desc: "Phân tích tuổi nợ (Current, 30 days, 60 days, 90+ days)" },
      { feature: "Revenue Recognition", desc: "Ghi nhận doanh thu theo thời điểm phát hành" },
      { feature: "Bank Reconciliation", desc: "Đối soát thanh toán với giao dịch ngân hàng" },
      { feature: "DSO Calculation", desc: "Tính Days Sales Outstanding từ ngày phát hành đến ngày thu" },
    ],
    csvHeader: "invoice_number*,customer_name*,issue_date*,due_date*,subtotal*,vat_amount,discount_amount,total_amount*,paid_amount,status",
    csvSample: `invoice_number*,customer_name*,issue_date*,due_date*,subtotal*,vat_amount,discount_amount,total_amount*,paid_amount,status
INV-2025-0001,Công ty TNHH ABC,2025-01-01,2025-01-31,100000000,10000000,0,110000000,0,sent
INV-2025-0002,Công ty CP XYZ,2025-01-02,2025-02-01,50000000,5000000,2000000,53000000,53000000,paid`,
    jsonSample: `{
  "invoice_number": "INV-2025-0001",
  "customer_name": "Công ty TNHH ABC",
  "issue_date": "2025-01-01",
  "due_date": "2025-01-31",
  "subtotal": 100000000,
  "vat_amount": 10000000,
  "discount_amount": 0,
  "total_amount": 110000000,
  "paid_amount": 0,
  "status": "sent"
}`,
    fields: [
      { name: "invoice_number", required: true, type: "text", desc: "Số hóa đơn (unique)" },
      { name: "customer_name", required: true, type: "text", desc: "Tên khách hàng" },
      { name: "customer_tax_code", required: false, type: "text", desc: "MST để map với customers" },
      { name: "issue_date", required: true, type: "date", desc: "Ngày phát hành (YYYY-MM-DD)" },
      { name: "due_date", required: true, type: "date", desc: "Ngày đến hạn (YYYY-MM-DD)" },
      { name: "subtotal", required: true, type: "number", desc: "Tổng trước thuế" },
      { name: "vat_amount", required: false, type: "number", desc: "Tiền thuế VAT" },
      { name: "discount_amount", required: false, type: "number", desc: "Tiền giảm giá" },
      { name: "total_amount", required: true, type: "number", desc: "Tổng sau thuế" },
      { name: "paid_amount", required: false, type: "number", desc: "Đã thanh toán" },
      { name: "status", required: false, type: "text", desc: "draft, sent, paid, overdue, cancelled" },
    ],
    sourceMapping: {
      misa: { "Số hóa đơn": "invoice_number", "Ngày hóa đơn": "issue_date", "Tổng tiền": "total_amount" },
      sap: { "DocNum": "invoice_number", "DocDate": "issue_date", "DocTotal": "total_amount" },
    }
  },
  {
    id: "bills",
    name: "Hóa đơn mua",
    icon: Wallet,
    color: "text-orange-500",
    description: "Hóa đơn mua hàng và công nợ phải trả (AP)",
    usedFor: [
      { feature: "AP Operations", desc: "Quản lý công nợ phải trả, lịch thanh toán" },
      { feature: "AP Aging", desc: "Phân tích tuổi nợ phải trả (Current, 30, 60, 90+ days)" },
      { feature: "COGS Calculation", desc: "Tính giá vốn hàng bán từ hóa đơn mua" },
      { feature: "Cash Flow Planning", desc: "Lập kế hoạch chi trả dựa trên due_date" },
      { feature: "Working Capital", desc: "Tính vốn lưu động từ AP và due dates" },
    ],
    csvHeader: "bill_number*,vendor_name*,bill_date*,due_date*,subtotal*,vat_amount,total_amount*,paid_amount,status,expense_category",
    csvSample: `bill_number*,vendor_name*,bill_date*,due_date*,subtotal*,vat_amount,total_amount*,paid_amount,status,expense_category
BILL-2025-0001,NCC Vật liệu ABC,2025-01-01,2025-01-31,80000000,8000000,88000000,0,approved,materials
BILL-2025-0002,NCC Thiết bị XYZ,2025-01-05,2025-02-04,150000000,15000000,165000000,165000000,paid,equipment`,
    jsonSample: `{
  "bill_number": "BILL-2025-0001",
  "vendor_name": "NCC Vật liệu ABC",
  "bill_date": "2025-01-01",
  "due_date": "2025-01-31",
  "subtotal": 80000000,
  "vat_amount": 8000000,
  "total_amount": 88000000,
  "paid_amount": 0,
  "status": "approved",
  "expense_category": "materials"
}`,
    fields: [
      { name: "bill_number", required: true, type: "text", desc: "Số hóa đơn nội bộ" },
      { name: "vendor_name", required: true, type: "text", desc: "Tên nhà cung cấp" },
      { name: "vendor_bill_number", required: false, type: "text", desc: "Số HĐ của NCC" },
      { name: "bill_date", required: true, type: "date", desc: "Ngày hóa đơn (YYYY-MM-DD)" },
      { name: "due_date", required: true, type: "date", desc: "Ngày đến hạn (YYYY-MM-DD)" },
      { name: "subtotal", required: true, type: "number", desc: "Tổng trước thuế" },
      { name: "vat_amount", required: false, type: "number", desc: "Tiền thuế VAT" },
      { name: "total_amount", required: true, type: "number", desc: "Tổng sau thuế" },
      { name: "paid_amount", required: false, type: "number", desc: "Đã thanh toán" },
      { name: "status", required: false, type: "text", desc: "draft, pending, approved, paid" },
      { name: "expense_category", required: false, type: "text", desc: "materials, services, equipment..." },
    ],
    sourceMapping: {
      misa: { "Số hóa đơn": "bill_number", "Nhà cung cấp": "vendor_name", "Tổng tiền": "total_amount" },
      sap: { "DocNum": "bill_number", "CardName": "vendor_name", "DocTotal": "total_amount" },
    }
  },
  {
    id: "payments",
    name: "Thanh toán",
    icon: CreditCard,
    color: "text-emerald-500",
    description: "Phiếu thu từ khách hàng (áp dụng vào hóa đơn)",
    usedFor: [
      { feature: "AR Operations", desc: "Cập nhật trạng thái thanh toán hóa đơn" },
      { feature: "Bank Reconciliation", desc: "Đối soát với giao dịch ngân hàng qua reference_code" },
      { feature: "Cash Flow Tracking", desc: "Theo dõi dòng tiền thu thực tế" },
      { feature: "Collection Analysis", desc: "Phân tích hiệu quả thu hồi công nợ" },
    ],
    csvHeader: "invoice_number*,payment_date*,amount*,payment_method,reference_code,notes",
    csvSample: `invoice_number*,payment_date*,amount*,payment_method,reference_code,notes
INV-2025-0001,2025-01-15,50000000,bank_transfer,FT25015123456,Thanh toán đợt 1
INV-2025-0001,2025-01-28,60000000,bank_transfer,FT25028654321,Thanh toán đợt 2`,
    jsonSample: `{
  "invoice_number": "INV-2025-0001",
  "payment_date": "2025-01-15",
  "amount": 50000000,
  "payment_method": "bank_transfer",
  "reference_code": "FT25015123456",
  "notes": "Thanh toán đợt 1"
}`,
    fields: [
      { name: "invoice_number", required: true, type: "text", desc: "Số hóa đơn cần thu" },
      { name: "payment_date", required: true, type: "date", desc: "Ngày thanh toán (YYYY-MM-DD)" },
      { name: "amount", required: true, type: "number", desc: "Số tiền thu" },
      { name: "payment_method", required: false, type: "text", desc: "cash, bank_transfer, card..." },
      { name: "reference_code", required: false, type: "text", desc: "Mã tham chiếu/FT code" },
      { name: "notes", required: false, type: "text", desc: "Ghi chú" },
    ],
    sourceMapping: {
      bank: { "Số tiền ghi Có": "amount", "Ngày GD": "payment_date", "Nội dung": "notes" },
      misa: { "Số phiếu thu": "reference_code", "Số tiền": "amount", "Ngày": "payment_date" },
    }
  },
  {
    id: "expenses",
    name: "Chi phí hoạt động",
    icon: TrendingUp,
    color: "text-red-500",
    description: "Chi phí vận hành doanh nghiệp (lương, văn phòng, marketing...)",
    usedFor: [
      { feature: "P&L Report", desc: "Báo cáo lãi lỗ - mục Chi phí hoạt động (OPEX)" },
      { feature: "Budget vs Actual", desc: "So sánh chi phí thực tế với ngân sách" },
      { feature: "Cost Center Analysis", desc: "Phân tích chi phí theo bộ phận/dự án" },
      { feature: "EBITDA Calculation", desc: "Tính EBITDA từ doanh thu trừ OPEX" },
      { feature: "What-If Scenarios", desc: "Mô phỏng thay đổi chi phí ảnh hưởng lợi nhuận" },
    ],
    csvHeader: "expense_date*,category*,description*,amount*,vendor_name,cost_center,payment_method",
    csvSample: `expense_date*,category*,description*,amount*,vendor_name,cost_center,payment_method
2025-01-05,salary,Lương tháng 1/2025,500000000,,Nhân sự,bank_transfer
2025-01-10,marketing,Chi phí quảng cáo Facebook,25000000,Facebook,Marketing,card
2025-01-15,office,Tiền thuê văn phòng Q1/2025,150000000,Vincom,Vận hành,bank_transfer`,
    jsonSample: `{
  "expense_date": "2025-01-05",
  "category": "salary",
  "description": "Lương tháng 1/2025",
  "amount": 500000000,
  "cost_center": "Nhân sự",
  "payment_method": "bank_transfer"
}`,
    fields: [
      { name: "expense_date", required: true, type: "date", desc: "Ngày chi phí (YYYY-MM-DD)" },
      { name: "category", required: true, type: "text", desc: "office, utilities, salary, marketing, travel, supplies, maintenance, other" },
      { name: "subcategory", required: false, type: "text", desc: "Phân loại chi tiết" },
      { name: "description", required: true, type: "text", desc: "Mô tả chi phí" },
      { name: "amount", required: true, type: "number", desc: "Số tiền" },
      { name: "vendor_name", required: false, type: "text", desc: "Nhà cung cấp/đối tác" },
      { name: "cost_center", required: false, type: "text", desc: "Bộ phận/trung tâm chi phí" },
      { name: "payment_method", required: false, type: "text", desc: "cash, bank_transfer, card" },
      { name: "is_recurring", required: false, type: "boolean", desc: "Chi phí định kỳ (true/false)" },
    ],
    sourceMapping: {
      misa: { "Ngày": "expense_date", "Loại chi phí": "category", "Diễn giải": "description", "Số tiền": "amount" },
      excel: { "Ngày chi": "expense_date", "Danh mục": "category", "Mô tả": "description", "Số tiền": "amount" },
    }
  },
  {
    id: "revenues",
    name: "Doanh thu",
    icon: TrendingUp,
    color: "text-green-600",
    description: "Doanh thu từ các nguồn (bán hàng, dịch vụ, kênh...)",
    usedFor: [
      { feature: "P&L Report", desc: "Báo cáo lãi lỗ - dòng Doanh thu" },
      { feature: "Channel P&L", desc: "Phân tích lợi nhuận theo kênh bán hàng" },
      { feature: "Revenue Trend", desc: "Biểu đồ xu hướng doanh thu theo thời gian" },
      { feature: "CFO Dashboard", desc: "KPI tổng quan doanh thu trên dashboard" },
      { feature: "Rolling Forecast", desc: "Dự báo doanh thu cuốn chiếu" },
    ],
    csvHeader: "source*,channel,description,amount*,start_date*,customer_name",
    csvSample: `source*,channel,description,amount*,start_date*,customer_name
sales,shopee,Doanh thu Shopee T1/2025,850000000,2025-01-01,
sales,lazada,Doanh thu Lazada T1/2025,420000000,2025-01-01,
service,,Dịch vụ tư vấn Công ty ABC,50000000,2025-01-15,Công ty ABC`,
    jsonSample: `{
  "source": "sales",
  "channel": "shopee",
  "description": "Doanh thu Shopee T1/2025",
  "amount": 850000000,
  "start_date": "2025-01-01"
}`,
    fields: [
      { name: "source", required: true, type: "text", desc: "sales, service, investment, other" },
      { name: "channel", required: false, type: "text", desc: "shopee, lazada, tiktok, website..." },
      { name: "description", required: false, type: "text", desc: "Mô tả nguồn doanh thu" },
      { name: "amount", required: true, type: "number", desc: "Số tiền doanh thu" },
      { name: "start_date", required: true, type: "date", desc: "Ngày ghi nhận (YYYY-MM-DD)" },
      { name: "end_date", required: false, type: "date", desc: "Ngày kết thúc (nếu có)" },
      { name: "customer_name", required: false, type: "text", desc: "Tên khách hàng (nếu có)" },
    ],
    sourceMapping: {
      shopee: { "Kỳ": "start_date", "Doanh thu": "amount" },
      lazada: { "Period": "start_date", "Revenue": "amount" },
    }
  },
  {
    id: "bank_accounts",
    name: "Tài khoản ngân hàng",
    icon: Building2,
    color: "text-indigo-500",
    description: "Danh sách tài khoản ngân hàng của doanh nghiệp",
    usedFor: [
      { feature: "Cash Position", desc: "Tổng hợp số dư tiền mặt từ tất cả tài khoản" },
      { feature: "Bank Connections", desc: "Kết nối API ngân hàng để sync tự động" },
      { feature: "Cash Flow Dashboard", desc: "Hiển thị tiền mặt hiện có trên dashboard" },
      { feature: "Bank Reconciliation", desc: "Đối soát giao dịch theo từng tài khoản" },
    ],
    csvHeader: "bank_name*,account_number*,account_name,currency,current_balance,status",
    csvSample: `bank_name*,account_number*,account_name,currency,current_balance,status
Vietcombank,0071001234567,CTY TNHH ABC,VND,1500000000,active
Techcombank,19031234567890,CTY TNHH ABC,VND,850000000,active
VietinBank,1234567890123,CTY TNHH ABC,USD,50000,active`,
    jsonSample: `{
  "bank_name": "Vietcombank",
  "account_number": "0071001234567",
  "account_name": "CTY TNHH ABC",
  "currency": "VND",
  "current_balance": 1500000000,
  "status": "active"
}`,
    fields: [
      { name: "bank_name", required: true, type: "text", desc: "Tên ngân hàng" },
      { name: "account_number", required: true, type: "text", desc: "Số tài khoản" },
      { name: "account_name", required: false, type: "text", desc: "Tên chủ tài khoản" },
      { name: "currency", required: false, type: "text", desc: "Loại tiền (VND, USD...)" },
      { name: "current_balance", required: false, type: "number", desc: "Số dư hiện tại" },
      { name: "status", required: false, type: "text", desc: "'active' hoặc 'inactive'" },
    ],
    sourceMapping: {
      vcb: { "Số TK": "account_number", "Tên TK": "account_name", "Số dư": "current_balance" },
      tcb: { "Account No": "account_number", "Account Name": "account_name", "Balance": "current_balance" },
    }
  },
  {
    id: "bank_transactions",
    name: "Giao dịch ngân hàng",
    icon: ArrowRightLeft,
    color: "text-purple-500",
    description: "Sao kê giao dịch từ ngân hàng (để đối soát)",
    usedFor: [
      { feature: "Bank Reconciliation", desc: "Đối soát tự động với hóa đơn và payments" },
      { feature: "Cash Flow Tracking", desc: "Theo dõi dòng tiền thực tế vào/ra" },
      { feature: "Auto-matching", desc: "Tự động khớp giao dịch với invoices/bills" },
      { feature: "Transaction Categories", desc: "Phân loại giao dịch theo danh mục" },
    ],
    csvHeader: "bank_account_number*,transaction_date*,transaction_type*,amount*,description,reference",
    csvSample: `bank_account_number*,transaction_date*,transaction_type*,amount*,description,reference
0071001234567,2025-01-02,credit,50000000,TT HĐ INV-2024-001 CONG TY ABC,FT25002123456
0071001234567,2025-01-03,debit,20000000,Chi lương tháng 12/2024,FT25003654321`,
    jsonSample: `{
  "bank_account_number": "0071001234567",
  "transaction_date": "2025-01-02",
  "transaction_type": "credit",
  "amount": 50000000,
  "description": "TT HĐ INV-2024-001 CONG TY ABC",
  "reference": "FT25002123456"
}`,
    fields: [
      { name: "bank_account_number", required: true, type: "text", desc: "Số tài khoản ngân hàng" },
      { name: "transaction_date", required: true, type: "date", desc: "Ngày giao dịch (YYYY-MM-DD)" },
      { name: "transaction_type", required: true, type: "text", desc: "'credit' (tiền vào) hoặc 'debit' (tiền ra)" },
      { name: "amount", required: true, type: "number", desc: "Số tiền (luôn dương)" },
      { name: "description", required: false, type: "text", desc: "Nội dung giao dịch" },
      { name: "reference", required: false, type: "text", desc: "Mã tham chiếu ngân hàng" },
    ],
    sourceMapping: {
      vcb: { "Số tiền ghi Có": "amount (credit)", "Số tiền ghi Nợ": "amount (debit)", "Nội dung": "description" },
      tcb: { "Credit": "amount (credit)", "Debit": "amount (debit)", "Trans. Desc": "description" },
    }
  },
  {
    id: "orders",
    name: "Đơn hàng",
    icon: ShoppingCart,
    color: "text-teal-500",
    description: "Đơn hàng từ các kênh bán hàng",
    usedFor: [
      { feature: "Channel Analytics", desc: "Phân tích đơn hàng theo kênh bán (Shopee, Lazada...)" },
      { feature: "Channel P&L", desc: "Tính lợi nhuận theo kênh từ đơn hàng và phí" },
      { feature: "Order Conversion", desc: "Phân tích tỷ lệ hoàn thành/hủy/trả đơn" },
      { feature: "AOV Metrics", desc: "Tính Average Order Value theo kênh" },
      { feature: "Channel What-If", desc: "Mô phỏng thay đổi doanh số kênh" },
    ],
    csvHeader: "order_number*,customer_name*,source*,order_date*,subtotal,shipping_fee,discount_amount,total_amount*,status",
    csvSample: `order_number*,customer_name*,source*,order_date*,subtotal,shipping_fee,discount_amount,total_amount*,status
ORD-2025-0001,Nguyễn Văn A,website,2025-01-01T10:30:00,1400000,50000,0,1450000,completed
SPE-2025-0001,Trần Thị B,shopee,2025-01-01T11:00:00,2300000,0,50000,2250000,completed`,
    jsonSample: `{
  "order_number": "ORD-2025-0001",
  "customer_name": "Nguyễn Văn A",
  "source": "shopee",
  "order_date": "2025-01-01T10:30:00",
  "subtotal": 1400000,
  "shipping_fee": 50000,
  "discount_amount": 0,
  "total_amount": 1450000,
  "status": "completed"
}`,
    fields: [
      { name: "order_number", required: true, type: "text", desc: "Mã đơn hàng" },
      { name: "customer_name", required: true, type: "text", desc: "Tên khách hàng" },
      { name: "customer_phone", required: false, type: "text", desc: "SĐT khách hàng" },
      { name: "customer_address", required: false, type: "text", desc: "Địa chỉ giao hàng" },
      { name: "source", required: true, type: "text", desc: "shopee, lazada, tiktok, website, manual..." },
      { name: "order_date", required: true, type: "datetime", desc: "Thời điểm đặt hàng" },
      { name: "subtotal", required: false, type: "number", desc: "Tổng tiền hàng" },
      { name: "shipping_fee", required: false, type: "number", desc: "Phí vận chuyển" },
      { name: "discount_amount", required: false, type: "number", desc: "Giảm giá" },
      { name: "total_amount", required: true, type: "number", desc: "Tổng giá trị đơn" },
      { name: "status", required: false, type: "text", desc: "pending, approved, completed, cancelled, returned" },
    ],
    sourceMapping: {
      shopee: { "Mã đơn hàng": "order_number", "Ngày đặt hàng": "order_date", "Tổng đơn hàng": "total_amount" },
      lazada: { "Order Number": "order_number", "Created at": "order_date", "Total": "total_amount" },
    }
  },
  {
    id: "budgets",
    name: "Ngân sách",
    icon: Wallet,
    color: "text-violet-500",
    description: "Kế hoạch ngân sách theo kỳ (tháng, quý, năm)",
    usedFor: [
      { feature: "Budget vs Actual", desc: "So sánh ngân sách với thực tế, tính variance" },
      { feature: "Variance Analysis", desc: "Phân tích chênh lệch chi tiết theo danh mục" },
      { feature: "Scenario Planning", desc: "Lập kế hoạch ngân sách cho các kịch bản" },
      { feature: "Rolling Forecast", desc: "Dự báo cuốn chiếu dựa trên ngân sách gốc" },
      { feature: "Board Reports", desc: "Báo cáo HĐQT về tình hình thực hiện ngân sách" },
    ],
    csvHeader: "name*,category*,period_type*,period_year*,period_month,budgeted_amount*,actual_amount,status",
    csvSample: `name*,category*,period_type*,period_year*,period_month,budgeted_amount*,actual_amount,status
NS Marketing Q1,marketing,quarterly,2025,,300000000,0,draft
NS Lương T1,salary,monthly,2025,1,500000000,480000000,approved
NS Văn phòng T1,office,monthly,2025,1,50000000,45000000,approved`,
    jsonSample: `{
  "name": "NS Marketing Q1",
  "category": "marketing",
  "period_type": "quarterly",
  "period_year": 2025,
  "period_quarter": 1,
  "budgeted_amount": 300000000,
  "status": "draft"
}`,
    fields: [
      { name: "name", required: true, type: "text", desc: "Tên ngân sách" },
      { name: "category", required: true, type: "text", desc: "Danh mục: revenue, cogs, salary, marketing, office..." },
      { name: "period_type", required: true, type: "text", desc: "monthly, quarterly, yearly" },
      { name: "period_year", required: true, type: "number", desc: "Năm ngân sách" },
      { name: "period_month", required: false, type: "number", desc: "Tháng (1-12, nếu monthly)" },
      { name: "period_quarter", required: false, type: "number", desc: "Quý (1-4, nếu quarterly)" },
      { name: "budgeted_amount", required: true, type: "number", desc: "Số tiền ngân sách" },
      { name: "actual_amount", required: false, type: "number", desc: "Thực tế (nếu có)" },
      { name: "status", required: false, type: "text", desc: "draft, approved, closed" },
    ],
    sourceMapping: {
      excel: { "Tên": "name", "Danh mục": "category", "Năm": "period_year", "Ngân sách": "budgeted_amount" },
    }
  },
  {
    id: "cash_forecasts",
    name: "Dự báo dòng tiền",
    icon: TrendingUp,
    color: "text-sky-500",
    description: "Dự báo tiền mặt theo ngày/tuần (cho Cash Flow)",
    usedFor: [
      { feature: "Cash Forecast", desc: "Biểu đồ dự báo dòng tiền theo ngày/tuần" },
      { feature: "Cash Runway", desc: "Tính số ngày/tháng tiền mặt còn đủ hoạt động" },
      { feature: "Liquidity Alerts", desc: "Cảnh báo khi dự báo tiền mặt xuống thấp" },
      { feature: "CFO Dashboard", desc: "Widget dự báo tiền mặt 7-30 ngày tới" },
    ],
    csvHeader: "forecast_date*,opening_balance*,inflows,outflows,closing_balance*,forecast_type,notes",
    csvSample: `forecast_date*,opening_balance*,inflows,outflows,closing_balance*,forecast_type,notes
2025-01-01,2000000000,150000000,80000000,2070000000,actual,Số liệu thực tế
2025-01-02,2070000000,200000000,120000000,2150000000,forecast,Dự báo theo kế hoạch
2025-01-03,2150000000,100000000,90000000,2160000000,forecast,Dự báo theo kế hoạch`,
    jsonSample: `{
  "forecast_date": "2025-01-01",
  "opening_balance": 2000000000,
  "inflows": 150000000,
  "outflows": 80000000,
  "closing_balance": 2070000000,
  "forecast_type": "actual"
}`,
    fields: [
      { name: "forecast_date", required: true, type: "date", desc: "Ngày dự báo (YYYY-MM-DD)" },
      { name: "opening_balance", required: true, type: "number", desc: "Số dư đầu ngày" },
      { name: "inflows", required: false, type: "number", desc: "Dòng tiền vào" },
      { name: "outflows", required: false, type: "number", desc: "Dòng tiền ra" },
      { name: "closing_balance", required: true, type: "number", desc: "Số dư cuối ngày" },
      { name: "forecast_type", required: false, type: "text", desc: "'actual' hoặc 'forecast'" },
      { name: "notes", required: false, type: "text", desc: "Ghi chú" },
    ],
    sourceMapping: {
      excel: { "Ngày": "forecast_date", "Đầu kỳ": "opening_balance", "Thu": "inflows", "Chi": "outflows", "Cuối kỳ": "closing_balance" },
    }
  },
  {
    id: "gl_accounts",
    name: "Hệ thống tài khoản",
    icon: Database,
    color: "text-gray-500",
    description: "Chart of Accounts - Hệ thống tài khoản kế toán",
    usedFor: [
      { feature: "Chart of Accounts", desc: "Quản lý hệ thống tài khoản kế toán" },
      { feature: "Trial Balance", desc: "Bảng cân đối phát sinh theo tài khoản" },
      { feature: "Financial Reports", desc: "Báo cáo tài chính theo chuẩn VAS" },
      { feature: "Journal Entries", desc: "Định khoản bút toán theo tài khoản" },
      { feature: "P&L Mapping", desc: "Map tài khoản vào các dòng P&L" },
    ],
    csvHeader: "account_code*,account_name*,account_type*,normal_balance*,parent_code,is_header,is_active",
    csvSample: `account_code*,account_name*,account_type*,normal_balance*,parent_code,is_header,is_active
111,Tiền mặt,asset,debit,,true,true
1111,Tiền mặt VND,asset,debit,111,false,true
112,Tiền gửi ngân hàng,asset,debit,,true,true
131,Phải thu khách hàng,asset,debit,,false,true
511,Doanh thu bán hàng,revenue,credit,,false,true
632,Giá vốn hàng bán,expense,debit,,false,true`,
    jsonSample: `{
  "account_code": "111",
  "account_name": "Tiền mặt",
  "account_type": "asset",
  "normal_balance": "debit",
  "is_header": true,
  "is_active": true
}`,
    fields: [
      { name: "account_code", required: true, type: "text", desc: "Mã tài khoản" },
      { name: "account_name", required: true, type: "text", desc: "Tên tài khoản" },
      { name: "account_type", required: true, type: "text", desc: "asset, liability, equity, revenue, expense" },
      { name: "account_subtype", required: false, type: "text", desc: "Phân loại chi tiết" },
      { name: "normal_balance", required: true, type: "text", desc: "'debit' hoặc 'credit'" },
      { name: "parent_code", required: false, type: "text", desc: "Mã TK cha (nếu có)" },
      { name: "is_header", required: false, type: "boolean", desc: "TK tổng hợp (true/false)" },
      { name: "is_active", required: false, type: "boolean", desc: "Đang sử dụng (true/false)" },
    ],
    sourceMapping: {
      misa: { "Số TK": "account_code", "Tên TK": "account_name", "Loại TK": "account_type" },
      sap: { "AcctCode": "account_code", "AcctName": "account_name", "AcctType": "account_type" },
    }
  },
];

// Connector integrations info
const connectorCategories = [
  {
    id: "ecommerce",
    name: "Sàn thương mại điện tử",
    icon: ShoppingCart,
    connectors: [
      { name: "Shopee", logo: "/logos/shopee.png", status: "available", dataTypes: ["orders", "settlements", "fees"] },
      { name: "Lazada", logo: "/logos/lazada.png", status: "available", dataTypes: ["orders", "settlements"] },
      { name: "TikTok Shop", logo: "/logos/tiktok.png", status: "available", dataTypes: ["orders", "settlements"] },
      { name: "Tiki", logo: "/logos/tiki.png", status: "coming_soon", dataTypes: ["orders"] },
    ]
  },
  {
    id: "accounting",
    name: "Phần mềm kế toán",
    icon: FileSpreadsheet,
    connectors: [
      { name: "MISA", logo: "/logos/misa.png", status: "coming_soon", dataTypes: ["invoices", "bills", "customers"] },
      { name: "SAP", logo: "/logos/sap.png", status: "coming_soon", dataTypes: ["all"] },
      { name: "Fast", logo: "/logos/fast.png", status: "coming_soon", dataTypes: ["invoices", "bills"] },
    ]
  },
  {
    id: "banking",
    name: "Ngân hàng",
    icon: Building2,
    connectors: [
      { name: "Vietcombank", logo: "/logos/vcb.png", status: "available", dataTypes: ["transactions", "balance"] },
      { name: "Techcombank", logo: "/logos/tcb.png", status: "available", dataTypes: ["transactions", "balance"] },
      { name: "MB Bank", logo: "/logos/mb.png", status: "coming_soon", dataTypes: ["transactions"] },
    ]
  },
  {
    id: "data",
    name: "Kho dữ liệu",
    icon: Database,
    connectors: [
      { name: "Google BigQuery", logo: "/logos/bigquery.png", status: "available", dataTypes: ["custom"] },
      { name: "Google Sheets", logo: "/logos/sheets.png", status: "available", dataTypes: ["custom"] },
    ]
  },
];

export function DataPreparationGuide() {
  const [selectedTemplate, setSelectedTemplate] = useState(dataTemplates[0]);
  const [activeMethod, setActiveMethod] = useState<"import" | "api">("import");
  const { t, language } = useLanguage();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('guide.copiedSuccess'));
  };

  const downloadTemplate = (template: typeof dataTemplates[0]) => {
    const blob = new Blob([template.csvSample], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `template_${template.id}.csv`;
    link.click();
    toast.success(language === 'vi' ? `Đã tải template ${template.name}` : `Downloaded template ${template.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Alert className="border-primary/50 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertTitle>{language === 'vi' ? 'Chuẩn bị dữ liệu để bắt đầu' : 'Prepare data to get started'}</AlertTitle>
        <AlertDescription>
          {language === 'vi' 
            ? <>Hệ thống hỗ trợ 2 cách để đưa dữ liệu vào: <strong>Import file</strong> (CSV, Excel) hoặc <strong>Kết nối API</strong> trực tiếp với các hệ thống khác. Chọn phương thức phù hợp với nguồn dữ liệu của bạn.</>
            : <>The system supports 2 ways to import data: <strong>Import file</strong> (CSV, Excel) or <strong>API connection</strong> directly with other systems. Choose the method that fits your data source.</>
          }
        </AlertDescription>
      </Alert>

      {/* Method Tabs */}
      <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as "import" | "api")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="import" className="flex items-center gap-2 py-3">
            <Upload className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">{language === 'vi' ? 'Import File' : 'Import File'}</div>
              <div className="text-xs text-muted-foreground">CSV, Excel, JSON</div>
            </div>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2 py-3">
            <Link2 className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">{language === 'vi' ? 'Kết nối API' : 'Connect API'}</div>
              <div className="text-xs text-muted-foreground">{language === 'vi' ? 'Đồng bộ tự động' : 'Auto sync'}</div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Import Tab Content */}
        <TabsContent value="import" className="space-y-6">
          {/* Quick Tips */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">{language === 'vi' ? 'Định dạng hỗ trợ' : 'Supported Formats'}</p>
                    <p className="text-sm text-muted-foreground">CSV, XLSX, XLS, JSON</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-400">{language === 'vi' ? 'Tự động validate' : 'Auto Validate'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Kiểm tra lỗi trước import' : 'Check errors before import'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-medium text-purple-700 dark:text-purple-400">{language === 'vi' ? 'Import hàng loạt' : 'Bulk Import'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Lên đến 10,000 dòng' : 'Up to 10,000 rows'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Templates */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Template Selection Sidebar */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{t('guide.dataTypes')}</h3>
              {dataTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedTemplate.id === template.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  }`}
                >
                  <template.icon className={`h-5 w-5 ${selectedTemplate.id === template.id ? "" : template.color}`} />
                  <span className="font-medium">{template.name}</span>
                </button>
              ))}
            </div>

            {/* Template Detail */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <selectedTemplate.icon className={`h-6 w-6 ${selectedTemplate.color}`} />
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription>{selectedTemplate.description}</CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => downloadTemplate(selectedTemplate)} className="gap-2">
                      <Download className="h-4 w-4" />
                      {t('guide.downloadTemplate')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Used For Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      {t('guide.usedInFeatures')}
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {selectedTemplate.usedFor.map((usage, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                          <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-amber-700 dark:text-amber-300 text-sm">{usage.feature}</span>
                            <p className="text-xs text-muted-foreground">{usage.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CSV Example */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" />
                        {t('guide.csvFormat')}
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(selectedTemplate.csvSample, "CSV template")}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {t('guide.copyToClipboard')}
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto whitespace-pre">
                      {selectedTemplate.csvSample}
                    </pre>
                  </div>

                  {/* Fields Description */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      {language === 'vi' ? 'Mô tả các cột' : 'Column Description'}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 font-medium">{language === 'vi' ? 'Cột' : 'Column'}</th>
                            <th className="text-left p-2 font-medium">{t('guide.required')}</th>
                            <th className="text-left p-2 font-medium">{t('guide.fieldType')}</th>
                            <th className="text-left p-2 font-medium">{t('guide.description')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTemplate.fields.map((field, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2 font-mono text-xs">{field.name}</td>
                              <td className="p-2">
                                {field.required ? (
                                  <Badge variant="destructive" className="text-xs">{t('guide.requiredFields')}</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">{t('guide.optionalFields')}</Badge>
                                )}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-xs">{field.type}</Badge>
                              </td>
                              <td className="p-2 text-muted-foreground">{field.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* JSON Example */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="json">
                      <AccordionTrigger className="text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-purple-500" />
                          {t('guide.jsonFormat')} (API)
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(selectedTemplate.jsonSample, "JSON sample")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                            {selectedTemplate.jsonSample}
                          </pre>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Source Mapping */}
                    <AccordionItem value="mapping">
                      <AccordionTrigger className="text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          <Settings2 className="h-4 w-4 text-orange-500" />
                          {t('guide.fieldMapping')}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {Object.entries(selectedTemplate.sourceMapping).map(([source, mapping]) => (
                            <div key={source} className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm mb-2 uppercase">{source}</h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(mapping).map(([from, to]) => (
                                  <div key={from} className="flex items-center gap-2">
                                    <Badge variant="outline">{from}</Badge>
                                    <span>→</span>
                                    <Badge variant="secondary">{String(to)}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Import Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    {language === 'vi' ? 'Quy tắc import' : 'Import Rules'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Dòng đầu tiên là header chứa tên cột' : 'First row is header with column names'}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Ngày tháng:' : 'Date format:'} <code className="text-xs bg-muted px-1 rounded">YYYY-MM-DD</code> {language === 'vi' ? 'hoặc' : 'or'} <code className="text-xs bg-muted px-1 rounded">DD/MM/YYYY</code>
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Số tiền: không có dấu phân cách hàng nghìn' : 'Amount: no thousand separators'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Encoding: UTF-8 (cho CSV)' : 'Encoding: UTF-8 (for CSV)'}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Excel: Sheet đầu tiên được sử dụng' : 'Excel: First sheet is used'}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {language === 'vi' ? 'Các cột * là bắt buộc' : '* columns are required'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{language === 'vi' ? 'Sẵn sàng import dữ liệu?' : 'Ready to import data?'}</h3>
                  <p className="text-muted-foreground">{language === 'vi' ? 'Đã chuẩn bị xong file theo template, tiến hành import ngay' : 'File prepared according to template, proceed to import now'}</p>
                </div>
                <Button asChild size="lg" className="gap-2">
                  <Link to="/data-hub">
                    <Upload className="h-4 w-4" />
                    {t('guide.dataHub')}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab Content */}
        <TabsContent value="api" className="space-y-6">
          {/* API Benefits */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">{language === 'vi' ? 'Tự động đồng bộ' : 'Auto Sync'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Dữ liệu cập nhật realtime' : 'Data updates in realtime'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Link2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-400">{language === 'vi' ? 'Kết nối 1 lần' : 'One-time Setup'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Thiết lập đơn giản' : 'Simple configuration'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-medium text-purple-700 dark:text-purple-400">{language === 'vi' ? 'Mapping tự động' : 'Auto Mapping'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Không cần chuyển đổi thủ công' : 'No manual conversion needed'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connector Categories */}
          <div className="space-y-6">
            {connectorCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <category.icon className="h-5 w-5 text-primary" />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {category.connectors.map((connector) => (
                      <div 
                        key={connector.name}
                        className={`p-4 border rounded-lg ${
                          connector.status === "available" ? "bg-background" : "bg-muted/50 opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <category.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{connector.name}</p>
                            {connector.status === "available" ? (
                              <Badge className="text-xs bg-green-500">{language === 'vi' ? 'Sẵn sàng' : 'Available'}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">{language === 'vi' ? 'Sắp ra mắt' : 'Coming Soon'}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {connector.dataTypes.map((dt) => (
                            <Badge key={dt} variant="outline" className="text-xs">{dt}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* API Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                {language === 'vi' ? 'Hướng dẫn kết nối API' : 'API Setup Guide'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-medium">{language === 'vi' ? 'Lấy thông tin API từ nguồn dữ liệu' : 'Get API credentials from data source'}</h4>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Đăng nhập vào hệ thống gốc (Shopee Seller Center, MISA, ...) và tìm mục API/Tích hợp để lấy API Key hoặc Access Token' : 'Log into the source system (Shopee Seller Center, MISA, ...) and find API/Integration section to get API Key or Access Token'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-medium">{language === 'vi' ? 'Thêm Connector trong hệ thống' : 'Add Connector in the system'}</h4>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Vào trang Data Hub → Thêm Connector → Chọn loại kết nối và nhập thông tin API' : 'Go to Data Hub → Add Connector → Select connection type and enter API credentials'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-medium">{language === 'vi' ? 'Cấu hình đồng bộ' : 'Configure sync settings'}</h4>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Chọn loại dữ liệu cần đồng bộ và tần suất cập nhật (realtime, hàng giờ, hàng ngày)' : 'Select data types to sync and update frequency (realtime, hourly, daily)'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 font-bold flex-shrink-0">✓</div>
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-400">{language === 'vi' ? 'Hoàn tất' : 'Done'}</h4>
                    <p className="text-sm text-muted-foreground">{language === 'vi' ? 'Dữ liệu sẽ tự động đồng bộ theo lịch đã thiết lập. Bạn có thể theo dõi trạng thái đồng bộ tại Data Hub' : 'Data will sync automatically based on the schedule. You can monitor sync status in Data Hub'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{language === 'vi' ? 'Bắt đầu kết nối dữ liệu?' : 'Start connecting data?'}</h3>
                  <p className="text-muted-foreground">{language === 'vi' ? 'Thiết lập connector để tự động đồng bộ dữ liệu từ các hệ thống' : 'Set up connectors to automatically sync data from your systems'}</p>
                </div>
                <Button asChild size="lg" className="gap-2">
                  <Link to="/data-hub">
                    <Link2 className="h-4 w-4" />
                    {t('guide.dataHub')}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
