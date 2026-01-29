/**
 * FDP Sales Deck PDF Generator
 * 
 * Generates a professional PDF sales deck for the Financial Data Platform
 * using @react-pdf/renderer
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register Noto Sans font (supports Vietnamese characters)
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 700 },
  ],
});

// Brand colors
const colors = {
  primary: '#3b82f6',      // Blue
  primaryDark: '#1e40af',  // Dark blue
  accent: '#10b981',       // Green
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  text: '#1f2937',         // Gray 800
  textLight: '#6b7280',    // Gray 500
  background: '#f8fafc',   // Slate 50
  white: '#ffffff',
  black: '#000000',
};

// Styles - Using Noto Sans font (supports Vietnamese)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSans',
    backgroundColor: colors.white,
  },
  coverPage: {
    padding: 60,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 1.5,
  },
  coverBadge: {
    marginTop: 40,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  coverBadgeText: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.white,
  },
  
  // Section styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primaryDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  
  // Manifesto styles
  manifestoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  manifestoItem: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeft: `3px solid ${colors.primary}`,
  },
  manifestoNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  manifestoTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 4,
  },
  manifestoDesc: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  
  // Capability styles
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  capabilityCard: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  capabilityIcon: {
    fontSize: 24,
    marginBottom: 12,
  },
  capabilityTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 8,
  },
  capabilityDesc: {
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  capabilityFeatures: {
    marginTop: 12,
  },
  capabilityFeature: {
    fontSize: 9,
    color: colors.text,
    marginBottom: 4,
    paddingLeft: 12,
  },
  
  // Feature list styles
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  featureColumn: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
  },
  featureColumnTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.primaryDark,
    marginBottom: 12,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: 8,
  },
  featureItem: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 8,
    paddingLeft: 8,
  },
  
  // Decision flow styles
  decisionFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  decisionStep: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  decisionStepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionStepNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.white,
  },
  decisionStepTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text,
    textAlign: 'center',
  },
  decisionStepDesc: {
    fontSize: 9,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  decisionArrow: {
    fontSize: 18,
    color: colors.primary,
    marginHorizontal: 8,
  },
  
  // Use case styles
  useCaseBox: {
    backgroundColor: colors.primaryDark,
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  useCaseTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.white,
    marginBottom: 8,
  },
  useCaseValue: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
  },
  useCaseDesc: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
  },
  useCaseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  useCaseMetric: {
    alignItems: 'center',
  },
  useCaseMetricValue: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.white,
  },
  useCaseMetricLabel: {
    fontSize: 9,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: colors.textLight,
  },
  pageNumber: {
    fontSize: 10,
    color: colors.textLight,
  },
});

// FDP Manifesto content
const manifestoItems = [
  { number: '#1', title: 'KHÔNG PHẢI PHẦN MỀM KẾ TOÁN', desc: 'Phục vụ CEO/CFO điều hành doanh nghiệp, không phải nộp báo cáo thuế.' },
  { number: '#2', title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.' },
  { number: '#3', title: 'TRUTH > FLEXIBILITY', desc: 'Không cho tự định nghĩa metric tùy tiện, không "chọn số đẹp".' },
  { number: '#4', title: 'REAL CASH', desc: 'Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa.' },
  { number: '#5', title: 'REVENUE ↔ COST', desc: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".' },
  { number: '#6', title: 'UNIT ECONOMICS → ACTION', desc: 'SKU lỗ + khóa cash + tăng risk → phải nói STOP.' },
  { number: '#7', title: "TODAY'S DECISION", desc: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.' },
  { number: '#8', title: 'SURFACE PROBLEMS', desc: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.' },
  { number: '#9', title: 'FEED CONTROL TOWER', desc: 'FDP là nguồn sự thật, Control Tower hành động dựa trên đó.' },
  { number: '#10', title: 'FINAL TEST', desc: 'Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại.' },
];

// Core capabilities
const coreCapabilities = [
  {
    icon: '📊',
    title: 'Single Source of Truth Dashboard',
    desc: 'Một màn hình duy nhất cho tất cả KPIs quan trọng',
    features: ['Net Revenue, Gross Margin, Contribution Margin', 'Cash Position realtime', 'Cash Runway calculation', 'Key alerts & anomalies'],
  },
  {
    icon: '💰',
    title: 'Real Cash Tracking',
    desc: 'Phân loại cash theo trạng thái thực tế',
    features: ['Cash đã về tài khoản', 'Cash sẽ về (AR pending)', 'Cash có nguy cơ không về', 'Cash đang bị khóa (Inventory, Ads, Ops)'],
  },
  {
    icon: '📦',
    title: 'Unit Economics Engine',
    desc: 'P&L đến từng SKU, từng order',
    features: ['Revenue per SKU/Order', 'COGS + Variable costs per unit', 'Contribution margin per unit', 'Identify loss-making SKUs'],
  },
  {
    icon: '🔮',
    title: 'Cash Forecast & Runway',
    desc: 'Dự báo dòng tiền và cảnh báo sớm',
    features: ['30/60/90 days forecast', 'Cash runway calculation', 'Burn rate analysis', 'What-if scenarios'],
  },
];

// Decision flow steps
const decisionSteps = [
  { number: '1', title: 'Phát hiện', desc: 'Alert từ hệ thống' },
  { number: '2', title: 'Phân tích', desc: 'Evidence & Context' },
  { number: '3', title: 'Quyết định', desc: 'Accept / Reject' },
  { number: '4', title: 'Đo lường', desc: 'Before vs After' },
];

const FDPSalesDeckPDF: React.FC = () => {
  return (
    <Document title="Bluecore FDP - Sales Deck" author="Bluecore">
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Bluecore FDP</Text>
        <Text style={styles.coverSubtitle}>
          Nền tảng tài chính cho CEO & CFO điều hành — Single Source of Truth cho mọi quyết định kinh doanh
        </Text>
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>FINANCIAL DATA PLATFORM</Text>
        </View>
      </Page>

      {/* Manifesto Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>FDP Manifesto</Text>
        <Text style={styles.sectionSubtitle}>
          10 nguyên tắc bất biến của Financial Data Platform — đây là những cam kết mà Bluecore không bao giờ thỏa hiệp.
        </Text>
        
        <View style={styles.manifestoContainer}>
          {manifestoItems.map((item, index) => (
            <View key={index} style={styles.manifestoItem}>
              <Text style={styles.manifestoNumber}>{item.number}</Text>
              <Text style={styles.manifestoTitle}>{item.title}</Text>
              <Text style={styles.manifestoDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>2</Text>
        </View>
      </Page>

      {/* Core Capabilities Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Core Capabilities</Text>
        <Text style={styles.sectionSubtitle}>
          Những năng lực cốt lõi giúp CEO/CFO điều hành doanh nghiệp hiệu quả hơn.
        </Text>
        
        <View style={styles.capabilityGrid}>
          {coreCapabilities.map((cap, index) => (
            <View key={index} style={styles.capabilityCard}>
              <Text style={styles.capabilityIcon}>{cap.icon}</Text>
              <Text style={styles.capabilityTitle}>{cap.title}</Text>
              <Text style={styles.capabilityDesc}>{cap.desc}</Text>
              <View style={styles.capabilityFeatures}>
                {cap.features.map((feature, fIndex) => (
                  <Text key={fIndex} style={styles.capabilityFeature}>• {feature}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>3</Text>
        </View>
      </Page>

      {/* Feature Details Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Chức năng Chi tiết</Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>📈 Báo cáo Tài chính</Text>
            <Text style={styles.featureItem}>• P&L Report theo tháng/quý/năm</Text>
            <Text style={styles.featureItem}>• Gross Margin & Operating Margin</Text>
            <Text style={styles.featureItem}>• EBITDA breakdown</Text>
            <Text style={styles.featureItem}>• Revenue by Channel & Category</Text>
            <Text style={styles.featureItem}>• Cost structure analysis</Text>
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>💵 Vốn lưu động & CCC</Text>
            <Text style={styles.featureItem}>• DSO - Days Sales Outstanding</Text>
            <Text style={styles.featureItem}>• DIO - Days Inventory Outstanding</Text>
            <Text style={styles.featureItem}>• DPO - Days Payable Outstanding</Text>
            <Text style={styles.featureItem}>• Cash Conversion Cycle</Text>
            <Text style={styles.featureItem}>• Working Capital optimization</Text>
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>🏦 AR/AP Management</Text>
            <Text style={styles.featureItem}>• AR Aging Analysis</Text>
            <Text style={styles.featureItem}>• Overdue invoice tracking</Text>
            <Text style={styles.featureItem}>• Collection forecasting</Text>
            <Text style={styles.featureItem}>• AP scheduling & optimization</Text>
            <Text style={styles.featureItem}>• Cash gap analysis</Text>
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>🎯 Decision Support</Text>
            <Text style={styles.featureItem}>• ROI Analysis calculator</Text>
            <Text style={styles.featureItem}>• NPV/IRR calculations</Text>
            <Text style={styles.featureItem}>• Sensitivity analysis</Text>
            <Text style={styles.featureItem}>• What-if scenario planning</Text>
            <Text style={styles.featureItem}>• Investment decision framework</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>4</Text>
        </View>
      </Page>

      {/* Decision Flow Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Quy trình Quyết định</Text>
        <Text style={styles.sectionSubtitle}>
          Từ phát hiện vấn đề đến đo lường kết quả — mọi quyết định đều được tracking.
        </Text>
        
        <View style={styles.decisionFlow}>
          {decisionSteps.map((step, index) => (
            <React.Fragment key={index}>
              <View style={styles.decisionStep}>
                <View style={styles.decisionStepCircle}>
                  <Text style={styles.decisionStepNumber}>{step.number}</Text>
                </View>
                <Text style={styles.decisionStepTitle}>{step.title}</Text>
                <Text style={styles.decisionStepDesc}>{step.desc}</Text>
              </View>
              {index < decisionSteps.length - 1 && (
                <Text style={styles.decisionArrow}>→</Text>
              )}
            </React.Fragment>
          ))}
        </View>
        
        {/* Use Case Example */}
        <View style={styles.useCaseBox}>
          <Text style={styles.useCaseTitle}>📌 Ví dụ: AR quá hạn cần thu hồi</Text>
          <Text style={styles.useCaseValue}>+3.4 Tỷ VND</Text>
          <Text style={styles.useCaseDesc}>
            105 khách hàng có nợ quá hạn. Nếu thu hồi thành công trong 7-14 ngày, 
            Cash Runway sẽ tăng thêm 0.9 tháng.
          </Text>
          
          <View style={styles.useCaseMetrics}>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>105</Text>
              <Text style={styles.useCaseMetricLabel}>Khách hàng</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>14 ngày</Text>
              <Text style={styles.useCaseMetricLabel}>Deadline</Text>
            </View>
            <View style={styles.useCaseMetric}>
              <Text style={styles.useCaseMetricValue}>+0.9 tháng</Text>
              <Text style={styles.useCaseMetricLabel}>Runway Impact</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>5</Text>
        </View>
      </Page>

      {/* Outcome Tracking Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Đo lường Kết quả Tự động</Text>
        <Text style={styles.sectionSubtitle}>
          So sánh Before vs After — tracking outcome của mọi quyết định để học và cải thiện theo thời gian.
        </Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>📊 Before/After Comparison</Text>
            <Text style={styles.featureItem}>• Tự động capture metrics trước quyết định</Text>
            <Text style={styles.featureItem}>• So sánh với kết quả thực tế sau action</Text>
            <Text style={styles.featureItem}>• Tính toán variance và accuracy</Text>
            <Text style={styles.featureItem}>• Gợi ý verdict dựa trên data</Text>
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>🎯 ROI Calculation</Text>
            <Text style={styles.featureItem}>• Đo lường impact tài chính thực tế</Text>
            <Text style={styles.featureItem}>• So sánh với dự đoán ban đầu</Text>
            <Text style={styles.featureItem}>• Cost vs Benefit analysis</Text>
            <Text style={styles.featureItem}>• Cumulative ROI tracking</Text>
          </View>
        </View>
        
        <View style={styles.featureRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>📚 Learning Feedback</Text>
            <Text style={styles.featureItem}>• Ghi nhận bài học từ mỗi quyết định</Text>
            <Text style={styles.featureItem}>• Build pattern recognition</Text>
            <Text style={styles.featureItem}>• Cải thiện độ chính xác theo thời gian</Text>
            <Text style={styles.featureItem}>• Knowledge base for team</Text>
          </View>
          
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>📈 Quality Score (GQS)</Text>
            <Text style={styles.featureItem}>• Governance Quality Score 0-100</Text>
            <Text style={styles.featureItem}>• Track decision quality over time</Text>
            <Text style={styles.featureItem}>• Identify improvement areas</Text>
            <Text style={styles.featureItem}>• Benchmark across teams</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Bluecore FDP - Financial Data Platform</Text>
          <Text style={styles.pageNumber}>6</Text>
        </View>
      </Page>

      {/* Contact Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Bắt đầu với FDP</Text>
        <Text style={styles.coverSubtitle}>
          Liên hệ với chúng tôi để được demo trực tiếp và tư vấn giải pháp phù hợp với doanh nghiệp của bạn.
        </Text>
        <View style={{ marginTop: 40 }}>
          <Text style={{ ...styles.coverSubtitle, fontSize: 14, marginBottom: 8 }}>
            🌐 bluecore.vn
          </Text>
          <Text style={{ ...styles.coverSubtitle, fontSize: 14, marginBottom: 8 }}>
            📧 contact@bluecore.vn
          </Text>
          <Text style={{ ...styles.coverSubtitle, fontSize: 14 }}>
            📞 1800 xxxx xxx
          </Text>
        </View>
        <View style={{ ...styles.coverBadge, marginTop: 60 }}>
          <Text style={styles.coverBadgeText}>TRUTH {'>'} FLEXIBILITY</Text>
        </View>
      </Page>
    </Document>
  );
};

export default FDPSalesDeckPDF;
