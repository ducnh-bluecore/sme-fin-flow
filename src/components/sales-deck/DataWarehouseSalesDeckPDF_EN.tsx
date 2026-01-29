/**
 * Data Warehouse Sales Deck PDF Generator - ENGLISH VERSION
 * 
 * 12-slide narrative deck for Financial Spine / Data Warehouse
 * Tagline: "Single Source of Truth"
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});

const colors = {
  primary: '#06b6d4',
  primaryDark: '#0e7490',
  accent: '#10b981',
  danger: '#ef4444',
  text: '#1f2937',
  textLight: '#6b7280',
  white: '#ffffff',
  dark: '#0f172a',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.white },
  pageDark: { padding: 40, fontFamily: 'NotoSans', backgroundColor: colors.dark },
  coverPage: { padding: 60, fontFamily: 'NotoSans', backgroundColor: colors.dark, justifyContent: 'center', alignItems: 'center', height: '100%' },
  coverTitle: { fontSize: 42, fontWeight: 700, color: colors.white, marginBottom: 16, textAlign: 'center' },
  coverSubtitle: { fontSize: 18, color: colors.primary, opacity: 0.9, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 },
  coverBadge: { marginTop: 40, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  coverBadgeText: { fontSize: 14, fontWeight: 700, color: colors.white, letterSpacing: 1 },
  coverTagline: { marginTop: 24, fontSize: 16, fontWeight: 700, color: colors.primary },
  eyebrowLabel: { fontSize: 10, fontWeight: 700, color: colors.primary, letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { fontSize: 26, fontWeight: 700, color: colors.primaryDark, marginBottom: 10 },
  sectionTitleWhite: { fontSize: 26, fontWeight: 700, color: colors.white, marginBottom: 10, textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, color: colors.textLight, marginBottom: 24, maxWidth: 480, lineHeight: 1.5 },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: colors.primaryDark, marginBottom: 6 },
  cardText: { fontSize: 10, color: colors.textLight, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: colors.textLight },
  footerTextWhite: { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  pageNumber: { fontSize: 9, color: colors.textLight },
});

const connectors = [
  { category: 'E-commerce', items: ['Shopee', 'Lazada', 'TikTok Shop', 'Tiki', 'Sendo'] },
  { category: 'POS/ERP', items: ['Haravan', 'Sapo', 'KiotViet', 'MISA', 'Suno'] },
  { category: 'Marketing', items: ['Google Ads', 'Meta Ads', 'TikTok Ads'] },
  { category: 'Banking', items: ['Techcombank', 'VietinBank', 'MB Bank'] },
];

const painPoints = [
  { title: 'Data Chaos', desc: 'Sales data in Shopee. Inventory in Haravan. Ads in Google. Bank statements in email. Nobody agrees on the numbers.' },
  { title: 'Manual Reconciliation Hell', desc: 'Every month, finance team spends 5 days reconciling data. And still misses things.' },
  { title: 'Multiple Truths', desc: 'CFO says $80K revenue. Sales says $100K. Marketing says $120K. Who is right?' },
  { title: 'Delayed Decisions', desc: 'Wait for data → wait for reconciliation → wait for report → decision too late.' },
];

const solutions = [
  { title: '35+ Native Connectors', desc: 'Pre-built integrations for Vietnam retail: Shopee, Lazada, Haravan, Sapo, KiotViet, and more.' },
  { title: 'Single Source of Truth', desc: 'One data warehouse. One version of numbers. CFO and CMO see the same thing.' },
  { title: '1-2 Weeks Deployment', desc: 'Not 6 months. Bluecore team handles all integration. No IT team needed.' },
  { title: 'Zero Reconciliation', desc: 'Data auto-syncs. Auto-validates. Auto-reconciles. Finance team freed up.' },
];

const comparison = [
  { criteria: 'Deployment', power: '3-6 months', custom: '6-12 months', bluecore: '1-2 weeks' },
  { criteria: 'VN Platforms', power: 'Custom code', custom: 'Build yourself', bluecore: '35+ native' },
  { criteria: 'Maintenance', power: 'Medium', custom: 'Very High', bluecore: 'Included' },
  { criteria: 'Team needed', power: 'Data engineer', custom: 'Full dev team', bluecore: 'None' },
];

const DataWarehouseSalesDeckPDF_EN: React.FC = () => (
  <Document>
    {/* Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>FINANCIAL SPINE</Text></View>
      <Text style={styles.coverTitle}>DATA WAREHOUSE</Text>
      <Text style={styles.coverSubtitle}>35+ Connectors for Vietnam Retail — Deploy in 1-2 Weeks</Text>
      <Text style={styles.coverTagline}>Single Source of Truth</Text>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={styles.footerTextWhite}>1 / 12</Text></View>
    </Page>

    {/* Connector Ecosystem */}
    <Page size="A4" style={styles.pageDark}>
      <Text style={[styles.eyebrowLabel, { color: colors.primary }]}>CONNECTOR ECOSYSTEM</Text>
      <Text style={styles.sectionTitleWhite}>35+ Native Integrations</Text>
      <View style={{ marginTop: 20 }}>
        {connectors.map((cat, i) => (
          <View key={i} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primary, marginBottom: 8 }}>{cat.category}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {cat.items.map((item, j) => (
                <View key={j} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, color: colors.white }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.primary, borderRadius: 10 }}>
        <Text style={{ fontSize: 11, color: colors.white, textAlign: 'center' }}>
          All Vietnam major platforms supported. No custom code needed.
        </Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>2 / 12</Text></View>
    </Page>

    {/* Pain Points */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE PROBLEM</Text>
      <Text style={styles.sectionTitle}>Data Fragmentation Kills Decisions</Text>
      <Text style={styles.sectionSubtitle}>Your data lives in 10 different places. Your decisions suffer.</Text>
      {painPoints.map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          <Text style={styles.cardText}>{p.desc}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>3 / 12</Text></View>
    </Page>

    {/* Solution */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>THE SOLUTION</Text>
      <Text style={styles.sectionTitle}>Financial Spine — Data Foundation</Text>
      <Text style={styles.sectionSubtitle}>One centralized warehouse. All modules read from the same truth.</Text>
      {solutions.map((s, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{s.title}</Text>
          <Text style={styles.cardText}>{s.desc}</Text>
        </View>
      ))}
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>4 / 12</Text></View>
    </Page>

    {/* Comparison */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.eyebrowLabel}>COMPARISON</Text>
      <Text style={styles.sectionTitle}>Bluecore vs Alternatives</Text>
      <View style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.dark }}>
          <View style={{ flex: 1.2, padding: 10 }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.white }}>Criteria</Text></View>
          <View style={{ flex: 1, padding: 10 }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'center' }}>Power BI</Text></View>
          <View style={{ flex: 1, padding: 10 }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'center' }}>Custom</Text></View>
          <View style={{ flex: 1, padding: 10, backgroundColor: colors.accent }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.white, textAlign: 'center' }}>Bluecore</Text></View>
        </View>
        {comparison.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flex: 1.2, padding: 10, backgroundColor: '#f8fafc' }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.text }}>{row.criteria}</Text></View>
            <View style={{ flex: 1, padding: 10 }}><Text style={{ fontSize: 9, color: colors.text, textAlign: 'center' }}>{row.power}</Text></View>
            <View style={{ flex: 1, padding: 10 }}><Text style={{ fontSize: 9, color: colors.text, textAlign: 'center' }}>{row.custom}</Text></View>
            <View style={{ flex: 1, padding: 10, backgroundColor: '#ecfdf5' }}><Text style={{ fontSize: 9, fontWeight: 700, color: colors.accent, textAlign: 'center' }}>{row.bluecore}</Text></View>
          </View>
        ))}
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>bluecore.vn</Text><Text style={styles.pageNumber}>5 / 12</Text></View>
    </Page>

    {/* CTA */}
    <Page size="A4" style={styles.pageDark}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.white, textAlign: 'center', marginBottom: 20 }}>Unify Your Data in 2 Weeks</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>See how your connectors map to our warehouse</Text>
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.white }}>sales@bluecore.vn</Text>
        </View>
      </View>
      <View style={styles.footer}><Text style={styles.footerTextWhite}>bluecore.vn</Text><Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>12 / 12</Text></View>
    </Page>
  </Document>
);

export default DataWarehouseSalesDeckPDF_EN;
