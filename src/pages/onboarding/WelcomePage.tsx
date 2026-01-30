/**
 * WelcomePage - First step of platform onboarding
 * Introduces Bluecore positioning and gets user started
 * Design: Hero with illustration + modern layout
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bell, Zap, Database, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import heroIllustration from '@/assets/onboarding-hero-illustration.png';

// 5 core modules of Bluecore platform
const modules = [
  {
    icon: BarChart3,
    title: 'Financial Data',
    shortTitle: 'FDP',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Zap,
    title: 'Marketing Data',
    shortTitle: 'MDP',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Users,
    title: 'Customer Data',
    shortTitle: 'CDP',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Bell,
    title: 'Control Tower',
    shortTitle: 'CT',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Database,
    title: 'Data Warehouse',
    shortTitle: 'DWH',
    gradient: 'from-blue-500 to-indigo-600',
  },
];

// Key benefits
const benefits = [
  'Một nguồn sự thật duy nhất cho dữ liệu tài chính',
  'Đo lường giá trị thực của mỗi đồng marketing',
  'Cảnh báo sớm, hành động ngay, không bất ngờ',
];

export default function WelcomePage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();

  return (
    <OnboardingLayout
      stepId="welcome"
      showBack={false}
      showSkip={true}
    >
      {/* Background gradient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/15 to-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 blur-3xl" />
      </div>

      <div className="relative grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[60vh]">
        {/* Left: Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
          {/* Positioning badges */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap justify-center lg:justify-start gap-2 mb-5"
          >
            {['Not BI', 'Not ERP', 'Truth > Flexibility'].map((badge, index) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {badge}
              </motion.span>
            ))}
          </motion.div>

          {/* Logo + Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-2xl font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Chào mừng đến với{' '}
                <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                  Bluecore
                </span>
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                Executive Decision Operating System
              </p>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-foreground/80 max-w-md mb-6"
          >
            Giúp doanh nghiệp xây dựng nền tảng vận hành bền vững dựa trên dữ liệu — 
            cho <strong className="text-foreground">CEO & CFO</strong> ra quyết định nhanh hơn, chính xác hơn.
          </motion.p>

          {/* Benefits list */}
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2 mb-6 text-left"
          >
            {benefits.map((benefit, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Module pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {modules.map((module, index) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.65 + index * 0.05 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border shadow-sm"
              >
                <div className={`w-5 h-5 rounded bg-gradient-to-br ${module.gradient} flex items-center justify-center`}>
                  <module.icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">{module.title}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
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

        {/* Right: Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
          className="order-1 lg:order-2 flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-lg lg:max-w-xl">
            {/* Glow effect behind illustration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-violet-500/10 to-emerald-500/10 rounded-3xl blur-2xl transform scale-90" />
            
            {/* Illustration */}
            <motion.img
              src={heroIllustration}
              alt="Bluecore Data Platform"
              className="relative w-full h-auto object-contain drop-shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: 'easeInOut',
              }}
            />

            {/* Floating stats cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -left-4 top-1/4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 hidden md:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Real Cash</div>
                  <div className="text-sm font-semibold text-foreground">Truth First</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="absolute -right-4 bottom-1/4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 hidden md:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Action Now</div>
                  <div className="text-sm font-semibold text-foreground">Không bất ngờ</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
}
