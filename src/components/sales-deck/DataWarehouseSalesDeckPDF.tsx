/**
 * Data Warehouse Sales Deck PDF Component
 * 
 * Professional PDF sales deck for the Data Warehouse module
 * Following the 'Single Source of Truth' philosophy
 * Content based on https://bluecore.vn/blogs/news/10-loi-ich-va-truong-hop-su-dung-data-warehouse
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
  manifestoTextWhite: {
    flex: 1,
    fontSize: 11,
    color: colors.textWhite,
    lineHeight: 1.5,
  },
  manifestoText: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
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

// Content data - Vietnamese with full diacritics
const threePillars = [
  { icon: '[=]', title: 'NHAT QUAN', desc: 'Du lieu chuan hoa' },
  { icon: '[*]', title: 'TAP TRUNG', desc: 'Mot nguon duy nhat' },
  { icon: '[>]', title: 'TRUY CAP', desc: 'De dang va nhanh chong' },
];

// 5 loi ich cua Data Warehouse tu bluecore.vn
const dwBenefits = [
  {
    title: '1. Tinh nhat quan',
    desc: 'Luu tru du lieu thuong lien quan den viec chuyen doi du lieu tu nhieu nguon va dinh dang thanh mot dinh dang chuan, giup nguoi dung de dang phan tich va chia se thong tin chi tiet.',
  },
  {
    title: '2. Tinh tap trung',
    desc: 'Kho du lieu giai quyet van de hop nhat du lieu tu nhieu he thong con duoc xay dung tren cac nen tang khac nhau vao mot kho luu tru duy nhat.',
  },
  {
    title: '3. Kha nang truy cap',
    desc: 'Nguoi dung doanh nghiep co the tu tao bao cao va truy van, truy cap tat ca du lieu tu mot giao dien thay vi phai dang nhap vao nhieu he thong.',
  },
  {
    title: '4. Kha nang kiem soat',
    desc: 'Kho du lieu dam bao tinh toan ven cua du lieu thong qua cac bien phap kiem soat duoc trien khai doi voi cac vai tro va trach nhiem lien quan.',
  },
  {
    title: '5. Lam sach du lieu',
    desc: 'Kho du lieu su dung quy trinh khu trung de loai bo thong tin chat luong kem, phat hien cac bo du lieu trung lap, bi hong hoac khong chinh xac.',
  },
];

// Use cases tu bluecore.vn
const useCases = [
  {
    title: 'Hieu qua chien dich Marketing',
    persona: 'Marketing Manager',
    situation: 'Du lieu tiep thi nam rai rac tren nhieu he thong: CRM, he thong ban hang, nen tang quang cao',
    problem: 'Vao thoi diem cac nhom tap hop du lieu phan tan vao bang tinh, du lieu co the da tro nen loi thoi',
    solution: 'Kho du lieu tao ra mot nguon du lieu duy nhat, hop nhat du lieu tu cac he thong ben trong va ben ngoai',
    result: 'Tat ca nha tiep thi deu co quyen truy cap vao cung mot du lieu duoc tieu chuan hoa, theo doi ROI va chi phi mua lai khach hang tot hon',
  },
  {
    title: 'Danh gia hieu suat nhom',
    persona: 'CEO / CFO',
    situation: 'Can danh gia hieu suat cua nhom trong toan to chuc',
    problem: 'Du lieu nam o nhieu he thong khac nhau, kho tong hop de so sanh',
    solution: 'Nguoi dung co the tim hieu sau hon ve du lieu nhom de tao bang dieu khien hoac bao cao tuy chinh',
    result: 'Cac chi so nhu mo hinh su dung, gia tri lau dai cua khach hang co the duoc su dung de danh gia cac nhom',
  },
  {
    title: 'Hop nhat du lieu tu he thong cu',
    persona: 'IT Manager',
    situation: 'Du lieu cu duoc luu tru o dinh dang cu hoac he thong loi thoi, gay kho khan cho viec truy cap',
    problem: 'Cac he thong ke thua duoc xay dung de thuc hien cac chuc nang cu the va khong duoc xay dung de phan tich du lieu',
    solution: 'Kho du lieu co the tu dong ket noi voi cac he thong cu de thu thap va phan tich du lieu, su dung ETL de chuyen doi',
    result: 'Hop nhat du lieu cu voi ung dung moi giup cung cap thong tin chi tiet hon ve cac xu huong lich su',
  },
  {
    title: 'Phan tich du lieu lon theo thoi gian thuc',
    persona: 'Data Analyst',
    situation: 'Du lieu dong lon duoc tao lien tuc boi nhieu nguon: web, mobile, thuong mai dien tu',
    problem: 'Du lieu khong the duoc phan tich lai sau khi truyen phat, can xu ly ngay lap tuc',
    solution: 'Kho du lieu co the nhom du lieu dong lon de hien thi so lieu thong ke tong the',
    result: 'Hieu ro hon ve cac hoat dong kinh doanh va khach hang nhu so lan nhap vao trang web, vi tri dia ly cua thiet bi',
  },
];

// Ket qua khi su dung Data Warehouse
const dwResults = [
  'Luong thong tin hop ly hoa',
  'Chat luong va tinh nhat quan cua du lieu duoc nang cao',
  'Tri tue kinh doanh duoc cai thien',
  'Loi the canh tranh dang ke',
  'Cai thien viec ra quyet dinh',
];

const manifestoItems = [
  'SINGLE SOURCE OF TRUTH - Chi co mot phien ban du lieu duy nhat',
  'TINH NHAT QUAN - Du lieu duoc chuan hoa tu nhieu nguon va dinh dang',
  'TINH TAP TRUNG - Hop nhat du lieu vao mot kho luu tru duy nhat',
  'TRUY CAP DE DANG - Nguoi dung co the tu tao bao cao ma khong can IT',
  'KIEM SOAT CHAT CHE - Phan quyen ro rang, dam bao tinh toan ven du lieu',
  'LAM SACH DU LIEU - Loai bo thong tin trung lap, bi hong, khong chinh xac',
  'TICH HOP ETL - Ket noi va chuyen doi du lieu tu cac he thong cu',
  'THOI GIAN THUC - Xu ly du lieu dong lon ngay lap tuc',
  'BAO CAO THONG MINH - Tao bang dieu khien va bao cao tuy chinh',
  'RA QUYET DINH TOT HON - Cung cap thong tin chi tiet va xu huong lich su',
];

// Page components
const CoverPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.decorCircle, { width: 300, height: 300, top: -100, right: -100, backgroundColor: colors.accent }]} />
    <View style={[styles.decorCircle, { width: 200, height: 200, bottom: -50, left: -50, backgroundColor: colors.accentLight }]} />
    
    <View style={styles.coverContainer}>
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>BLUECORE DATA PLATFORM</Text>
      </View>
      <Text style={styles.coverTitle}>Data Warehouse</Text>
      <Text style={styles.coverSubtitle}>Kho du lieu hop nhat cho doanh nghiep</Text>
      <Text style={styles.coverTagline}>Single Source of Truth</Text>
      
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 8 }}>Hop nhat du lieu tu nhieu nguon</Text>
        <Text style={{ fontSize: 14, color: colors.accentLight, fontWeight: 700 }}>Nang cao hieu qua kinh doanh va ra quyet dinh tot hon</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>bluecore.vn</Text>
      <Text style={styles.pageNumberWhite}>01</Text>
    </View>
  </Page>
);

const WhatIsPage = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Data Warehouse la gi?</Text>
      <Text style={styles.sectionSubtitle}>
        Kho du lieu hop nhat mot luong lon du lieu tu nhieu nguon va toi uu hoa du lieu do de cho phep phan tich
      </Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyText}>
          Kho du lieu hop nhat mot luong lon du lieu tu nhieu nguon va toi uu hoa du lieu do de cho phep phan tich nham nang cao hieu qua kinh doanh, dua ra quyet dinh tot hon va kham pha cac loi the canh tranh.
        </Text>
      </View>
      
      <View style={styles.pillContainer}>
        {threePillars.map((pillar, idx) => (
          <View key={idx} style={styles.pill}>
            <Text style={styles.pillText}>{pillar.icon} {pillar.title}</Text>
          </View>
        ))}
      </View>
      
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Data Warehouse cung cap:</Text>
        <View style={{ marginTop: 12 }}>
          {dwResults.map((result, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ color: colors.success, marginRight: 8, fontSize: 11 }}>[+]</Text>
              <Text style={styles.cardText}>{result}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          Cac to chuc nam bat duoc toan bo loi ich cua du lieu duoc trang bi tot hon de xu ly cac dieu kien thi truong dang thay doi
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>02</Text>
    </View>
  </Page>
);

const BenefitsPage1 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>5 Loi ich cua Data Warehouse</Text>
      <Text style={styles.sectionSubtitleWhite}>
        Kho du lieu duoc trien khai thanh cong co the giup to chuc cua ban theo nhieu cach
      </Text>
      
      {dwBenefits.slice(0, 3).map((benefit, idx) => (
        <View key={idx} style={styles.cardDark}>
          <Text style={styles.cardTitleWhite}>{benefit.title}</Text>
          <Text style={styles.cardTextWhite}>{benefit.desc}</Text>
        </View>
      ))}
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>03</Text>
    </View>
  </Page>
);

const BenefitsPage2 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>5 Loi ich cua Data Warehouse</Text>
      <Text style={styles.sectionSubtitle}>
        Tiep tuc...
      </Text>
      
      {dwBenefits.slice(3, 5).map((benefit, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={styles.cardTitle}>{benefit.title}</Text>
          <Text style={styles.cardText}>{benefit.desc}</Text>
        </View>
      ))}
      
      <View style={[styles.quoteBox, { backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>
          Du lieu nhat quan hon co nghia la cac bo phan kinh doanh rieng le co the su dung cung mot nguon du lieu
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>04</Text>
    </View>
  </Page>
);

const UseCasePage1 = () => (
  <Page size="A4" style={styles.page}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{useCases[0].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tinh huong: {useCases[0].persona}</Text>
        <Text style={styles.storyText}>{useCases[0].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardText}>{useCases[0].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Giai phap Data Warehouse</Text>
        <Text style={styles.cardText}>{useCases[0].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Facebook Ads | ROI</Text>
            <Text style={styles.mockupValue}>3.2x</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Google Ads | ROI</Text>
            <Text style={styles.mockupValue}>2.8x</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Chi phi mua lai KH</Text>
            <Text style={styles.mockupValue}>125,000 VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Ket qua: {useCases[0].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>05</Text>
    </View>
  </Page>
);

const UseCasePage2 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCases[1].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>Tinh huong: {useCases[1].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[1].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Giai phap Data Warehouse</Text>
        <Text style={styles.cardTextWhite}>{useCases[1].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Sales Team | Hieu suat</Text>
            <Text style={styles.mockupValue}>92%</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Marketing Team | Hieu suat</Text>
            <Text style={styles.mockupValue}>88%</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Customer LTV</Text>
            <Text style={styles.mockupValue}>2.5M VND</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Ket qua: {useCases[1].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>06</Text>
    </View>
  </Page>
);

const UseCasePage3 = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{useCases[2].title}</Text>
      
      <View style={styles.storyBlock}>
        <Text style={styles.storyTitle}>Tinh huong: {useCases[2].persona}</Text>
        <Text style={styles.storyText}>{useCases[2].situation}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitle, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardText}>{useCases[2].problem}</Text>
      </View>
      
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitle, { color: colors.success }]}>Giai phap Data Warehouse</Text>
        <Text style={styles.cardText}>{useCases[2].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>He thong cu | Trang thai</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Da ket noi</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>ETL Pipeline | Trang thai</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Hoat dong</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Du lieu lich su</Text>
            <Text style={styles.mockupValue}>5 nam</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16, backgroundColor: colors.success }]}>
        <Text style={styles.quoteText}>Ket qua: {useCases[2].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>07</Text>
    </View>
  </Page>
);

const UseCasePage4 = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={styles.container}>
      <Text style={styles.sectionTitleWhite}>{useCases[3].title}</Text>
      
      <View style={styles.storyBlockDark}>
        <Text style={styles.storyTitleWhite}>Tinh huong: {useCases[3].persona}</Text>
        <Text style={styles.storyTextWhite}>{useCases[3].situation}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.error }]}>Van de</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].problem}</Text>
      </View>
      
      <View style={[styles.cardDark, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
        <Text style={[styles.cardTitleWhite, { color: colors.success }]}>Giai phap Data Warehouse</Text>
        <Text style={styles.cardTextWhite}>{useCases[3].solution}</Text>
      </View>
      
      <View style={styles.mockupContainer}>
        <View style={styles.mockupHeader}>
          <View style={[styles.mockupDot, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.mockupDot, { backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.mockupContent}>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Web Events / phut</Text>
            <Text style={styles.mockupValue}>10,000+</Text>
          </View>
          <View style={styles.mockupRow}>
            <Text style={styles.mockupLabel}>Mobile Events / phut</Text>
            <Text style={styles.mockupValue}>5,000+</Text>
          </View>
          <View style={[styles.mockupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.mockupLabel}>Xu ly Real-time</Text>
            <Text style={[styles.mockupValue, { color: colors.success }]}>[OK] Hoat dong</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 16 }]}>
        <Text style={styles.quoteText}>Ket qua: {useCases[3].result}</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>08</Text>
    </View>
  </Page>
);

const ManifestoPage = () => (
  <Page size="A4" style={styles.pageAlt}>
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Data Warehouse Manifesto</Text>
      <Text style={styles.sectionSubtitle}>10 nguyen tac cot loi</Text>
      
      <View style={{ marginTop: 10 }}>
        {manifestoItems.map((item, idx) => (
          <View key={idx} style={styles.manifestoItem}>
            <View style={styles.manifestoNumber}>
              <Text style={styles.manifestoNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.manifestoText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerText}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumber}>09</Text>
    </View>
  </Page>
);

const CTAPage = () => (
  <Page size="A4" style={styles.pageDark}>
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[styles.sectionTitleWhite, { fontSize: 32, marginBottom: 16 }]}>
        San sang tap trung hoa du lieu?
      </Text>
      <Text style={[styles.sectionSubtitleWhite, { fontSize: 16, marginBottom: 40 }]}>
        Lien he de duoc tu van va demo mien phi
      </Text>
      
      <View style={[styles.cardDark, { width: 350, alignItems: 'center', padding: 24 }]}>
        <Text style={[styles.cardTitleWhite, { fontSize: 16, marginBottom: 16 }]}>Bluecore Team</Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Email: contact@bluecore.vn</Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.cardTextWhite}>Website: bluecore.vn</Text>
        </View>
      </View>
      
      <View style={[styles.quoteBox, { marginTop: 40, width: 350 }]}>
        <Text style={styles.quoteText}>Single Source of Truth</Text>
      </View>
      
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 10, color: colors.textLight, textAlign: 'center' }}>
          Kho du lieu co the mang lai gia tri lon cho cac doanh nghiep de tap trung hoa va tao du lieu nhat quan hon
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerTextWhite}>Bluecore Data Warehouse</Text>
      <Text style={styles.pageNumberWhite}>10</Text>
    </View>
  </Page>
);

// Main Document Component
const DataWarehouseSalesDeckPDF: React.FC = () => (
  <Document
    title="Bluecore Data Warehouse Sales Deck"
    author="Bluecore Team"
    subject="Data Warehouse - Single Source of Truth"
    keywords="data warehouse, ETL, data platform, bluecore"
  >
    <CoverPage />
    <WhatIsPage />
    <BenefitsPage1 />
    <BenefitsPage2 />
    <UseCasePage1 />
    <UseCasePage2 />
    <UseCasePage3 />
    <UseCasePage4 />
    <ManifestoPage />
    <CTAPage />
  </Document>
);

export default DataWarehouseSalesDeckPDF;
