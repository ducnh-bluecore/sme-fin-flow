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
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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

const allSystems: SystemCard[] = [
  {
    id: 'cdp',
    name: 'Customer Data Platform',
    shortName: 'CDP',
    description: 'Web App - Nền tảng hợp nhất dữ liệu khách hàng 360°',
    detailDescription: 'Thu thập, hợp nhất và phân tích dữ liệu khách hàng từ tất cả các điểm chạm. Xây dựng hồ sơ khách hàng 360° để cá nhân hóa trải nghiệm, tối ưu chiến dịch marketing và tăng tỷ lệ chuyển đổi.',
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
    description: 'Web App - Nền tảng dữ liệu marketing tích hợp đa kênh',
    detailDescription: 'Quản lý và phân tích dữ liệu marketing đa kênh bao gồm Google Ads, Facebook, TikTok, Email và các kênh khác. Đo lường ROI, tối ưu ngân sách và tự động hóa báo cáo hiệu suất chiến dịch.',
    features: ['Marketing', 'Content', 'Product', 'Ads Platform'],
    icon: Megaphone,
    accentColor: '#8B7EC8',
    glowColor: 'shadow-[0_0_20px_rgba(139,126,200,0.2)]',
    status: 'coming-soon'
  },
  {
    id: 'operations',
    name: 'Operation System',
    shortName: 'OPS',
    description: 'Web App + Mobile App - Tối ưu hóa quy trình vận hành',
    detailDescription: 'Số hóa và tự động hóa quy trình vận hành nội bộ. Quản lý công việc, theo dõi tiến độ, phân công nhiệm vụ và báo cáo KPI nhân sự. Hỗ trợ cả web và mobile app cho đội ngũ hiện trường.',
    features: ['Workflow tự động', 'Quản lý tác vụ', 'Mobile App'],
    icon: Wrench,
    accentColor: '#D4A84B',
    glowColor: 'shadow-[0_0_20px_rgba(212,168,75,0.2)]',
    status: 'coming-soon'
  },
  {
    id: 'fdp',
    name: 'Finance',
    shortName: 'FIN',
    description: 'Web App - Nền tảng quản lý tài chính toàn diện',
    detailDescription: 'Hệ thống quản lý tài chính doanh nghiệp toàn diện bao gồm báo cáo tài chính, dự báo dòng tiền, quản lý công nợ, phân tích chi phí và theo dõi ngân sách theo thời gian thực.',
    features: ['Báo cáo tài chính', 'Dự báo dòng tiền', 'Phân tích chi phí'],
    icon: BarChart3,
    accentColor: '#4A9B7F',
    glowColor: 'shadow-[0_0_20px_rgba(74,155,127,0.2)]',
    status: 'active',
    path: '/dashboard'
  }
];

// System Card Component for radial layout
function SystemCardComponent({ 
  system, 
  onClick, 
  hoveredSystem 
}: { 
  system: SystemCard; 
  onClick: (system: SystemCard) => void; 
  hoveredSystem: string | null;
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
                <span>Click để truy cập</span>
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
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

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
        <meta name="description" content="Trung tâm điều hướng các hệ thống Data Platform" />
      </Helmet>

      <div className="min-h-screen bg-[#12141C] overflow-x-hidden font-[Arial,sans-serif]">
        {/* Tech Grid Background */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
          {/* Soft gradient overlays */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-b from-slate-600/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-gradient-to-t from-slate-700/5 to-transparent rounded-full blur-3xl" />
          {/* Floating particles effect */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-slate-500/20 rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-slate-400/15 rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-slate-500/20 rounded-full animate-pulse delay-500" />
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-slate-400/10 rounded-full animate-pulse delay-700" />
          {/* Subtle noise texture */}
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
              <span className="text-sm text-slate-400 tracking-wide uppercase">Bluecore Data Ecosystem</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-100 mb-4">
              Data Driven
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500">
                Platform
              </span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
              Hệ sinh thái dữ liệu doanh nghiệp tích hợp
            </p>
          </motion.div>

          {/* Radial Layout Container */}
          <div className="relative w-full max-w-5xl mx-auto px-4">
            {/* Top Row - CDP and MDP */}
            <div className="flex justify-between gap-4 mb-4">
              {/* CDP - Top Left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", duration: 0.6 }}
                className="w-[280px]"
                onMouseEnter={() => setHoveredSystem('cdp')}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <SystemCardComponent system={allSystems[0]} onClick={handleCardClick} hoveredSystem={hoveredSystem} />
              </motion.div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* MDP - Top Right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", duration: 0.6 }}
                className="w-[280px]"
                onMouseEnter={() => setHoveredSystem('marketing')}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <SystemCardComponent system={allSystems[1]} onClick={handleCardClick} hoveredSystem={hoveredSystem} />
              </motion.div>
            </div>

            {/* Middle Row - Data Warehouse with Connection Lines */}
            <div className="relative flex items-center justify-center py-6">
              {/* Connection Lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(100,116,139,0.15)" />
                    <stop offset="50%" stopColor="rgba(100,116,139,0.4)" />
                    <stop offset="100%" stopColor="rgba(100,116,139,0.15)" />
                  </linearGradient>
                </defs>
                {/* Diagonal lines to corners */}
                <line x1="50%" y1="50%" x2="8%" y2="0%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="92%" y2="0%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="8%" y2="100%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="92%" y2="100%" stroke="url(#lineGradient)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>

              {/* Core Data Warehouse - Center */}
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
                      Core System
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Bottom Row - OPS and FIN */}
            <div className="flex justify-between gap-4 mt-4">
              {/* OPS - Bottom Left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", duration: 0.6 }}
                className="w-[280px]"
                onMouseEnter={() => setHoveredSystem('operations')}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <SystemCardComponent system={allSystems[2]} onClick={handleCardClick} hoveredSystem={hoveredSystem} />
              </motion.div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* FIN - Bottom Right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring", duration: 0.6 }}
                className="w-[280px]"
                onMouseEnter={() => setHoveredSystem('fdp')}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <SystemCardComponent system={allSystems[3]} onClick={handleCardClick} hoveredSystem={hoveredSystem} />
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
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span>Coming Soon</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-500 to-slate-600" />
              <span>Core System</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-10"
          >
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-slate-700 text-slate-100 font-medium tracking-wide shadow-lg hover:bg-slate-600 hover:shadow-xl transition-all hover:-translate-y-0.5 group border border-slate-600"
            >
              <span>Access Finance Platform</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
              Powered by Bluecore Data Architecture v2.0
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
