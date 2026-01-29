/**
 * Data Warehouse Sales Deck PDF Component
 * 
 * Professional PDF sales deck for the Data Warehouse module
 * Following the 'Single Source of Truth' philosophy
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

// Helper to get base URL for fonts
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Register Noto Sans font with Vietnamese support
Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`,
      fontWeight: 700,
    },
  ],
});

// Color palette
const colors = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  secondary: '#475569',
  accent: '#0891b2',
  accentLight: '#22d3d8',
  background: '#ffffff',
  backgroundAlt: '#f8fafc',
  backgroundDark: '#0f172a',
  text: '#1e293b',
  textLight: '#64748b',
  textWhite: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#e2e8f0',
};

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  pageDark: {
    flexDirection: 'column',
    backgroundColor: colors.backgroundDark,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  pageAlt: {
    flexDirection: 'column',
    backgroundColor: colors.backgroundAlt,
    fontFamily: 'NotoSans',
    padding: 0,
  },
  container: {
    padding: 40,
    flex: 1,
  },
  // Cover styles
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    position: 'relative',
  },
  coverBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  coverBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
  },
  coverTitle: {
    fontSize: 42,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 18,
    color: colors.accentLight,
    textAlign: 'center',
    marginBottom: 30,
  },
  coverTagline: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.textWhite,
    textAlign: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    paddingTop: 20,
    marginTop: 20,
  },
  // Section styles
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitleWhite: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 24,
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
  sectionSubtitleWhite: {
    fontSize: 14,
    color: colors.accentLight,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 400,
    alignSelf: 'center',
  },
  // Card styles
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  cardTitleWhite: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textWhite,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  cardTextWhite: {
    fontSize: 11,
    color: colors.accentLight,
    lineHeight: 1.5,
  },
  // Grid styles
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col2: {
    flex: 1,
    width: '48%',
  },
  col3: {
    flex: 1,
    width: '31%',
  },
  // Pill styles
  pillContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  pill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: 700,
  },
  // Quote styles
  quoteBox: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
  },
  quoteText: {
    fontSize: 14,
    color: colors.textWhite,
    textAlign: 'center',
    fontWeight: 700,
  },
  // Story block
  storyBlock: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  storyBlockDark: {
    backgroundColor: 'rgba(34, 211, 216, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentLight,
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 8,
  },
  storyTitleWhite: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.accentLight,
    marginBottom: 8,
  },
  storyText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.6,
  },
  storyTextWhite: {
    fontSize: 11,
    color: colors.textWhite,
    lineHeight: 1.6,
  },
  // Comparison table
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  comparisonCell: {
    flex: 1,
    fontSize: 10,
    color: colors.text,
    paddingHorizontal: 8,
  },
  comparisonCellWhite: {
    flex: 1,
    fontSize: 10,
    color: colors.textWhite,
    paddingHorizontal: 8,
  },
  comparisonHeader: {
    fontWeight: 700,
    fontSize: 11,
  },
  // Manifesto styles
  manifestoItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  manifestoNumber: {
    width: 24,
    height: 24,
    backgroundColor: colors.accent,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  manifestoNumberText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: 700,
  },
  manifestoText: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.5,
  },
  manifestoTextWhite: {
    flex: 1,
    fontSize: 11,
    color: colors.textWhite,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
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
  footerTextWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  pageNumber: {
    fontSize: 9,
    color: colors.textLight,
  },
  pageNumberWhite: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  // Decorative elements
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  // Mockup styles
  mockupContainer: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  mockupHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  mockupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockupContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    padding: 12,
  },
  mockupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mockupLabel: {
    fontSize: 9,
    color: colors.textLight,
  },
  mockupValue: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.accentLight,
  },
});

// Content data
const threePillars = [
  { icon: '[=]', title: 'SINGLE SOURCE', desc: 'Mot nguon du lieu duy nhat' },
  { icon: '[*]', title: 'REAL-TIME SYNC', desc: 'Dong bo lien tuc' },
  { icon: '[>]', title: 'QUERY READY', desc: 'San sang truy van' },
];

const dataChallenges = [
  {
    title: 'Du lieu nam rai rac',
    problem: 'Shopee mot noi, Lazada mot noi, ke toan mot noi',
    cost: 'Mat 2-3 gio moi ngay de tong hop thu cong',
    icon: '[!]',
  },
  {
    title: 'Khong biet so nao dung',
    problem: 'Moi phong ban bao cao mot so khac nhau',
    cost: 'Quyet dinh sai vi thong tin khong nhat quan',
    icon: '[?]',
  },
  {
    title: 'Du lieu cu, khong cap nhat',
    problem: 'Bao cao hom nay nhung so cua tuan truoc',
    cost: 'Bo lo co hoi vi phan ung cham',
    icon: '[X]',
  },
  {
    title: 'Khong truy van duoc',
    problem: 'Muon xem chi tiet phai nho IT lam bao cao',
    cost: 'Mat 1-2 ngay cho moi lan can thong tin',
    icon: '[~]',
  },
];

const solutionCards = [
  {
    title: 'Ket noi tu dong',
    desc: 'Tu dong dong bo du lieu tu Shopee, Lazada, TikTok, ke toan, kho',
    benefit: 'Khong can nhap lieu thu cong',
  },
  {
    title: 'Chuan hoa du lieu',
    desc: 'Chuyen doi du lieu tu nhieu nguon ve cung mot format chuan',
    benefit: 'So lieu nhat quan, tin cay',
  },
  {
    title: 'Cap nhat real-time',
    desc: 'Du lieu duoc dong bo lien tuc, khong phai cho cuoi ngay',
    benefit: 'Luon co thong tin moi nhat',
  },
  {
    title: 'Tu do truy van',
    desc: 'Truy xuat bat ky thong tin nao ma khong can nho IT',
    benefit: 'Ra quyet dinh nhanh hon',
  },
];

const competitiveAdvantages = [
  {
    title: 'vs. Excel/Google Sheets',
    points: [
      'Tu dong, khong can copy-paste thu cong',
      'Khong lo file qua nang, bi loi',
      'Nhieu nguoi dung cung luc khong conflict',
    ],
  },
  {
    title: 'vs. ERP truyen thong',
    points: [
      'Trien khai trong vai ngay, khong phai vai thang',
      'Chi phi thap hon 10 lan',
      'Linh hoat, de tuy chinh theo nhu cau',
    ],
  },
  {
    title: 'vs. Tu xay Data Warehouse',
    points: [
      'Khong can doi ngu IT chuyen biet',
      'Da co san connector cho e-commerce VN',
      'Bao tri va nang cap tu dong',
    ],
  },
];

const useCaseStories = [
  {
    title: 'Tong hop doanh thu da kenh',
    persona: 'Chi Huong - CEO chuoi cua hang thoi trang',
    situation: 'Ban tren 5 kenh: Shopee, Lazada, TikTok, website, cua hang',
    problem: 'Moi sang mat 2 gio de tong hop doanh thu tu tung kenh',
    solution: 'Data Warehouse tu dong gom tat ca ve mot dashboard',
    result: 'Tiet kiem 10 gio/tuan, biet doanh thu thuc ngay khi can',
  },
  {
    title: 'Doi chieu ton kho thuc te',
    persona: 'Anh Duc - Quan ly kho thuc pham',
    situation: 'Ton kho tren he thong va thuc te luon chenh lech',
    problem: 'Cuoi thang kiem ke moi biet mat mat, qua han',
    solution: 'Dong bo real-time giua POS, WMS va ke toan',
    result: 'Phat hien chenh lech ngay lap tuc, giam hao hut 40%',
  },
  {
    title: 'Phan tich hieu qua Marketing',
    persona: 'Linh - Marketing Manager my pham',
    situation: 'Chay quang cao tren 4 nen tang khac nhau',
    problem: 'Khong biet kenh nao thuc su mang lai loi nhuan',
    solution: 'Ket noi chi phi ads voi doanh thu va margin thuc',
    result: 'Xac dinh duoc kenh hieu qua, cat giam 30% budget lang phi',
  },
  {
    title: 'Bao cao tai chinh tu dong',
    persona: 'Anh Kien - CFO cong ty phan phoi',
    situation: 'Moi thang mat 1 tuan de dong bao cao tai chinh',
    problem: 'So lieu tu nhieu phong ban khong khop, phai doi chieu lai',
    solution: 'Mot nguon du lieu duy nhat, bao cao tu dong tao',
    result: 'Dong bao cao trong 1 ngay thay vi 1 tuan',
  },
];

const architectureComponents = [
  { name: 'Data Sources', desc: 'Shopee, Lazada, TikTok, POS, WMS, Ke toan' },
  { name: 'ETL Pipeline', desc: 'Extract, Transform, Load tu dong' },
  { name: 'Data Lake', desc: 'Luu tru du lieu tho, chua xu ly' },
  { name: 'Data Warehouse', desc: 'Du lieu da chuan hoa, san sang truy van' },
  { name: 'Data Marts', desc: 'Datasets chuyen biet cho tung module' },
  { name: 'BI Layer', desc: 'Dashboards va Reports' },
];

const manifestoItems = [
  'SINGLE SOURCE OF TRUTH - Chi co mot phien ban du lieu duy nhat',
  'AUTOMATED INGESTION - Du lieu tu dong chay vao, khong can tac dong',
  'REAL-TIME FRESHNESS - Du lieu luon moi, khong phai cho batch cuoi ngay',
  'SCHEMA ENFORCEMENT - Du lieu duoc kiem tra va chuan hoa truoc khi luu',
  'LINEAGE TRACKING - Biet ro du lieu den tu dau, di qua nhung buoc nao',
  'ACCESS CONTROL - Phan quyen ro rang, ai duoc xem gi',
  'QUERY PERFORMANCE - Truy van nhanh du du lieu lon',
  'SCALABILITY - Mo rong khong gioi han khi doanh nghiep phat trien',
  'COST EFFICIENCY - Chi tra cho nhung gi su dung',
  'INTEGRATION READY - San sang ket noi voi bat ky he thong nao',
];

// Page components
const CoverPage = () => (
  <Page size="A4" style={styles.pageDark}>
    {/* Decorative circles */}
    <View style={[styles.decorCircle, { width: 300, height: 300, top: -100, right: -100, backgroundColor: colors.accent }]} />
    <View style={[styles.decorCircle, { width: 200, height: 200, bottom: -50, left: -50, backgroundColor: colors.accentLight }]} />
    
    <View style={styles.coverContainer}>
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>BLUECORE DATA WAREHOUSE</Text>
      </View>
      <Text style={styles.coverTitle}>Data Warehouse</Text>
      <Text style={styles.coverSubtitle}>Nen tang du lieu thong nhat cho doanh nghiep</Text>
      <Text style={styles.coverTagline}>Single Source of Truth</Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Platform</Text>
      <Text style={styles.pageNumberWhite}>01</Text>
    </View>
  </Page>
);

const DataChallengePage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Van de du lieu cua SME Retail</Text>
      <Text style={styles.sectionSubtitle}>
        80% SME Retail dang mat thoi gian va tien bac vi du lieu khong duoc quan ly tot
      </Text>
      
      <View style={styles.row}>
        <View style={styles.col2}>
          {dataChallenges.slice(0, 2).map((item, idx) => (
            <View key={idx} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }}>
                  <Text style={{ color: colors.textWhite, fontSize: 10, fontWeight: 700 }}>{item.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={[styles.cardText, { marginBottom: 6 }]}>{item.problem}</Text>
              <Text style={[styles.cardText, { color: colors.error, fontWeight: 700 }]}>Chi phi: {item.cost}</Text>
            </View>
          ))}
        </View>
        <View style={styles.col2}>
          {dataChallenges.slice(2, 4).map((item, idx) => (
            <View key={idx} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }}>
                  <Text style={{ color: colors.textWhite, fontSize: 10, fontWeight: 700 }}>{item.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={[styles.cardText, { marginBottom: 6 }]}>{item.problem}</Text>
              <Text style={[styles.cardText, { color: colors.error, fontWeight: 700 }]}>Chi phi: {item.cost}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          "Neu khong biet so nao dung, moi quyet dinh deu la dao xuc"
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>02</Text>
    </View>
  </Page>
);

const PositioningPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={[styles.sectionTitleWhite, { marginBottom: 8 }]}>Bluecore Data Warehouse</Text>
      <Text style={[styles.sectionSubtitleWhite, { fontSize: 16, marginBottom: 30 }]}>
        Khong phai Data Lake phuc tap - Khong phai Excel don gian
      </Text>
      
      <View style={styles.pillContainer}>
        {threePillars.map((pillar, idx) => (
          <View key={idx} style={styles.pill}>
            <Text style={styles.pillText}>{pillar.icon} {pillar.title}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.row}>
        {solutionCards.slice(0, 2).map((card, idx) => (
          <View key={idx} style={[styles.cardDark, styles.col2]}>
            <Text style={styles.cardTitleWhite}>{card.title}</Text>
            <Text style={styles.cardTextWhite}>{card.desc}</Text>
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={[styles.cardTextWhite, { color: colors.accentLight, fontWeight: 700 }]}>
                {card.benefit}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {solutionCards.slice(2, 4).map((card, idx) => (
          <View key={idx} style={[styles.cardDark, styles.col2]}>
            <Text style={styles.cardTitleWhite}>{card.title}</Text>
            <Text style={styles.cardTextWhite}>{card.desc}</Text>
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={[styles.cardTextWhite, { color: colors.accentLight, fontWeight: 700 }]}>
                {card.benefit}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>03</Text>
    </View>
  </Page>
);

const ArchitecturePage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Kien truc Data Warehouse</Text>
      <Text style={styles.sectionSubtitle}>
        Du lieu chay tu nguon den bao cao - tu dong, nhat quan, dang tin cay
      </Text>
      
      {/* Architecture flow diagram */}
      <View style={{ marginBottom: 20 }}>
        {architectureComponents.map((comp, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ 
              width: 30, 
              height: 30, 
              backgroundColor: colors.accent, 
              borderRadius: 15, 
              justifyContent: 'center', 
              alignItems: 'center',
              marginRight: 12 
            }}>
              <Text style={{ color: colors.textWhite, fontSize: 12, fontWeight: 700 }}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 2 }}>{comp.name}</Text>
              <Text style={{ fontSize: 10, color: colors.textLight }}>{comp.desc}</Text>
            </View>
            {idx < architectureComponents.length - 1 && (
              <View style={{ position: 'absolute', left: 14, top: 38, width: 2, height: 20, backgroundColor: colors.accent }} />
            )}
          </View>
        ))}
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          Du lieu tu Shopee, Lazada, TikTok den Dashboard chi mat vai phut
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>04</Text>
    </View>
  </Page>
);

const CompetitivePage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Tai sao Bluecore Data Warehouse?</Text>
      <Text style={styles.sectionSubtitle}>
        So sanh voi cac giai phap pho bien khac tren thi truong
      </Text>
      
      {competitiveAdvantages.map((adv, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.accent, marginBottom: 10 }]}>{adv.title}</Text>
          {adv.points.map((point, pIdx) => (
            <View key={pIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
              <Text style={{ color: colors.success, marginRight: 8, fontSize: 11 }}>[+]</Text>
              <Text style={styles.cardText}>{point}</Text>
            </View>
          ))}
        </View>
      ))}
      
      <View style={[styles.quoteBox, { backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>
          Trien khai trong 1 tuan - Khong can doi ngu IT - Chi phi hop ly
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>05</Text>
    </View>
  </Page>
);

const UseCasePage1 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCaseStories[0].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>Tinh huong: {useCaseStories[0].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCaseStories[0].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardTextWhite}>{useCaseStories[0].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Bluecore giai quyet</Text>
        <Text style={styles.cardTextWhite}>{useCaseStories[0].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Shopee hom nay</Text>
            <Text style={styles.mockupValue}>45.2M VND</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Lazada hom nay</Text>
            <Text style={styles.mockupValue}>32.1M VND</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>TikTok hom nay</Text>
            <Text style={styles.mockupValue}>28.7M VND</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.mockupLabel, { fontWeight: 700 }]}>TONG CONG</Text>
            <Text style={[styles.mockupValue, { fontSize: 12 }]}>106.0M VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Ket qua: {useCaseStories[0].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>06</Text>
    </View>
  </Page>
);

const UseCasePage2 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{useCaseStories[1].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tinh huong: {useCaseStories[1].persona}</Text>
        <Text style={styles.storyText}>{useCaseStories[1].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardText}>{useCaseStories[1].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Bluecore giai quyet</Text>
        <Text style={styles.cardText}>{useCaseStories[1].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>SKU-001 | He thong</Text>
            <Text style={styles.mockupValue}>150 don vi</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>SKU-001 | Thuc te</Text>
            <Text style={[styles.mockupValue, { color: colors.error }]}>142 don vi</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Chenh lech</Text>
            <Text style={[styles.mockupValue, { color: colors.error }]}>[!] -8 don vi</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16, backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>Ket qua: {useCaseStories[1].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>07</Text>
    </View>
  </Page>
);

const UseCasePage3 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCaseStories[2].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>Tinh huong: {useCaseStories[2].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCaseStories[2].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardTextWhite}>{useCaseStories[2].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Bluecore giai quyet</Text>
        <Text style={styles.cardTextWhite}>{useCaseStories[2].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Facebook Ads | Chi phi</Text>
            <Text style={styles.mockupValue}>15M VND</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Facebook Ads | Margin</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>+8.2M VND</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Google Ads | Chi phi</Text>
            <Text style={styles.mockupValue}>20M VND</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Google Ads | Margin</Text>
            <Text style={[styles.mockupValue, { color: colors.error }]}>-2.1M VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Ket qua: {useCaseStories[2].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>08</Text>
    </View>
  </Page>
);

const UseCasePage4 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{useCaseStories[3].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tinh huong: {useCaseStories[3].persona}</Text>
        <Text style={styles.storyText}>{useCaseStories[3].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardText}>{useCaseStories[3].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Bluecore giai quyet</Text>
        <Text style={styles.cardText}>{useCaseStories[3].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Bao cao P&L</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Tu dong</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Bao cao Cash Flow</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Tu dong</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Thoi gian tong hop</Text>
            <Text style={styles.mockupValue}>1 ngay (truoc: 7 ngay)</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16, backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>Ket qua: {useCaseStories[3].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>09</Text>
    </View>
  </Page>
);

const ManifestoPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>Data Warehouse Manifesto</Text>
      <Text style={styles.sectionSubtitleWhite}>10 nguyen tac bat bien</Text>
      
      <View style={{ marginTop: 10 }}>
        {manifestoItems.map((item, idx) => (
          <View key={idx} style={styles.manifestoItem}>
            <View style={styles.manifestoNumber}>
              <Text style={styles.manifestoNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.manifestoTextWhite}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>10</Text>
    </View>
  </Page>
);

const CTAPage = () => (
  <Page size="A4" style={styles.page}>
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.sectionTitle, { fontSize: 32, marginBottom: 16 }]}>
        San sang thong nhat du lieu?
      </Text>
      <Text style={[styles.sectionSubtitle, { fontSize: 16, marginBottom: 40 }]}>
        Lien he de duoc tu van va demo mien phi
      </Text>
      
      <View style={[styles.card, { width: 350, alignItems: 'center', padding: 24 }]}>
        <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 16 }]}>Bluecore Team</Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardText}>Email: contact@bluecore.vn</Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardText}>Web: bluecore.vn</Text>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 40, width: 350 }]}>
        <Text style={styles.quoteText}>Single Source of Truth</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>11</Text>
    </View>
  </Page>
);

// Main Document Component
const DataWarehouseSalesDeckPDF: React.FC = () => (
  <Document
    title="Bluecore Data Warehouse Sales Deck"
    author="Bluecore Team"
    subject="Data Warehouse - Single Source of Truth"
    keywords="data warehouse, ETL, data platform, SME, retail, Vietnam"
  >
    <CoverPage />
    <DataChallengePage />
    <PositioningPage />
    <ArchitecturePage />
    <CompetitivePage />
    <UseCasePage1 />
    <UseCasePage2 />
    <UseCasePage3 />
    <UseCasePage4 />
    <ManifestoPage />
    <CTAPage />
  </Document>
);

export default DataWarehouseSalesDeckPDF;
