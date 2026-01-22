import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  Target,
  ArrowRight,
  FileText,
  Layers,
  DollarSign,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CDPPage() {
  const navigate = useNavigate();

  // Core features for V1
  const coreFeatures = [
    {
      id: 'value-distribution',
      title: 'Value Distribution',
      description: 'Phân phối giá trị khách hàng theo percentile (P10/P25/P50/P75/P90)',
      icon: BarChart3,
      status: 'active' as const,
      path: '/cdp/value-distribution',
    },
    {
      id: 'trend-engine',
      title: 'Trend Engine',
      description: 'Phát hiện spend decline, velocity slowdown, mix shift',
      icon: TrendingUp,
      status: 'coming' as const,
    },
    {
      id: 'segment-asset',
      title: 'Segment as Asset',
      description: 'Định nghĩa segment có version, owner, effective date',
      icon: Layers,
      status: 'coming' as const,
    },
    {
      id: 'lifecycle-economics',
      title: 'Lifecycle Economics',
      description: 'Time-to-second-purchase, decay curve, retention value',
      icon: Activity,
      status: 'coming' as const,
    },
  ];

  const coreOutputs = [
    {
      id: 'trend-insight',
      title: 'Trend Insight',
      description: 'Phát hiện dịch chuyển giá trị trong tập khách hàng',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      examples: [
        'VIP segment shrinking 8% MoM',
        'AOV giảm 15% vs Q1 baseline',
        'Cohort Q4-2023 decay rate tăng 2x'
      ]
    },
    {
      id: 'decision-prompt',
      title: 'Decision Prompt',
      description: 'Câu hỏi quyết định cần CEO/CFO trả lời',
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      examples: [
        'Có nên điều chỉnh chính sách VIP?',
        'Có nên cắt discount cho segment Low-Value?',
        'Có nên tăng ngưỡng free shipping?'
      ]
    },
    {
      id: 'audience-definition',
      title: 'Audience Definition',
      description: 'Định nghĩa nhóm khách hàng (read-only, versioned)',
      icon: Layers,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      examples: [
        'High-Value At-Risk (v2.1)',
        'New Customers Q1-2024 (v1.0)',
        'Churned VIP Last 90 Days (v3.0)'
      ]
    }
  ];

  const corePrinciples = [
    {
      title: 'Customer = Financial Asset',
      description: 'Khách hàng = dòng tiền tương lai + rủi ro + chi phí phục vụ',
      icon: DollarSign
    },
    {
      title: 'Population > Individual',
      description: 'CDP chỉ quan tâm phân phối: cohort, segment, percentile',
      icon: BarChart3
    },
    {
      title: 'Shift, không phải Snapshot',
      description: 'Đang thay đổi như thế nào so với baseline?',
      icon: TrendingUp
    },
    {
      title: 'Insight = Tiền hoặc Rủi ro',
      description: 'Mọi insight phải định lượng impact hoặc risk',
      icon: AlertTriangle
    }
  ];

  const forbiddenFeatures = [
    'Pipeline, Lead stage',
    'Task, Reminder, Follow-up',
    'Campaign builder',
    'KPI click/open/engagement',
    'Customer 360 profile',
    'Loyalty points/rewards'
  ];

  return (
    <>
      <Helmet>
        <title>CDP - Customer Data Platform | Bluecore</title>
        <meta name="description" content="Customer Data Platform - Phát hiện dịch chuyển giá trị khách hàng" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/portal')}
                >
                  ← Portal
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold">CDP</h1>
                    <p className="text-xs text-muted-foreground">Customer Data Platform</p>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-violet-600 border-violet-300">
                V1 Active
              </Badge>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Mission Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-background border p-8"
          >
            <div className="relative z-10">
              <Badge className="mb-4 bg-violet-500/20 text-violet-700 border-violet-300">
                Mission
              </Badge>
              <h2 className="text-2xl font-bold mb-4">
                Phát hiện, giải thích và định lượng các{' '}
                <span className="text-violet-600">dịch chuyển giá trị</span>
                {' '}trong tập khách hàng
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                CDP giúp doanh nghiệp ra quyết định về pricing, policy, growth và phân bổ nguồn lực — 
                không phải để quản lý quan hệ hay vận hành marketing.
              </p>
            </div>
            
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
          </motion.div>

          {/* Core Principles */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              Nguyên Lý Cốt Lõi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {corePrinciples.map((principle, index) => (
                <motion.div
                  key={principle.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-2">
                        <principle.icon className="w-5 h-5 text-violet-600" />
                      </div>
                      <CardTitle className="text-sm">{principle.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {principle.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Core Outputs */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-500" />
              3 Output Duy Nhất
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coreOutputs.map((output, index) => (
                <motion.div
                  key={output.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl ${output.bgColor} flex items-center justify-center mb-2`}>
                        <output.icon className={`w-6 h-6 ${output.color}`} />
                      </div>
                      <CardTitle className="text-base">{output.title}</CardTitle>
                      <CardDescription>{output.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {output.examples.map((example, i) => (
                          <div 
                            key={i}
                            className="text-xs text-muted-foreground flex items-start gap-2"
                          >
                            <ArrowRight className="w-3 h-3 mt-0.5 text-violet-500 flex-shrink-0" />
                            <span>{example}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Anti-Manifest */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-base text-destructive">CDP Cấm Tuyệt Đối</CardTitle>
                </div>
                <CardDescription>
                  CDP không phải CRM, không phải Marketing Automation, không phải Dashboard khách hàng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {forbiddenFeatures.map((feature) => (
                    <Badge 
                      key={feature}
                      variant="outline" 
                      className="text-destructive border-destructive/30 bg-background"
                    >
                      🚫 {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Core Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              Core Features (V1)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      feature.status === 'active' 
                        ? 'hover:shadow-lg hover:border-violet-300' 
                        : 'opacity-60'
                    }`}
                    onClick={() => feature.status === 'active' && feature.path && navigate(feature.path)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={`w-10 h-10 rounded-lg ${
                          feature.status === 'active' ? 'bg-violet-500' : 'bg-muted'
                        } flex items-center justify-center`}>
                          <feature.icon className={`w-5 h-5 ${
                            feature.status === 'active' ? 'text-white' : 'text-muted-foreground'
                          }`} />
                        </div>
                        {feature.status === 'active' ? (
                          <Badge className="bg-emerald-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Coming Soon</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base mt-3">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                      {feature.status === 'active' && (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto mt-2 text-violet-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(feature.path!);
                          }}
                        >
                          Open Feature <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
