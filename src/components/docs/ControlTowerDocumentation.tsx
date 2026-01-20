import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Bell,
  AlertTriangle,
  CheckSquare,
  Users,
  Settings,
  Store,
  BarChart3,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  path: string;
  features: {
    name: string;
    description: string;
    formula?: string;
    tips?: string[];
  }[];
  manifesto?: string[];
}

const controlTowerSections: DocSection[] = [
  {
    id: 'alerts',
    title: 'Alerts Center',
    icon: Bell,
    path: '/control-tower/alerts',
    description: 'Trung tâm cảnh báo thông minh - Phát hiện và xử lý vấn đề sớm.',
    features: [
      {
        name: 'Alert Structure',
        description: 'Mỗi alert bắt buộc phải có đủ 3 yếu tố: Impact Amount, Deadline, Owner.',
        tips: [
          'Mất bao nhiêu tiền?',
          'Nếu không xử lý, sẽ mất thêm bao nhiêu?',
          'Còn bao lâu để hành động?',
        ],
      },
      {
        name: 'Severity Levels',
        description: 'Critical (Red), Warning (Orange), Info (Blue).',
        tips: [
          'Critical: Cần xử lý trong 24h',
          'Warning: Xử lý trong 72h',
          'Info: Theo dõi',
        ],
      },
      {
        name: 'Alert Limit',
        description: 'Tối đa 5-7 alerts hiển thị tại mọi thời điểm.',
        tips: [
          'Nhiều alert hơn = vô nghĩa',
          'Chỉ hiển thị alert nguy hiểm nhất',
        ],
      },
      {
        name: 'Alert Actions',
        description: 'Acknowledge, Snooze, Resolve, Escalate.',
      },
    ],
    manifesto: [
      'Control Tower CHỈ QUAN TÂM ĐẾN "ĐIỀU GÌ SAI"',
      'Nếu không có vấn đề → Control Tower im lặng',
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks Management',
    icon: CheckSquare,
    path: '/control-tower/tasks',
    description: 'Chuyển đổi cảnh báo thành hành động cụ thể.',
    features: [
      {
        name: 'Task Creation',
        description: 'Tự động tạo task từ alert hoặc tạo thủ công.',
      },
      {
        name: 'Task Assignment',
        description: 'Gán task cho team member với deadline.',
        tips: [
          'Không owner = không task',
          'Không outcome = task chưa hoàn thành',
        ],
      },
      {
        name: 'Task Status',
        description: 'Open → In Progress → Resolved/Dismissed.',
      },
      {
        name: 'Task History',
        description: 'Lịch sử xử lý và outcome của từng task.',
      },
    ],
    manifesto: [
      'ALERT PHẢI CÓ CHỦ SỞ HỮU & KẾT QUẢ',
    ],
  },
  {
    id: 'kpi-rules',
    title: 'Intelligent Rules',
    icon: Zap,
    path: '/control-tower/kpi-rules',
    description: 'Thiết lập các quy tắc cảnh báo tự động cho KPI.',
    features: [
      {
        name: 'Threshold-based Rules',
        description: 'Cảnh báo khi KPI vượt/dưới ngưỡng định trước.',
        tips: [
          'Ví dụ: Cash < 30 days runway → Critical',
          'ROAS < 1.0 liên tục 3 ngày → Warning',
        ],
      },
      {
        name: 'Trend-based Rules',
        description: 'Cảnh báo khi KPI có xu hướng xấu liên tục.',
        tips: [
          'Margin giảm 3 ngày liên tiếp',
          'DSO tăng 5% so với tuần trước',
        ],
      },
      {
        name: 'Cross-Domain Rules',
        description: 'Quy tắc kết hợp nhiều domain: Revenue tăng + Cash giảm.',
      },
      {
        name: 'Rule Priority',
        description: 'Ưu tiên quy tắc nào chạy trước khi có conflict.',
      },
    ],
  },
  {
    id: 'stores',
    title: 'Store Health Map',
    icon: Store,
    path: '/control-tower/stores',
    description: 'Giám sát sức khỏe hệ thống cửa hàng vật lý và online.',
    features: [
      {
        name: 'Store Performance',
        description: 'Revenue, Traffic, Conversion Rate theo từng cửa hàng.',
      },
      {
        name: 'Health Score',
        description: 'Điểm sức khỏe tổng hợp từ nhiều chỉ số.',
        formula: 'Health Score = w1×Revenue + w2×Margin + w3×Inventory + w4×Customer',
      },
      {
        name: 'Store Comparison',
        description: 'So sánh hiệu suất giữa các cửa hàng.',
      },
      {
        name: 'Issue Detection',
        description: 'Phát hiện sớm vấn đề: Doanh số giảm, tồn kho tăng.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    path: '/control-tower/analytics',
    description: 'Phân tích dữ liệu vận hành chi tiết.',
    features: [
      {
        name: 'Alert Analytics',
        description: 'Thống kê alert: Số lượng, loại, thời gian xử lý.',
      },
      {
        name: 'Resolution Time',
        description: 'Thời gian trung bình từ alert đến resolution.',
        formula: 'MTTR = Sum(Resolution Time) / Number of Resolved Alerts',
      },
      {
        name: 'Team Performance',
        description: 'Hiệu suất xử lý của từng team member.',
      },
    ],
  },
  {
    id: 'team',
    title: 'Team Management',
    icon: Users,
    path: '/control-tower/team',
    description: 'Quản lý đội ngũ và phân quyền.',
    features: [
      {
        name: 'Team Members',
        description: 'Danh sách thành viên và vai trò.',
      },
      {
        name: 'Role-based Access',
        description: 'Phân quyền theo vai trò: Admin, Manager, Operator.',
      },
      {
        name: 'Escalation Chain',
        description: 'Chuỗi escalation khi alert không được xử lý đúng hạn.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    path: '/control-tower/settings',
    description: 'Cấu hình hệ thống Control Tower.',
    features: [
      {
        name: 'Notification Settings',
        description: 'Cấu hình kênh thông báo: Email, Slack, SMS.',
      },
      {
        name: 'Digest Settings',
        description: 'Cấu hình báo cáo tổng hợp hàng ngày/tuần.',
      },
      {
        name: 'Threshold Defaults',
        description: 'Ngưỡng mặc định cho các loại alert.',
      },
      {
        name: 'Integration Settings',
        description: 'Kết nối với FDP và MDP.',
      },
    ],
  },
];

interface ControlTowerDocumentationProps {
  searchQuery: string;
}

export function ControlTowerDocumentation({ searchQuery }: ControlTowerDocumentationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('alerts');

  const filteredSections = controlTowerSections.filter((section) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.features.some(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="space-y-4">
      {/* Control Tower Manifesto */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Control Tower Manifesto - Awareness before Analytics. Action before Reports.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>CONTROL TOWER KHÔNG PHẢI DASHBOARD</strong> - Tồn tại để báo động và hành động, không phải hiển thị KPI</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>MỖI ALERT PHẢI ĐAU – VÀ PHẢI CÓ GIÁ</strong> - Mất bao nhiêu? Mất thêm bao nhiêu? Còn bao lâu?</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>ÍT NHƯNG CHÍ MẠNG</strong> - Tối đa 5-7 alert tại mọi thời điểm, chỉ hiển thị alert nguy hiểm nhất</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>ÉP HÀNH ĐỘNG, KHÔNG ĐỀ XUẤT SUÔNG</strong> - Ai cần làm gì trong bao lâu</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>FINAL TEST</strong> - Nếu không khiến một việc được xử lý sớm hơn → Control Tower đã thất bại</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Note */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Nguyên tắc Real-time</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• <strong>Cash</strong>: Near real-time (cập nhật liên tục)</li>
                <li>• <strong>Marketing</strong>: Daily (cập nhật mỗi ngày)</li>
                <li>• <strong>Operations</strong>: Event-based (khi có sự kiện)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Real-time chỉ có ý nghĩa khi giảm thiệt hại, không phải để theo dõi cho vui.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      {filteredSections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSection === section.id;

        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg overflow-hidden bg-card"
          >
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Icon className="h-5 w-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {section.path}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t"
                >
                  <div className="p-4 space-y-4">
                    {section.manifesto && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">NGUYÊN TẮC</p>
                        {section.manifesto.map((item, i) => (
                          <p key={i} className="text-sm">{item}</p>
                        ))}
                      </div>
                    )}

                    {section.features.map((feature, idx) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-amber-500" />
                          {feature.name}
                        </h4>
                        <p className="text-sm text-muted-foreground pl-6">
                          {feature.description}
                        </p>
                        {feature.formula && (
                          <div className="ml-6 bg-muted/50 rounded-md p-2 font-mono text-xs">
                            {feature.formula.split('\n').map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                        )}
                        {feature.tips && (
                          <div className="ml-6 space-y-1">
                            {feature.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
