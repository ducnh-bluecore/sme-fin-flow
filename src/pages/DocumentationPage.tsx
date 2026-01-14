import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  BookOpen, 
  Database, 
  Shield, 
  Megaphone, 
  Wrench, 
  BarChart3,
  ArrowLeft,
  ExternalLink,
  FileCode,
  Table
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocumentItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  category: 'system' | 'data' | 'module' | 'technical';
  icon: React.ElementType;
  path: string;
  fileType: 'md' | 'sql';
  size?: string;
}

const documents: DocumentItem[] = [
  {
    id: 'system-architecture',
    title: 'Kiến trúc hệ thống & Spec chi tiết',
    titleEn: 'System Architecture & Detailed Specs',
    description: 'Sơ đồ hệ thống, luồng dữ liệu, bảng chính, KPI, màn hình và rule logic từng module',
    descriptionEn: 'System diagrams, data flows, main tables, KPIs, screens and rule logic for each module',
    category: 'system',
    icon: FileCode,
    path: '/docs/system-architecture.md',
    fileType: 'md',
    size: '35 KB'
  },
  {
    id: 'system-overview',
    title: 'Tổng quan tính năng hệ thống',
    titleEn: 'System Features Overview',
    description: 'Mô tả đầy đủ các module FDP, Control Tower, MDP và tất cả tính năng',
    descriptionEn: 'Complete description of FDP, Control Tower, MDP modules and all features',
    category: 'system',
    icon: BookOpen,
    path: '/docs/system-features-overview.md',
    fileType: 'md',
    size: '15 KB'
  },
  {
    id: 'system-features',
    title: 'Chi tiết tính năng hệ thống',
    titleEn: 'System Features Details',
    description: 'Tài liệu chi tiết về các tính năng và chức năng của hệ thống',
    descriptionEn: 'Detailed documentation of system features and functionalities',
    category: 'system',
    icon: FileText,
    path: '/docs/system-features.md',
    fileType: 'md',
    size: '12 KB'
  },
  {
    id: 'mdp-data-requirements',
    title: 'Yêu cầu dữ liệu MDP',
    titleEn: 'MDP Data Requirements',
    description: 'Chi tiết dữ liệu cần thiết để chạy Marketing Data Platform',
    descriptionEn: 'Detailed data requirements for Marketing Data Platform',
    category: 'data',
    icon: Megaphone,
    path: '/docs/mdp-data-requirements.md',
    fileType: 'md',
    size: '18 KB'
  },
  {
    id: 'system-data-requirements',
    title: 'Yêu cầu dữ liệu toàn hệ thống',
    titleEn: 'System Data Requirements',
    description: 'Tổng hợp yêu cầu dữ liệu cho tất cả các module',
    descriptionEn: 'Comprehensive data requirements for all modules',
    category: 'data',
    icon: Database,
    path: '/docs/system-data-requirements.md',
    fileType: 'md',
    size: '20 KB'
  },
  {
    id: 'fdp-control-tower',
    title: 'Tài liệu FDP & Control Tower',
    titleEn: 'FDP & Control Tower Documentation',
    description: 'Hướng dẫn sử dụng FDP và Control Tower',
    descriptionEn: 'User guide for FDP and Control Tower',
    category: 'module',
    icon: BarChart3,
    path: '/docs/fdp-control-tower-documentation.md',
    fileType: 'md',
    size: '25 KB'
  },
  {
    id: 'kpi-alert-rules',
    title: 'Quy tắc cảnh báo KPI',
    titleEn: 'KPI Alert Rules',
    description: 'Tài liệu về các quy tắc và ngưỡng cảnh báo KPI',
    descriptionEn: 'Documentation on KPI alert rules and thresholds',
    category: 'module',
    icon: Wrench,
    path: '/docs/kpi-alert-rules-documentation.md',
    fileType: 'md',
    size: '10 KB'
  },
  {
    id: 'alert-system',
    title: 'Hệ thống Alert',
    titleEn: 'Alert System',
    description: 'Chi tiết về hệ thống cảnh báo và thông báo',
    descriptionEn: 'Details about alert and notification system',
    category: 'module',
    icon: Shield,
    path: '/docs/alert-system-data-requirements.md',
    fileType: 'md',
    size: '8 KB'
  },
  {
    id: 'self-host-schema',
    title: 'Database Schema (Self-host)',
    titleEn: 'Database Schema (Self-host)',
    description: 'SQL schema để tự host database',
    descriptionEn: 'SQL schema for self-hosting database',
    category: 'technical',
    icon: FileCode,
    path: '/docs/self-host-schema.sql',
    fileType: 'sql',
    size: '50 KB'
  },
  {
    id: 'test-data',
    title: 'Test Data - Tất cả module',
    titleEn: 'Test Data - All Modules',
    description: 'SQL script để tạo dữ liệu test cho tất cả module',
    descriptionEn: 'SQL script to create test data for all modules',
    category: 'technical',
    icon: Table,
    path: '/docs/test-data-all-modules.sql',
    fileType: 'sql',
    size: '30 KB'
  }
];

const categoryConfig = {
  system: { label: 'Hệ thống', labelEn: 'System', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  data: { label: 'Dữ liệu', labelEn: 'Data', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  module: { label: 'Module', labelEn: 'Module', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  technical: { label: 'Kỹ thuật', labelEn: 'Technical', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
};

export default function DocumentationPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const response = await fetch(doc.path);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.path.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(doc.path, '_blank');
    }
  };

  const handleView = (doc: DocumentItem) => {
    window.open(doc.path, '_blank');
  };

  const groupedDocs = {
    system: documents.filter(d => d.category === 'system'),
    data: documents.filter(d => d.category === 'data'),
    module: documents.filter(d => d.category === 'module'),
    technical: documents.filter(d => d.category === 'technical')
  };

  return (
    <>
      <Helmet>
        <title>{language === 'vi' ? 'Tài liệu hệ thống' : 'System Documentation'} | Bluecore</title>
        <meta name="description" content={language === 'vi' ? 'Tải xuống tài liệu hệ thống Bluecore' : 'Download Bluecore system documentation'} />
      </Helmet>

      <div className="min-h-screen bg-[#12141C]">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/portal')}
              className="mb-4 text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Quay lại Portal' : 'Back to Portal'}
            </Button>

            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600/50">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100">
                  {language === 'vi' ? 'Tài liệu hệ thống' : 'System Documentation'}
                </h1>
                <p className="text-slate-400">
                  {language === 'vi' 
                    ? 'Tải xuống tài liệu, hướng dẫn và schema database' 
                    : 'Download documentation, guides and database schema'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Documents by Category */}
          {Object.entries(groupedDocs).map(([category, docs], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Badge className={`${categoryConfig[category as keyof typeof categoryConfig].color} border`}>
                  {language === 'vi' 
                    ? categoryConfig[category as keyof typeof categoryConfig].label 
                    : categoryConfig[category as keyof typeof categoryConfig].labelEn}
                </Badge>
                <span className="text-sm text-slate-500">({docs.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                  >
                    <Card className="bg-slate-800/60 border-slate-700/50 hover:border-slate-600/80 transition-all duration-200 h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="p-2 rounded-lg bg-slate-700/50">
                            <doc.icon className="h-5 w-5 text-slate-300" />
                          </div>
                          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                            .{doc.fileType}
                          </Badge>
                        </div>
                        <CardTitle className="text-base text-slate-100 mt-3">
                          {language === 'vi' ? doc.title : doc.titleEn}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-400">
                          {language === 'vi' ? doc.description : doc.descriptionEn}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {doc.size && (
                          <p className="text-xs text-slate-500 mb-3">~{doc.size}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(doc)}
                            className="flex-1 text-slate-300 border-slate-600 hover:bg-slate-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            {language === 'vi' ? 'Xem' : 'View'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-100"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {language === 'vi' ? 'Tải xuống' : 'Download'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 text-center"
          >
            <p className="text-sm text-slate-400">
              {language === 'vi' 
                ? 'Tài liệu được cập nhật thường xuyên. Phiên bản mới nhất: Tháng 1/2024'
                : 'Documentation is updated regularly. Latest version: January 2024'}
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
