/**
 * WelcomePage - First step of platform onboarding
 * Introduces Bluecore and gets user started
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bell, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingLayout } from '@/components/onboarding';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';

const features = [
  {
    icon: BarChart3,
    title: 'Financial Data Platform',
    description: 'Một nguồn sự thật cho dữ liệu tài chính của bạn',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Zap,
    title: 'Marketing Data Platform',
    description: 'Đo lường giá trị thực của mỗi đồng marketing',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: Bell,
    title: 'Control Tower',
    description: 'Cảnh báo sớm, hành động ngay, không bất ngờ',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

export default function WelcomePage() {
  const { goToNextStep, isUpdating } = useOnboardingFlow();

  return (
    <OnboardingLayout
      stepId="welcome"
      showBack={false}
      showSkip={true}
    >
      <div className="flex flex-col items-center text-center">
        {/* Logo / Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-3xl font-bold text-primary-foreground">B</span>
          </div>
        </motion.div>

        {/* Welcome text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
        >
          Chào mừng đến với{' '}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Bluecore
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground max-w-lg mb-12"
        >
          Nền tảng dữ liệu giúp doanh nghiệp ra quyết định nhanh hơn, chính xác hơn.
        </motion.p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid gap-4 md:grid-cols-3 w-full max-w-2xl mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.bgColor} ${feature.color} flex items-center justify-center mb-4 mx-auto`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
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
            className="gap-2 px-8"
          >
            Bắt đầu thiết lập
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
}
