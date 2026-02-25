import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  ChevronRight,
  DollarSign,
  Target,
  Bell,
  Package,
  BarChart3,
  Wallet,
  FileText,
  TrendingUp,
  Users,
  Settings,
  Zap,
  AlertTriangle,
  LineChart,
  PieChart,
  Layers,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Home,
  Download
} from 'lucide-react';
import { printFDPDocumentationAsPDF } from '@/lib/fdp-pdf-export';
import { printCommandDocumentationAsPDF } from '@/lib/command-pdf-export';
import { printFullBluecorePDF } from '@/lib/bluecore-full-pdf-export';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FDPDocumentation } from '@/components/docs/FDPDocumentation';
import { MDPDocumentation } from '@/components/docs/MDPDocumentation';
import { ControlTowerDocumentation } from '@/components/docs/ControlTowerDocumentation';
import { CommandDocumentation } from '@/components/docs/CommandDocumentation';

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('fdp');

  const modules = [
    {
      id: 'fdp',
      name: 'FDP - Financial Data Platform',
      shortName: 'FDP',
      description: 'Nền tảng quản lý tài chính - Single Source of Truth cho CEO/CFO',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      features: 12,
    },
    {
      id: 'mdp',
      name: 'MDP - Marketing Data Platform',
      shortName: 'MDP',
      description: 'Profit before Performance. Cash before Clicks.',
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      features: 14,
    },
    {
      id: 'control-tower',
      name: 'Control Tower',
      shortName: 'OPS',
      description: 'Hệ thống giám sát vận hành Real-time',
      icon: Bell,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      features: 8,
    },
    {
      id: 'command',
      name: 'Command — Retail Inventory OS',
      shortName: 'CMD',
      description: 'Decision Stack cho tồn kho: Size Intelligence, Clearance, Growth Simulator',
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      features: 9,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Tài liệu hệ thống | Bluecore Platform</title>
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Back buttons */}
                <div className="flex items-center gap-2 mr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/portal')}
                    className="h-9 px-3"
                  >
                    <Home className="h-4 w-4 mr-1" />
                    Portal
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="h-9 px-3"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    FDP
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => printFullBluecorePDF()}
                    className="h-9 px-3 ml-2"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Tải PDF Tổng hợp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeTab === 'command') {
                        printCommandDocumentationAsPDF();
                      } else {
                        printFDPDocumentationAsPDF();
                      }
                    }}
                    className="h-9 px-3"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF {activeTab === 'command' ? 'Command' : 'FDP'}
                  </Button>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Tài liệu hệ thống</h1>
                  <p className="text-sm text-muted-foreground">
                    Hướng dẫn chi tiết cho từng module của Bluecore Platform
                  </p>
                </div>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm tài liệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module Tabs */}
        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 h-auto p-1 bg-muted/50">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <TabsTrigger
                    key={module.id}
                    value={module.id}
                    className={cn(
                      "flex items-center gap-2 py-3 px-4 data-[state=active]:shadow-sm",
                      "data-[state=active]:bg-background"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", module.color)} />
                    <span className="hidden sm:inline font-medium">{module.shortName}</span>
                    <Badge variant="secondary" className="hidden md:flex text-xs">
                      {module.features} tính năng
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Module Description Card */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {modules.map((module) => (
                <TabsContent key={module.id} value={module.id} className="mt-0 space-y-6">
                  <div className={cn(
                    "rounded-xl border p-6",
                    module.bgColor,
                    module.borderColor
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-lg", module.bgColor)}>
                        <module.icon className={cn("h-8 w-8", module.color)} />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-1">{module.name}</h2>
                        <p className="text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documentation Content */}
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    {module.id === 'fdp' && <FDPDocumentation searchQuery={searchQuery} />}
                    {module.id === 'mdp' && <MDPDocumentation searchQuery={searchQuery} />}
                    {module.id === 'control-tower' && <ControlTowerDocumentation searchQuery={searchQuery} />}
                    {module.id === 'command' && <CommandDocumentation searchQuery={searchQuery} />}
                  </ScrollArea>
                </TabsContent>
              ))}
            </motion.div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
