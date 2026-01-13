import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  BarChart3, 
  Database, 
  Users, 
  Megaphone,
  Wrench,
  ExternalLink,
  ArrowRight,
  Zap,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface SystemCard {
  id: string;
  name: string;
  shortName: string;
  description: string;
  detailDescription: string;
  features: string[];
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  status: 'active' | 'coming-soon' | 'external';
  path?: string;
  externalUrl?: string;
}

// System Card Component for radial layout
function SystemCardComponent({ 
  system, 
  onClick, 
  hoveredSystem,
  clickToAccessText
}: { 
  system: SystemCard; 
  onClick: (system: SystemCard) => void; 
  hoveredSystem: string | null;
  clickToAccessText: string;
}) {
  return (
    <div className="relative">
      <Card 
        className={`
          relative p-4 rounded-lg border bg-slate-800/60 backdrop-blur-sm
          transition-all duration-300 group overflow-hidden
          ${system.status === 'active' 
            ? 'cursor-pointer hover:bg-slate-800/80 hover:scale-105 hover:shadow-lg' 
            : 'opacity-60'}
        `}
        style={{
          borderColor: system.status === 'active' ? system.accentColor + '60' : 'rgba(255,255,255,0.1)'
        }}
        onClick={() => onClick(system)}
      >
        {/* Status line */}
        <div 
          className="absolute top-0 left-0 w-full h-0.5"
          style={{ backgroundColor: system.status === 'active' ? system.accentColor : 'rgba(255,255,255,0.1)' }}
        />
        
        <div className="relative">
          {/* Icon & Title Row */}
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="flex-shrink-0 p-2 rounded-lg"
              style={{ 
                backgroundColor: system.accentColor + '18',
                border: `1px solid ${system.accentColor}30`
              }}
            >
              <system.icon 
                className="h-5 w-5" 
                style={{ color: system.accentColor }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{system.name}</h3>
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] font-medium"
                  style={{ color: system.accentColor }}
                >
                  {system.shortName}
                </span>
                {system.status === 'active' ? (
                  <Badge 
                    className="rounded text-[9px] font-medium px-1 py-0 h-3.5 border-0"
                    style={{ 
                      backgroundColor: system.accentColor + 'DD',
                      color: '#fff'
                    }}
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge className="rounded bg-slate-700/50 text-slate-400 text-[9px] px-1 py-0 h-3.5 border border-slate-600/30">
                    Soon
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">
            {system.description}
          </p>

          {/* Features */}
          <div className="flex flex-wrap gap-1">
            {system.features.slice(0, 2).map((feature, i) => (
              <span 
                key={i}
                className="px-1.5 py-0.5 text-[9px] rounded bg-slate-700/30 text-slate-400 border border-slate-600/20"
              >
                {feature}
              </span>
            ))}
            {system.features.length > 2 && (
              <span className="text-[9px] text-slate-500">+{system.features.length - 2}</span>
            )}
          </div>
        </div>
      </Card>

      {/* Hover Detail Tooltip */}
      <AnimatePresence>
        {hoveredSystem === system.id && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 left-0 right-0 mt-2 p-3 rounded-lg border bg-slate-900/95 backdrop-blur-xl shadow-xl"
            style={{
              borderColor: system.accentColor + '40'
            }}
          >
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {system.detailDescription}
            </p>
            {system.status === 'active' && (
              <div className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: system.accentColor }}>
                <ArrowRight className="h-3 w-3" />
                <span>{clickToAccessText}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PortalPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [hoveredSystem] = useState<string | null>(null);

  const allSystems: SystemCard[] = [
    {
      id: 'cdp',
      name: 'Customer Data Platform',
      shortName: 'CDP',
      description: language === 'vi' 
        ? 'Web App - Nền tảng hợp nhất dữ liệu khách hàng 360°'
        : 'Web App - Unified 360° customer data platform',
      detailDescription: language === 'vi'
        ? 'Thu thập, hợp nhất và phân tích dữ liệu khách hàng từ tất cả các điểm chạm. Xây dựng hồ sơ khách hàng 360° để cá nhân hóa trải nghiệm, tối ưu chiến dịch marketing và tăng tỷ lệ chuyển đổi.'
        : 'Collect, unify and analyze customer data from all touchpoints. Build 360° customer profiles to personalize experiences, optimize marketing campaigns and increase conversion rates.',
      features: ['Campaign Tracking', 'Email', 'Notification'],
      icon: Users,
      accentColor: '#5B9BD5',
      glowColor: 'shadow-[0_0_20px_rgba(91,155,213,0.2)]',
      status: 'active',
      path: '/cdp'
    },
    {
      id: 'marketing',
      name: 'Marketing Data Platform',
      shortName: 'MDP',
      description: language === 'vi'
        ? 'Web App - Profit before Performance. Cash before Clicks.'
        : 'Web App - Profit before Performance. Cash before Clicks.',
      detailDescription: language === 'vi'
        ? 'MDP đo lường GIÁ TRỊ TÀI CHÍNH thật của marketing. 2 Modes: Marketing Mode (Execution) cho team marketing vận hành hằng ngày. CMO Mode (Decision) cho quyết định lớn về margin, cash và risk.'
        : 'MDP measures the REAL FINANCIAL VALUE of marketing. 2 Modes: Marketing Mode (Execution) for daily marketing team operations. CMO Mode (Decision) for major decisions on margin, cash and risk.',
      features: ['Profit Attribution', 'Cash Impact', 'Risk Alerts', '2 Modes'],
      icon: Megaphone,
      accentColor: '#8B7EC8',
      glowColor: 'shadow-[0_0_20px_rgba(139,126,200,0.2)]',
      status: 'active',
      path: '/mdp'
    },
    {
      id: 'operations',
      name: 'Control Tower',
      shortName: 'OPS',
      description: language === 'vi'
        ? 'Web App - Hệ thống kiểm soát vận hành bán lẻ'
        : 'Web App - Retail operation control system',
      detailDescription: language === 'vi'
        ? 'Kiểm soát vận hành doanh nghiệp bằng dữ liệu tập trung. Thông báo realtime, quản lý task, cảnh báo KPI và phân tích hiệu suất cửa hàng.'
        : 'Control business operations with centralized data. Real-time notifications, task management, KPI alerts and store performance analytics.',
      features: language === 'vi' ? ['Realtime Alerts', 'Task Management', 'Analytics'] : ['Realtime Alerts', 'Task Management', 'Analytics'],
      icon: Wrench,
      accentColor: '#D4A84B',
      glowColor: 'shadow-[0_0_20px_rgba(212,168,75,0.2)]',
      status: 'active',
      path: '/control-tower'
    },
    {
      id: 'fdp',
      name: 'Finance',
      shortName: 'FIN',
      description: language === 'vi'
        ? 'Web App - Nền tảng quản lý tài chính toàn diện'
        : 'Web App - Comprehensive financial management platform',
      detailDescription: language === 'vi'
        ? 'Hệ thống quản lý tài chính doanh nghiệp toàn diện bao gồm báo cáo tài chính, dự báo dòng tiền, quản lý công nợ, phân tích chi phí và theo dõi ngân sách theo thời gian thực.'
        : 'Comprehensive enterprise financial management system including financial reports, cash flow forecasting, debt management, cost analysis and real-time budget tracking.',
      features: language === 'vi' ? ['Báo cáo tài chính', 'Dự báo dòng tiền', 'Phân tích chi phí'] : ['Financial Reports', 'Cash Flow Forecast', 'Cost Analysis'],
      icon: BarChart3,
      accentColor: '#4A9B7F',
      glowColor: 'shadow-[0_0_20px_rgba(74,155,127,0.2)]',
      status: 'active',
      path: '/dashboard'
    }
  ];

  const handleCardClick = (system: SystemCard) => {
    if (system.status === 'active' && system.path) {
      navigate(system.path);
    } else if (system.status === 'external' && system.externalUrl) {
      window.open(system.externalUrl, '_blank');
    }
  };

  const handleCoreClick = () => {
    window.open('https://admin.bluecore.vn/', '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Data Platform Portal | Unified Hub</title>
        <meta name="description" content={t('portal.subtitle')} />
      </Helmet>

      <div className="min-h-screen bg-[#12141C] overflow-x-hidden font-[Arial,sans-serif]">
        {/* Tech Grid Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-slate-600/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-gradient-to-t from-slate-700/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 left-10 w-2 h-2 bg-slate-500/20 rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-slate-400/15 rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-slate-500/20 rounded-full animate-pulse delay-500" />
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-slate-400/10 rounded-full animate-pulse delay-700" />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center px-4 py-12 md:py-16">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 md:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-700/30 border border-slate-600/40 mb-6 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400 tracking-wide uppercase">{t('portal.tagline')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100 mb-4">
              {t('portal.title1')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500">
                {t('portal.title2')}
              </span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
              {t('portal.subtitle')}
            </p>
          </motion.div>

          {/* Radial Layout Container */}
          <div className="relative w-full max-w-5xl mx-auto px-4">
            {/* Top Row - CDP and MDP */}
            <div className="flex justify-between gap-4 mb-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", duration: 0.6 }}
                className="w-[280px]"
              >
                <SystemCardComponent system={allSystems[0]} onClick={handleCardClick} hoveredSystem={hoveredSystem} clickToAccessText={t('portal.clickToAccess')} />
              </motion.div>

              <div className="flex-1" />

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", duration: 0.6 }}
                className="w-[280px]"
              >
                <SystemCardComponent system={allSystems[1]} onClick={handleCardClick} hoveredSystem={hoveredSystem} clickToAccessText={t('portal.clickToAccess')} />
              </motion.div>
            </div>

            {/* Middle Row - Data Warehouse with Connection Lines */}
            <div className="relative flex items-center justify-center py-6">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(100,116,139,0.15)" />
                    <stop offset="50%" stopColor="rgba(100,116,139,0.4)" />
                    <stop offset="100%" stopColor="rgba(100,116,139,0.15)" />
                  </linearGradient>
                </defs>
                <line x1="50%" y1="50%" x2="8%" y2="0%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="92%" y2="0%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="8%" y2="100%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="92%" y2="100%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", duration: 0.8 }}
                className="relative z-10"
              >
                <Card 
                  className="relative w-52 md:w-64 p-5 md:p-6 rounded-xl border border-slate-600/40 bg-slate-800/80 backdrop-blur-xl cursor-pointer group overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleCoreClick}
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-slate-500/50" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-slate-500/50" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-slate-500/50" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-slate-500/50" />
                  
                  <div className="absolute -inset-4 bg-gradient-radial from-slate-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 mb-3 shadow-md">
                      <Database className="h-8 w-8 md:h-10 md:w-10 text-slate-200" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-100 mb-1 tracking-tight">Data Warehouse</h3>
                    <p className="text-[10px] text-slate-400 mb-3 tracking-wide">BigQuery / Snowflake</p>
                    <Badge className="rounded-md bg-slate-600 text-slate-200 border-0 font-medium text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {t('portal.coreSystem')}
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Bottom Row - OPS and FIN */}
            <div className="flex justify-between gap-4 mt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", duration: 0.6 }}
                className="w-[280px]"
              >
                <SystemCardComponent system={allSystems[2]} onClick={handleCardClick} hoveredSystem={hoveredSystem} clickToAccessText={t('portal.clickToAccess')} />
              </motion.div>

              <div className="flex-1" />

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring", duration: 0.6 }}
                className="w-[280px]"
              >
                <SystemCardComponent system={allSystems[3]} onClick={handleCardClick} hoveredSystem={hoveredSystem} clickToAccessText={t('portal.clickToAccess')} />
              </motion.div>
            </div>
          </div>

          {/* Legend */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-wrap justify-center gap-8 mt-12"
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-[#4A9B7F]" />
              <span>{t('portal.active')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span>{t('portal.comingSoon')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-500 to-slate-600" />
              <span>{t('portal.coreSystem')}</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 items-center"
          >
            <button 
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-slate-700 text-slate-100 font-medium tracking-wide shadow-lg hover:bg-slate-600 hover:shadow-xl transition-all hover:-translate-y-0.5 group border border-slate-600"
            >
              <span>{t('portal.accessFinance')}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/documentation')}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-slate-800/50 text-slate-300 font-medium tracking-wide hover:bg-slate-700/50 transition-all group border border-slate-600/50"
            >
              <FileText className="h-4 w-4" />
              <span>{language === 'vi' ? 'Tài liệu hệ thống' : 'Documentation'}</span>
            </button>
          </motion.div>

          {/* Footer tech detail */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-16 text-center opacity-50"
          >
            <p className="text-[10px] text-slate-600 tracking-wide">
              {t('portal.poweredBy')}
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}