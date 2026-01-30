/**
 * WelcomePage - First step of platform onboarding
 * Introduces Bluecore positioning and gets user started
 * Design: Abstract geometric background with modern data-inspired patterns
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bell, Zap, Database, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';

// 5 core modules of Bluecore platform
const modules = [
  {
    icon: BarChart3,
    title: 'Financial Data Platform',
    description: 'Nguồn sự thật tài chính duy nhất',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 to-teal-500/5',
  },
  {
    icon: Zap,
    title: 'Marketing Data Platform',
    description: 'Đo lường giá trị thực của marketing',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 to-purple-500/5',
  },
  {
    icon: Users,
    title: 'Customer Data Platform',
    description: 'Hiểu khách hàng, tối ưu giá trị',
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-500/10 to-rose-500/5',
  },
  {
    icon: Bell,
    title: 'Control Tower',
    description: 'Cảnh báo sớm, hành động ngay',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-500/5',
  },
  {
    icon: Database,
    title: 'Data Warehouse',
    description: 'Xương sống dữ liệu doanh nghiệp',
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-500/10 to-indigo-500/5',
  },
];

// Positioning taglines
const positioningBadges = [
  'Not BI',
  'Not ERP',
  'Truth > Flexibility',
];

export default function WelcomePage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();

  return (
    <OnboardingLayout
      stepId="welcome"
      showBack={false}
      showSkip={true}
    >
      {/* Abstract geometric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large circle - top right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/10 blur-3xl"
        />
        {/* Medium circle - bottom left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/15 to-teal-500/10 blur-3xl"
        />
        {/* Small accent circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.25, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
          className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-2xl"
        />
        
        {/* Geometric grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        
        {/* Floating data dots */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-primary/30"
        />
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-2/3 right-1/3 w-3 h-3 rounded-full bg-emerald-500/25"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/2 left-1/3 w-2 h-2 rounded-full bg-violet-500/30"
        />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Positioning badges */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mb-6"
        >
          {positioningBadges.map((badge, index) => (
            <motion.span
              key={badge}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {badge}
            </motion.span>
          ))}
        </motion.div>

        {/* Logo / Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 flex items-center justify-center shadow-xl shadow-primary/25 ring-4 ring-primary/10">
            <span className="text-3xl font-bold text-primary-foreground">B</span>
          </div>
        </motion.div>

        {/* Welcome text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold tracking-tight mb-3"
        >
          Chào mừng đến với{' '}
          <span className="bg-gradient-to-r from-primary via-primary/80 to-indigo-600 bg-clip-text text-transparent">
            Bluecore
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-medium text-foreground/80 mb-2"
        >
          Executive Decision Operating System
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-muted-foreground max-w-md mb-10"
        >
          Giúp doanh nghiệp xây dựng nền tảng vận hành bền vững dựa trên dữ liệu — 
          cho CEO & CFO ra quyết định nhanh hơn, chính xác hơn.
        </motion.p>

        {/* Module cards - 5 modules in responsive grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full max-w-4xl mb-10"
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + index * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`group relative p-4 rounded-xl border bg-gradient-to-br ${module.bgGradient} backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-default`}
            >
              {/* Icon with gradient background */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-3 mx-auto shadow-md group-hover:shadow-lg transition-shadow`}>
                <module.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-foreground">{module.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{module.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Value proposition summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-6 text-sm text-muted-foreground mb-10"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Real Cash</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Truth First</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>Action Now</span>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button
            size="lg"
            onClick={() => goToNextStep('welcome')}
            disabled={isUpdating}
            className="gap-2 px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            Bắt đầu thiết lập
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
}
