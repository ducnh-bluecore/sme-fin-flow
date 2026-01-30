/**
 * WelcomePage - First step of platform onboarding
 * Redesigned: Immersive hero with dark gradient background
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bell, Zap, Database, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import heroBg from '@/assets/onboarding-hero-bg.png';

// 5 core modules
const modules = [
  {
    icon: BarChart3,
    title: 'Financial Data Platform',
    tagline: 'Truth > Flexibility',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-500/25',
  },
  {
    icon: Zap,
    title: 'Marketing Data Platform',
    tagline: 'Profit before Performance',
    gradient: 'from-violet-400 to-purple-500',
    glow: 'shadow-violet-500/25',
  },
  {
    icon: Users,
    title: 'Customer Data Platform',
    tagline: 'Population > Individual',
    gradient: 'from-pink-400 to-rose-500',
    glow: 'shadow-pink-500/25',
  },
  {
    icon: Bell,
    title: 'Control Tower',
    tagline: 'Awareness before Analytics',
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-500/25',
  },
  {
    icon: Database,
    title: 'Data Warehouse',
    tagline: 'Financial Spine',
    gradient: 'from-blue-400 to-indigo-500',
    glow: 'shadow-blue-500/25',
  },
];

export default function WelcomePage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* Background - positioned at edges, not center */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      
      {/* Strong center overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950/80" />
      
      {/* Radial gradient for center focus */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgb(2,6,23)_70%)]" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-4 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-lg font-bold text-white">B</span>
              </div>
              <span className="text-white font-semibold text-lg">Bluecore</span>
            </motion.div>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => goToNextStep('welcome')}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Bỏ qua
            </motion.button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Positioning badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {['Not BI', 'Not ERP', 'Not Accounting Software'].map((badge, i) => (
                <span
                  key={badge}
                  className="px-4 py-1.5 text-xs font-medium uppercase tracking-widest rounded-full bg-white/10 text-white/80 border border-white/20 backdrop-blur-sm"
                >
                  {badge}
                </span>
              ))}
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            >
              Executive Decision
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Operating System
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-12"
            >
              Giúp <strong className="text-white">CEO & CFO</strong> xây dựng nền tảng vận hành bền vững 
              dựa trên dữ liệu — ra quyết định nhanh hơn, chính xác hơn.
            </motion.p>

            {/* Module cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12"
            >
              {modules.map((module, index) => (
                <motion.div
                  key={module.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.08 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity blur-xl`} />
                  
                  <div className="relative">
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-3 shadow-lg ${module.glow}`}>
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm text-white mb-1">{module.title}</h3>
                    <p className="text-[10px] text-white/50 uppercase tracking-wide">{module.tagline}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => goToNextStep('welcome')}
                disabled={isUpdating}
                className="gap-2 px-10 py-6 text-base bg-white text-slate-900 hover:bg-white/90 shadow-xl shadow-white/10"
              >
                Bắt đầu thiết lập
                <ArrowRight className="h-5 w-5" />
              </Button>
              
              <p className="text-white/40 text-sm">
                Chỉ mất 3 phút để hoàn thành
              </p>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-8 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real Cash</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Truth First</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Action Now</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
