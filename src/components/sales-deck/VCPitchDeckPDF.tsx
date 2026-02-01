/**
 * VC Pitch Deck PDF - English Version
 * 
 * 22-slide Series A presentation for international VCs
 * Focus on Category Claim: Financial Decision Infrastructure
 * Structure: 7 Acts - Psychological sequence addressing investor risks
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Get base URL dynamically for font loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

// Register Noto Sans font (supports all characters properly)
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
    fontStyle: 'italic',
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

// ACT 1 — OPEN THE CATEGORY
const Slide01 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Financial Decisions Are Still Running</Text>
      <Text style={styles.headlineAmber}>on Lagging Systems.</Text>
      <Text style={styles.subheadline}>
        Commerce now moves in real time.{'\n'}
        Financial truth still arrives weeks later.
      </Text>
      <View style={styles.gridContainer}>
        {['CAC shifts daily', 'Margins compress instantly', 'Inventory risk compounds', 'Cash exposure escalates'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#f87171', marginTop: 16 }}>
        Decision latency is becoming an existential risk.
      </Text>
    </View>
    <Text style={styles.slideNumber}>1 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide02 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Data infrastructure has become standard.</Text>
      <Text style={styles.headlineAccent}>Financial Awareness will be the next default infrastructure.</Text>
      <Text style={{ ...styles.body, textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
        Data tells you what happened.{'\n'}
        Financial Awareness tells you if you are safe — right now.
      </Text>
      <View style={styles.highlight}>
        <Text style={{ ...styles.highlightText, color: '#94a3b8' }}>The company with the most data will not win.</Text>
        <Text style={{ ...styles.highlightText, color: '#fbbf24', fontWeight: 'bold', marginTop: 4 }}>The company with the earliest awareness will.</Text>
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
          <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>Systems of Record</Text> captured the past.
        </Text>
        <Text style={{ ...styles.body, fontSize: 18, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>Systems of Intelligence</Text> explained the past.
        </Text>
        <Text style={{ ...styles.body, fontSize: 18, color: '#ffffff', textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#60a5fa' }}>Systems of Awareness</Text> decide what happens next.
        </Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontSize: 16, marginTop: 16 }}>
        Bluecore is building the <Text style={{ color: '#60a5fa', fontWeight: 'bold' }}>Awareness Layer.</Text>
      </Text>
      <View style={{ ...styles.highlight, marginTop: 24 }}>
        <Text style={{ ...styles.highlightText, color: '#64748b' }}>Operating without financial awareness</Text>
        <Text style={{ ...styles.highlightText, color: '#fbbf24', fontWeight: 'bold', marginTop: 4 }}>will soon feel as risky as operating without accounting.</Text>
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
      <Text style={styles.headline}>Financial Awareness Is</Text>
      <Text style={styles.headlineAmber}>Not Optional Anymore.</Text>
      <Text style={{ ...styles.body, textAlign: 'center', marginBottom: 16 }}>Every structural force in commerce is compressing decision time:</Text>
      <View style={{ marginVertical: 12 }}>
        {[
          'Margin compression is structural, not cyclical',
          'CAC volatility destroys forecast reliability',
          'Multi-channel revenue fragments financial truth',
          'Real-time payments accelerate cash risk',
          'Operators move faster than finance can close books'
        ].map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bullet}>→</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.highlight}>
        <Text style={styles.highlightText}>The market is not asking for better reports.</Text>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', marginTop: 4 }}>It is demanding real-time financial awareness.</Text>
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
      <Text style={styles.tag}>Introducing</Text>
      <Text style={styles.headline}>Financial Decision</Text>
      <Text style={styles.headlineAccent}>Infrastructure.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>unifies financial reality</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>models operational exposure</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>detects risk in real time</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>guides leadership action</Text></View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center' }}>Not dashboards. Not analytics. Infrastructure.</Text>
    </View>
    <Text style={styles.slideNumber}>5 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 6 — ARCHITECTURE MOAT
const Slide06 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>This Is Not Software.</Text>
      <Text style={styles.headlineAccent}>This Is Financial Infrastructure.</Text>
      <View style={{ marginVertical: 12 }}>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Fragmented Financial Signals</Text>
          <Text style={styles.architectureSub}>(POS / Marketplaces / Payments / ERP)</Text>
        </View>
        <Text style={styles.arrow}>↓ normalize</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Financial Semantics Layer</Text>
          <Text style={styles.architectureSub}>(one language of margin, cash, liability)</Text>
        </View>
        <Text style={styles.arrow}>↓ reconcile</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Truth Engine</Text>
          <Text style={styles.architectureSub}>(cross-channel verification)</Text>
        </View>
        <Text style={styles.arrow}>↓ compute</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Decision Dataset</Text>
          <Text style={styles.architectureSub}>(patterns extracted from operations)</Text>
        </View>
        <Text style={styles.arrow}>↓ activate</Text>
        <View style={styles.architectureLayer}>
          <Text style={styles.architectureText}>Executive Awareness Layer</Text>
          <Text style={styles.architectureSub}>(real-time survivability signals)</Text>
        </View>
      </View>
      <Text style={styles.punchline}>Most companies build dashboards.{'\n'}We built the financial truth layer those dashboards depend on.</Text>
    </View>
    <Text style={styles.slideNumber}>6 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// NEW SLIDE 7 — DECISION DATASET
const Slide07 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>The Moat That</Text>
      <Text style={styles.headlineEmerald}>Compounds.</Text>
      <Text style={{ ...styles.body, textAlign: 'center' }}>Every decision strengthens the system.</Text>
      <View style={styles.gridContainer}>
        {[
          'Financial language becomes standardized',
          'Decision patterns become structured',
          'Risk signatures become predictable',
          'Operational responses become measurable'
        ].map((item, i) => (
          <View key={i} style={{ ...styles.gridItem, backgroundColor: '#064e3b' }}>
            <Text style={{ ...styles.gridBody, color: '#6ee7b7' }}>✓ {item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Proprietary decision dataset:</Text>
        <Text style={{ ...styles.diagramText, color: '#34d399' }}>what was detected → what decision was made → what outcome followed</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontWeight: 'bold' }}>Software scales. Decision intelligence compounds.</Text>
    </View>
    <Text style={styles.slideNumber}>7 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 8 — Why Impossible Before
const Slide08 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Only Now Is Decision Infrastructure</Text>
      <Text style={styles.headlineEmerald}>Technically Feasible.</Text>
      <View style={styles.gridContainer}>
        {['API-first commerce ecosystems', 'Payment digitization', 'Warehouse maturity', 'Real-time data pipelines'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Financial signals are finally connectable.</Text>
    </View>
    <Text style={styles.slideNumber}>8 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 9 — Why Mandatory
const Slide09 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Decision Speed Is Becoming</Text>
      <Text style={styles.headlineAccent}>a Competitive Advantage.</Text>
      <View style={{ marginVertical: 16 }}>
        <Text style={styles.body}>• Margin compression.</Text>
        <Text style={styles.body}>• Capital is expensive.</Text>
        <Text style={styles.body}>• Operational volatility is rising.</Text>
      </View>
      <Text style={styles.punchline}>Soon, operating without real-time financial awareness{'\n'}will feel like operating without accounting.</Text>
    </View>
    <Text style={styles.slideNumber}>9 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 10 — Product One Sentence
const Slide10 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>A Single Financial Reality —</Text>
      <Text style={styles.headlineAccent}>Trusted in Real Time.</Text>
      <Text style={styles.subheadline}>When leadership trusts the system, it becomes operational infrastructure.</Text>
      <View style={styles.gridContainer}>
        {[{ role: 'CFO', focus: 'Cash Exposure' }, { role: 'COO', focus: 'Operational Leakage' }, { role: 'CEO', focus: 'Margin Risk' }].map((item, i) => (
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
      <Text style={styles.headline}>When Financial Awareness Becomes</Text>
      <Text style={styles.headlineEmerald}>Mission-Critical.</Text>
      <View style={styles.gridContainer}>
        {[
          { label: 'Retention', value: '95%+' },
          { label: 'Usage', value: 'Daily' },
          { label: 'Dependency', value: 'Executive' },
          { label: 'Expansion', value: 'Continuous' }
        ].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.body, textAlign: 'center' }}>CEOs don't open Bluecore monthly. They open it daily.</Text>
      <Text style={styles.punchline}>Companies don't replace systems they trust to tell them the truth.</Text>
    </View>
    <Text style={styles.slideNumber}>11 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 12 — Architecture Advantage
const Slide12 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Financial Truth Is an</Text>
      <Text style={styles.headlineAmber}>Architecture Problem.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Sources</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Semantic normalization</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Reconciliation</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Decision dataset</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.diagramText}>Alerts</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontStyle: 'italic' }}>This is not assembled software. It is engineered infrastructure.</Text>
    </View>
    <Text style={styles.slideNumber}>12 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 13 — Switching Cost
const Slide13 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Companies Do Not Replace Systems</Text>
      <Text style={styles.headlineAccent}>They Trust to Tell the Truth.</Text>
      <View style={styles.highlight}>
        <Text style={{ ...styles.highlightText, fontSize: 16 }}>Trust compounds.</Text>
        <Text style={{ ...styles.highlightText, marginTop: 8 }}>Once embedded in decision workflows,{'\n'}replacement risk drops dramatically.</Text>
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
      <Text style={styles.headline}>Proven Beyond</Text>
      <Text style={styles.headlineAccent}>Our Home Market.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.metricLabel}>Built in</Text>
          <Text style={{ ...styles.gridTitle, fontSize: 18 }}>Vietnam</Text>
        </View>
        <View style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
          <Text style={styles.metricLabel}>Deployed in</Text>
          <Text style={{ ...styles.gridTitle, fontSize: 18 }}>Thailand</Text>
          <Text style={{ ...styles.gridBody, marginTop: 4 }}>Leading retail operator</Text>
          <Text style={{ ...styles.metricValue, fontSize: 14, marginTop: 4 }}>~$3K MRR</Text>
        </View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontStyle: 'italic' }}>Thailand is now a validated second beachhead.</Text>
    </View>
    <Text style={styles.slideNumber}>14 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 15 — Architecture Travels
const Slide15 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Financial Complexity Is Structurally Similar</Text>
      <Text style={styles.headlineAccent}>Across Southeast Asia.</Text>
      <View style={styles.gridContainer}>
        {['Multi-channel fragmentation', 'Cash pressure', 'Inventory exposure', 'Marketing volatility'].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.gridBody}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Bluecore scales with minimal localization.</Text>
    </View>
    <Text style={styles.slideNumber}>15 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 16 — Initial Wedge
const Slide16 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>We Start with</Text>
      <Text style={styles.headlineAccent}>Margin-Sensitive Commerce Operators.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Mid-market retailers & ecommerce companies</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Revenue: $2M–$50M</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>High operational complexity</Text></View>
        <View style={styles.listItem}><Text style={styles.bullet}>→</Text><Text style={styles.listText}>Decision-sensitive economics</Text></View>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontStyle: 'italic' }}>These companies feel decision latency first.</Text>
    </View>
    <Text style={styles.slideNumber}>16 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 17 — SEA Market
const Slide17 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>A $1B+ Wedge</Text>
      <Text style={styles.headlineAccent}>Across Southeast Asia.</Text>
      <View style={styles.gridContainer}>
        {[{ country: 'Vietnam', range: '$150–250M' }, { country: 'Thailand', range: '$350–500M' }, { country: 'Indonesia', range: '$900M–1.6B' }].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.metricLabel}>{item.country}</Text>
            <Text style={styles.gridTitle}>{item.range}</Text>
          </View>
        ))}
      </View>
      <View style={{ ...styles.highlight, marginTop: 16 }}>
        <Text style={{ ...styles.highlightText, color: '#34d399' }}>Combined wedge: $1.4B–$2.3B</Text>
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
      <Text style={styles.headline}>Expansion Unlocks a</Text>
      <Text style={styles.headlineAccent}>Multi-Billion Category.</Text>
      <Text style={styles.subheadline}>After commerce: Consumer brands, Distribution, Pharmacy chains, F&B groups</Text>
      <Text style={styles.body}>Decision infrastructure becomes horizontal.</Text>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Category potential exceeds $5B in Southeast Asia alone.</Text>
    </View>
    <Text style={styles.slideNumber}>18 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 19 — Regional Expansion
const Slide19 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Built in Vietnam.</Text>
      <Text style={styles.headlineAccent}>Scaling Across Southeast Asia.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Vietnam → Primary build market</Text>
        <Text style={{ ...styles.diagramText, color: '#60a5fa' }}>Thailand → Second beachhead (live revenue)</Text>
        <Text style={{ ...styles.diagramText, color: '#34d399' }}>Indonesia → Category-scale expansion</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', fontStyle: 'italic' }}>Expansion is deliberate — not opportunistic.</Text>
    </View>
    <Text style={styles.slideNumber}>19 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 20 — Why Bluecore Wins
const Slide20 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Built the Financial Truth Layer</Text>
      <Text style={styles.headlineAccent}>Before the Category Existed.</Text>
      <View style={styles.gridContainer}>
        {['3+ years warehouse maturity', '~99.8% data accuracy', 'Deep financial semantics'].map((item, i) => (
          <View key={i} style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
            <Text style={{ ...styles.gridBody, color: '#93c5fd' }}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.body}>Most companies start with dashboards.</Text>
      <Text style={{ ...styles.body, color: '#ffffff', fontWeight: 'bold' }}>We started with truth.</Text>
    </View>
    <Text style={styles.slideNumber}>20 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// Slide 21 — Inevitability Vision
const Slide21 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>ERP Became Mandatory.</Text>
      <Text style={styles.headlineAccent}>Decision Infrastructure Will Too.</Text>
      <Text style={styles.subheadline}>
        Soon, companies will not debate{'\n'}
        whether they need financial decision systems.{'\n'}
        Only which one they trust.
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
        <Text style={{ ...styles.highlightText, fontSize: 18 }}>We Are Not Building Software.</Text>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', fontSize: 22, marginTop: 12 }}>
          We Are Building the System{'\n'}Companies Rely on to Survive.
        </Text>
      </View>
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ ...styles.headlineAccent, fontSize: 20 }}>BLUECORE</Text>
        <Text style={{ ...styles.body, color: '#64748b', fontSize: 10 }}>Financial Decision Infrastructure</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>22 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const VCPitchDeckPDF: React.FC = () => (
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

export default VCPitchDeckPDF;
