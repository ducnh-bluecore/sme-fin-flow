/**
 * VC Pitch Deck PDF - Vietnamese Version
 * 
 * 22-slide Series A presentation for Vietnamese VCs
 * Focus on Category Claim: Financial Decision Infrastructure
 * Structure: 7 Acts - Psychological sequence addressing investor risks
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Get base URL dynamically for font loading (ensures diacritics render correctly in PDF viewers)
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

// Register Noto Sans (supports Vietnamese) and embed into PDF
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    padding: 60,
    justifyContent: 'center',
    fontFamily: 'NotoSans',
  },
  slideNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: '#64748b',
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.2,
  },
  headlineAccent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#60a5fa',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.2,
  },
  headlineAmber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.2,
  },
  headlineEmerald: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34d399',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 1.2,
  },
  subheadline: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 1.6,
  },
  body: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 1.8,
    marginBottom: 12,
  },
  punchline: {
    fontSize: 14,
    color: '#60a5fa',
    // NOTE: avoid italic in react-pdf unless you register an italic font variant
    textAlign: 'center',
    marginTop: 24,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  diagramBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 20,
    marginVertical: 12,
  },
  diagramText: {
    fontSize: 11,
    color: '#e2e8f0',
    textAlign: 'center',
    marginVertical: 4,
  },
  arrow: {
    fontSize: 14,
    color: '#60a5fa',
    textAlign: 'center',
    marginVertical: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 6,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  gridBody: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 11,
    color: '#60a5fa',
    marginRight: 8,
  },
  listText: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 1.5,
  },
  highlight: {
    backgroundColor: '#1e3a5f',
    padding: 14,
    borderRadius: 8,
    marginVertical: 12,
  },
  highlightText: {
    fontSize: 13,
    color: '#93c5fd',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    fontSize: 9,
    color: '#475569',
  },
  tag: {
    fontSize: 10,
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    color: '#34d399',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  architectureLayer: {
    backgroundColor: '#1e293b',
    borderRadius: 4,
    padding: 10,
    marginVertical: 3,
  },
  architectureText: {
    fontSize: 10,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  architectureSub: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
});

const TOTAL_SLIDES = 22;

// ACT 1 — MỞ CATEGORY
const Slide01 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Quyết định Tài chính Vẫn Chạy</Text>
      <Text style={styles.headlineAmber}>Trên Hệ thống Chậm trễ.</Text>
      <Text style={styles.subheadline}>
        Thương mại giờ di chuyển theo thời gian thực.{'\n'}
        Sự thật tài chính vẫn đến muộn hàng tuần.
      </Text>
      <View style={styles.gridContainer}>
        {['CAC thay đổi hàng ngày', 'Margin bị nén tức thì', 'Rủi ro tồn kho cộng dồn', 'Rủi ro tiền mặt leo thang'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#f87171', marginTop: 16 }}>
        Độ trễ quyết định đang trở thành rủi ro sống còn.
      </Text>
    </View>
    <Text style={styles.slideNumber}>1 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide02 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Hạ tầng dữ liệu đã trở thành tiêu chuẩn.</Text>
      <Text style={styles.headlineAccent}>Financial Awareness sẽ là hạ tầng mặc định tiếp theo.</Text>
      <Text style={{ ...styles.body, textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
        Dữ liệu kể lại quá khứ.{'\n'}
        Financial Awareness cho biết bạn có đang an toàn — ngay lúc này.
      </Text>
      <View style={styles.highlight}>
        <Text style={{ ...styles.highlightText, color: '#94a3b8' }}>Không phải công ty nhiều dữ liệu sẽ chiến thắng.</Text>
        <Text style={{ ...styles.highlightText, color: '#fbbf24', fontWeight: 'bold', marginTop: 4 }}>Mà là công ty nhận thức sớm nhất.</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>2 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide03 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ ...styles.body, fontSize: 18, color: '#94a3b8', textAlign: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>Hệ thống Ghi nhận</Text> ghi lại quá khứ.
        </Text>
        <Text style={{ ...styles.body, fontSize: 18, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>Hệ thống Thông minh</Text> giải thích quá khứ.
        </Text>
        <Text style={{ ...styles.body, fontSize: 18, color: '#ffffff', textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#60a5fa' }}>Hệ thống Nhận thức</Text> quyết định điều gì xảy ra tiếp theo.
        </Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontSize: 16, marginTop: 16 }}>
        Bluecore đang xây dựng <Text style={{ color: '#60a5fa', fontWeight: 'bold' }}>Tầng Nhận thức.</Text>
      </Text>
      <View style={{ ...styles.highlight, marginTop: 24 }}>
        <Text style={{ ...styles.highlightText, color: '#64748b' }}>Vận hành không có nhận thức tài chính</Text>
        <Text style={{ ...styles.highlightText, color: '#fbbf24', fontWeight: 'bold', marginTop: 4 }}>sẽ sớm cảm thấy rủi ro như vận hành không có kế toán.</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>3 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 4 — INEVITABILITY
const Slide04 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Nhận thức Tài chính</Text>
      <Text style={styles.headlineAmber}>Không Còn Là Tùy chọn.</Text>
      <Text style={{ ...styles.body, textAlign: 'center', marginBottom: 16 }}>Mọi lực lượng cấu trúc trong thương mại đang nén thời gian quyết định:</Text>
      <View style={{ marginVertical: 12 }}>
        {[
          'Nén margin là cấu trúc, không phải chu kỳ',
          'Biến động CAC phá hủy độ tin cậy dự báo',
          'Doanh thu đa kênh phân mảnh sự thật tài chính',
          'Thanh toán real-time tăng tốc rủi ro tiền mặt',
          'Operators di chuyển nhanh hơn finance có thể đóng sổ'
        ].map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bullet}>→</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.highlight}>
        <Text style={styles.highlightText}>Thị trường không đòi hỏi báo cáo tốt hơn.</Text>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', marginTop: 4 }}>Nó đòi hỏi nhận thức tài chính thời gian thực.</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>4 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 5 — Define Category
const Slide05 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.tag}>Giới thiệu</Text>
      <Text style={styles.headline}>Cơ sở Hạ tầng</Text>
      <Text style={styles.headlineAccent}>Quyết định Tài chính.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>thống nhất sự thật tài chính</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>mô hình hóa rủi ro vận hành</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>phát hiện rủi ro thời gian thực</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>hướng dẫn hành động lãnh đạo</Text></View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center' }}>Không phải dashboards. Không phải analytics. Cơ sở hạ tầng.</Text>
    </View>
    <Text style={styles.slideNumber}>5 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 6 — ARCHITECTURE MOAT
const Slide06 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Đây Không Phải Phần mềm.</Text>
      <Text style={styles.headlineAccent}>Đây Là Hạ tầng Tài chính.</Text>
      <View style={{ marginVertical: 12 }}>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Tín hiệu Tài chính Phân mảnh</Text>
          <Text style={styles.architectureSub}>(POS / Marketplaces / Payments / ERP)</Text>
        </View>
        <Text style={styles.arrow}>↓ chuẩn hóa</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Tầng Ngữ nghĩa Tài chính</Text>
          <Text style={styles.architectureSub}>(một ngôn ngữ của margin, cash, liability)</Text>
        </View>
        <Text style={styles.arrow}>↓ đối soát</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Truth Engine</Text>
          <Text style={styles.architectureSub}>(xác minh xuyên kênh)</Text>
        </View>
        <Text style={styles.arrow}>↓ tính toán</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Decision Dataset</Text>
          <Text style={styles.architectureSub}>(patterns trích xuất từ vận hành)</Text>
        </View>
        <Text style={styles.arrow}>↓ kích hoạt</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Tầng Nhận thức Điều hành</Text>
          <Text style={styles.architectureSub}>(tín hiệu sống còn thời gian thực)</Text>
        </View>
      </View>
      <Text style={styles.punchline}>Hầu hết công ty xây dashboards.{'\n'}Chúng tôi xây tầng sự thật tài chính mà những dashboards đó phụ thuộc vào.</Text>
    </View>
    <Text style={styles.slideNumber}>6 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 7 — DECISION DATASET
const Slide07 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Moat</Text>
      <Text style={styles.headlineEmerald}>Cộng hưởng.</Text>
      <Text style={{ ...styles.body, textAlign: 'center' }}>Mỗi quyết định làm mạnh thêm hệ thống.</Text>
      <View style={styles.gridContainer}>
        {[
          'Ngôn ngữ tài chính được chuẩn hóa',
          'Patterns quyết định được cấu trúc',
          'Chữ ký rủi ro có thể dự đoán',
          'Phản hồi vận hành đo lường được'
        ].map((item, i) => (
          <View key={i} style={{ ...styles.gridItem, backgroundColor: '#064e3b' }}>
            <Text style={{ ...styles.gridBody, color: '#6ee7b7' }}>✓ {item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Decision dataset độc quyền:</Text>
        <Text style={{ ...styles.diagramText, color: '#34d399' }}>phát hiện gì → quyết định gì → kết quả gì</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontWeight: 'bold' }}>Phần mềm mở rộng. Decision intelligence cộng hưởng.</Text>
    </View>
    <Text style={styles.slideNumber}>7 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 8 — Why Impossible Before
const Slide08 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Chỉ Bây giờ Cơ sở Hạ tầng Quyết định</Text>
      <Text style={styles.headlineEmerald}>Mới Khả thi về Kỹ thuật.</Text>
      <View style={styles.gridContainer}>
        {['Hệ sinh thái commerce API-first', 'Số hóa thanh toán', 'Warehouse trưởng thành', 'Data pipelines thời gian thực'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Tín hiệu tài chính cuối cùng đã có thể kết nối.</Text>
    </View>
    <Text style={styles.slideNumber}>8 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 9 — Why Mandatory
const Slide09 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Tốc độ Quyết định Đang Trở thành</Text>
      <Text style={styles.headlineAccent}>Lợi thế Cạnh tranh.</Text>
      <View style={{ marginVertical: 16 }}>
        <Text style={styles.body}>• Margin bị nén.</Text>
        <Text style={styles.body}>• Vốn đắt đỏ.</Text>
        <Text style={styles.body}>• Biến động vận hành đang tăng.</Text>
      </View>
      <Text style={styles.punchline}>Sắp tới, vận hành không có nhận thức tài chính thời gian thực{'\n'}sẽ cảm thấy như vận hành không có kế toán.</Text>
    </View>
    <Text style={styles.slideNumber}>9 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 10 — Product One Sentence
const Slide10 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Một Sự thật Tài chính Duy nhất —</Text>
      <Text style={styles.headlineAccent}>Được Tin tưởng Thời gian Thực.</Text>
      <Text style={styles.subheadline}>Khi lãnh đạo tin tưởng hệ thống, nó trở thành cơ sở hạ tầng vận hành.</Text>
      <View style={styles.gridContainer}>
        {[{ role: 'CFO', focus: 'Rủi ro Tiền mặt' }, { role: 'COO', focus: 'Rò rỉ Vận hành' }, { role: 'CEO', focus: 'Rủi ro Margin' }].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={{ ...styles.gridTitle, color: '#60a5fa' }}>{item.role}</Text>
            <Text style={styles.gridBody}>{item.focus}</Text>
          </View>
        ))}
      </View>
    </View>
    <Text style={styles.slideNumber}>10 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 11 — VELOCITY
const Slide11 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Khi Nhận thức Tài chính Trở thành</Text>
      <Text style={styles.headlineEmerald}>Sống còn.</Text>
      <View style={styles.gridContainer}>
        {[
          { label: 'Retention', value: '95%+' },
          { label: 'Sử dụng', value: 'Hàng ngày' },
          { label: 'Phụ thuộc', value: 'Điều hành' },
          { label: 'Mở rộng', value: 'Liên tục' }
        ].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.body, textAlign: 'center' }}>CEOs không mở Bluecore hàng tháng. Họ mở hàng ngày.</Text>
      <Text style={styles.punchline}>Công ty không thay thế hệ thống họ tin tưởng để nói sự thật.</Text>
    </View>
    <Text style={styles.slideNumber}>11 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 12 — Architecture Advantage
const Slide12 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Sự thật Tài chính Là Bài toán</Text>
      <Text style={styles.headlineAmber}>Kiến trúc.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Nguồn</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Chuẩn hóa ngữ nghĩa</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Đối soát</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Decision dataset</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Cảnh báo</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', color: '#94a3b8' }}>Đây không phải phần mềm lắp ráp. Đây là cơ sở hạ tầng được thiết kế.</Text>
    </View>
    <Text style={styles.slideNumber}>12 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 13 — Switching Cost
const Slide13 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Doanh nghiệp Không Thay thế Hệ thống</Text>
      <Text style={styles.headlineAccent}>Họ Tin tưởng Để Nói Sự thật.</Text>
      <View style={styles.highlight}>
        <Text style={{ ...styles.highlightText, fontSize: 16 }}>Trust cộng hưởng.</Text>
        <Text style={{ ...styles.highlightText, marginTop: 8 }}>Khi đã nhúng vào workflow quyết định,{'\n'}rủi ro thay thế giảm đáng kể.</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>13 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 14 — Cross-Border
const Slide14 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Đã Được Chứng minh Ngoài</Text>
      <Text style={styles.headlineAccent}>Thị trường Gốc.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.metricLabel}>Xây dựng tại</Text>
          <Text style={{ ...styles.gridTitle, fontSize: 18 }}>Việt Nam</Text>
        </View>
        <View style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
          <Text style={styles.metricLabel}>Triển khai tại</Text>
          <Text style={{ ...styles.gridTitle, fontSize: 18 }}>Thái Lan</Text>
          <Text style={{ ...styles.gridBody, marginTop: 4 }}>Nhà bán lẻ hàng đầu</Text>
          <Text style={{ ...styles.metricValue, fontSize: 14, marginTop: 4 }}>~$3K MRR</Text>
        </View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', color: '#94a3b8' }}>Thái Lan bây giờ là beachhead thứ hai đã được xác thực.</Text>
    </View>
    <Text style={styles.slideNumber}>14 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 15 — Architecture Travels
const Slide15 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Độ Phức tạp Tài chính Tương tự về Cấu trúc</Text>
      <Text style={styles.headlineAccent}>Khắp Đông Nam Á.</Text>
      <View style={styles.gridContainer}>
        {['Phân mảnh đa kênh', 'Áp lực tiền mặt', 'Rủi ro tồn kho', 'Biến động marketing'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Bluecore mở rộng với localization tối thiểu.</Text>
    </View>
    <Text style={styles.slideNumber}>15 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 16 — Initial Wedge
const Slide16 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Chúng tôi Bắt đầu với</Text>
      <Text style={styles.headlineAccent}>Commerce Operators Nhạy cảm Margin.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Retailers & ecommerce mid-market</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Doanh thu: $2M–$50M</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Độ phức tạp vận hành cao</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Kinh tế nhạy cảm quyết định</Text></View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', color: '#94a3b8' }}>Những công ty này cảm nhận độ trễ quyết định đầu tiên.</Text>
    </View>
    <Text style={styles.slideNumber}>16 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 17 — SEA Market
const Slide17 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Wedge $1B+</Text>
      <Text style={styles.headlineAccent}>Khắp Đông Nam Á.</Text>
      <View style={styles.gridContainer}>
        {[{ country: 'Việt Nam', range: '$150–250M' }, { country: 'Thái Lan', range: '$350–500M' }, { country: 'Indonesia', range: '$900M–1.6B' }].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.metricLabel}>{item.country}</Text>
            <Text style={styles.gridTitle}>{item.range}</Text>
          </View>
        ))}
      </View>
      <View style={{ ...styles.highlight, marginTop: 16 }}>
        <Text style={{ ...styles.highlightText, color: '#34d399' }}>Wedge kết hợp: $1.4B–$2.3B</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>17 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 18 — Expansion Unlocks
const Slide18 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Expansion Mở khóa</Text>
      <Text style={styles.headlineAccent}>Category Nhiều Tỷ đô.</Text>
      <Text style={styles.subheadline}>Sau commerce: Consumer brands, Distribution, Chuỗi nhà thuốc, F&B groups</Text>
      <Text style={styles.body}>Decision infrastructure trở nên horizontal.</Text>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Tiềm năng category vượt $5B riêng Đông Nam Á.</Text>
    </View>
    <Text style={styles.slideNumber}>18 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 19 — Regional Expansion
const Slide19 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Xây dựng tại Việt Nam.</Text>
      <Text style={styles.headlineAccent}>Mở rộng Khắp Đông Nam Á.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Việt Nam → Thị trường build chính</Text>
        <Text style={{ ...styles.diagramText, color: '#60a5fa' }}>Thái Lan → Beachhead thứ hai (doanh thu live)</Text>
        <Text style={{ ...styles.diagramText, color: '#34d399' }}>Indonesia → Expansion quy mô category</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', color: '#94a3b8' }}>Expansion có chủ đích — không phải cơ hội.</Text>
    </View>
    <Text style={styles.slideNumber}>19 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 20 — Why Bluecore Wins
const Slide20 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Xây dựng Financial Truth Layer</Text>
      <Text style={styles.headlineAccent}>Trước khi Category Tồn tại.</Text>
      <View style={styles.gridContainer}>
        {['3+ năm warehouse maturity', '~99.8% data accuracy', 'Deep financial semantics'].map((item, i) => (
          <View key={i} style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
            <Text style={{ ...styles.gridBody, color: '#93c5fd' }}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.body}>Hầu hết công ty bắt đầu với dashboards.</Text>
      <Text style={{ ...styles.body, color: '#ffffff', fontWeight: 'bold' }}>Chúng tôi bắt đầu với sự thật.</Text>
    </View>
    <Text style={styles.slideNumber}>20 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 21 — Inevitability Vision
const Slide21 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>ERP Đã Trở thành Bắt buộc.</Text>
      <Text style={styles.headlineAccent}>Decision Infrastructure Cũng Sẽ Vậy.</Text>
      <Text style={styles.subheadline}>
        Sắp tới, doanh nghiệp sẽ không tranh luận{'\n'}
        liệu họ có cần hệ thống quyết định tài chính.{'\n'}
        Chỉ là tin tưởng hệ thống nào.
      </Text>
    </View>
    <Text style={styles.slideNumber}>21 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 22 — Closing
const Slide22 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <View style={{ ...styles.highlight, marginTop: 24, padding: 32 }}>
        <Text style={{ ...styles.highlightText, fontSize: 18 }}>Chúng tôi Không Xây dựng Phần mềm.</Text>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', fontSize: 22, marginTop: 12 }}>
          Chúng tôi Xây dựng Hệ thống{'\n'}Doanh nghiệp Dựa vào Để Tồn tại.
        </Text>
      </View>
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ ...styles.headlineAccent, fontSize: 20 }}>BLUECORE</Text>
        <Text style={{ ...styles.body, color: '#64748b', fontSize: 10 }}>Cơ sở Hạ tầng Quyết định Tài chính</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>22 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const VCPitchDeckPDF_VI: React.FC = () => (
  <Document>
    <Slide01 />
    <Slide02 />
    <Slide03 />
    <Slide04 />
    <Slide05 />
    <Slide06 />
    <Slide07 />
    <Slide08 />
    <Slide09 />
    <Slide10 />
    <Slide11 />
    <Slide12 />
    <Slide13 />
    <Slide14 />
    <Slide15 />
    <Slide16 />
    <Slide17 />
    <Slide18 />
    <Slide19 />
    <Slide20 />
    <Slide21 />
    <Slide22 />
  </Document>
);

export default VCPitchDeckPDF_VI;
