import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Book, 
  Database,
  AlertTriangle,
  Settings,
  FileCode,
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface DocumentInfo {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: 'system' | 'alert' | 'data' | 'guide';
  icon: React.ElementType;
  size?: string;
  lastUpdated?: string;
}

const documents: DocumentInfo[] = [
  {
    id: 'fdp-control-tower',
    name: 'FDP & Control Tower Documentation',
    filename: 'fdp-control-tower-documentation.md',
    description: 'Tài liệu đầy đủ mô tả tính năng và use cases của FDP và Control Tower',
    category: 'system',
    icon: Book,
    lastUpdated: '2025-01-12'
  },
  {
    id: 'system-features',
    name: 'System Features Documentation',
    filename: 'system-features.md',
    description: 'Tài liệu chi tiết các tính năng của hệ thống CFO Dashboard',
    category: 'system',
    icon: FileText,
    lastUpdated: '2025-01-08'
  },
  {
    id: 'alert-system-review',
    name: 'Alert System Review',
    filename: 'alert-system-review.md',
    description: 'Đánh giá và phân tích hệ thống cảnh báo',
    category: 'alert',
    icon: AlertTriangle
  },
  {
    id: 'alert-data-requirements',
    name: 'Alert System Data Requirements',
    filename: 'alert-system-data-requirements.md',
    description: 'Yêu cầu dữ liệu cho hệ thống cảnh báo',
    category: 'alert',
    icon: Database
  },
  {
    id: 'kpi-alert-rules',
    name: 'KPI Alert Rules Documentation',
    filename: 'kpi-alert-rules-documentation.md',
    description: 'Tài liệu về các rules cảnh báo KPI',
    category: 'alert',
    icon: Settings
  },
  {
    id: 'kpi-data-readiness',
    name: 'KPI Data Readiness Check',
    filename: 'kpi-data-readiness-check.md',
    description: 'Kiểm tra mức độ sẵn sàng của dữ liệu KPI',
    category: 'data',
    icon: Database
  },
  {
    id: 'system-data-requirements',
    name: 'System Data Requirements',
    filename: 'system-data-requirements.md',
    description: 'Yêu cầu dữ liệu tổng thể của hệ thống',
    category: 'data',
    icon: Database
  },
  {
    id: 'test-data-scenario',
    name: 'Test Data Scenario',
    filename: 'test-data-scenario.md',
    description: 'Kịch bản dữ liệu test cho hệ thống',
    category: 'guide',
    icon: FileCode
  }
];

const categoryConfig: Record<string, { label: string; color: string }> = {
  system: { label: 'Hệ thống', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  alert: { label: 'Cảnh báo', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  data: { label: 'Dữ liệu', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  guide: { label: 'Hướng dẫn', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
};

function DocumentCard({ doc, onView }: { doc: DocumentInfo; onView: (doc: DocumentInfo) => void }) {
  const Icon = doc.icon;
  const category = categoryConfig[doc.category];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/docs/${doc.filename}`;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Đang tải ${doc.filename}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Icon className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <CardTitle className="text-base text-white group-hover:text-blue-400 transition-colors">
                  {doc.name}
                </CardTitle>
                <Badge variant="outline" className={`mt-1 text-xs ${category.color}`}>
                  {category.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-slate-400 text-sm mb-4">
            {doc.description}
          </CardDescription>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {doc.lastUpdated ? `Cập nhật: ${doc.lastUpdated}` : doc.filename}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-slate-600 hover:bg-slate-700"
                onClick={() => onView(doc)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Xem
              </Button>
              <Button
                size="sm"
                className="h-8 bg-blue-600 hover:bg-blue-700"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Tải
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DocumentViewer({ doc, content }: { doc: DocumentInfo; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Đã copy nội dung');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã tải ${doc.filename}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={categoryConfig[doc.category].color}>
            {categoryConfig[doc.category].label}
          </Badge>
          <span className="text-sm text-slate-400">{doc.filename}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-slate-600"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Đã copy' : 'Copy'}
          </Button>
          <Button
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Tải xuống
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <article className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-blue-400 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-table:text-slate-300 prose-th:text-white prose-th:border-slate-600 prose-td:border-slate-700">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </ScrollArea>
    </div>
  );
}

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleViewDoc = async (doc: DocumentInfo) => {
    setSelectedDoc(doc);
    setIsLoading(true);
    setIsDialogOpen(true);
    
    try {
      const response = await fetch(`/docs/${doc.filename}`);
      if (response.ok) {
        const text = await response.text();
        setDocContent(text);
      } else {
        setDocContent('# Không thể tải tài liệu\n\nVui lòng thử lại sau.');
      }
    } catch (error) {
      setDocContent('# Lỗi\n\nKhông thể tải tài liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả' },
    { id: 'system', label: 'Hệ thống' },
    { id: 'alert', label: 'Cảnh báo' },
    { id: 'data', label: 'Dữ liệu' },
    { id: 'guide', label: 'Hướng dẫn' }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Book className="h-6 w-6 text-blue-500" />
            Tài liệu hệ thống
          </h1>
          <p className="text-slate-400 mt-1">
            Xem và tải xuống các tài liệu hướng dẫn sử dụng hệ thống
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {documents.length} tài liệu
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm tài liệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600"
              />
            </div>
            
            <div className="flex gap-2">
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  className={selectedCategory === cat.id 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'border-slate-600 hover:bg-slate-700'}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => (
          <DocumentCard key={doc.id} doc={doc} onView={handleViewDoc} />
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400">Không tìm thấy tài liệu nào</p>
          </CardContent>
        </Card>
      )}

      {/* Document Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] bg-slate-900 border-slate-700 p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedDoc && (
                <>
                  <selectedDoc.icon className="h-5 w-5 text-blue-500" />
                  {selectedDoc.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            selectedDoc && <DocumentViewer doc={selectedDoc} content={docContent} />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Links */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-500" />
            Liên kết nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a 
              href="/control-tower/rules-doc" 
              className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Alert Rules Documentation</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="/control-tower/intelligent-rules" 
              className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <Settings className="h-4 w-4 text-blue-500" />
              <span>Cấu hình Rules</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="/control-tower/settings" 
              className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <Database className="h-4 w-4 text-green-500" />
              <span>Cài đặt hệ thống</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="/data-guide" 
              className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            >
              <Book className="h-4 w-4 text-purple-500" />
              <span>Hướng dẫn nhập liệu</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
