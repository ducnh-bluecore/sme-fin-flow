/**
 * VC Pitch Deck PDF - English Version
 * 
 * 18-slide Series A presentation for international VCs
 * Focus on Category Claim: Financial Decision Infrastructure
 * Structure: 7 Acts
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    padding: 60,
    justifyContent: 'center',
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
});

const TOTAL_SLIDES = 18;

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
      <Text style={styles.headline}>Companies Rarely Fail from Lack of Data.</Text>
      <Text style={styles.headlineAmber}>They Fail from Delayed Financial Truth.</Text>
      <Text style={styles.subheadline}>Modern stacks optimized for: Recording, Reporting, Analyzing.{'\n'}Not deciding.</Text>
      <Text style={{ ...styles.body, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
        Leadership is forced to operate reactively.
      </Text>
    </View>
    <Text style={styles.slideNumber}>2 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide03 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>System of Record → System of Decision</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>ERP → records the past</Text>
        <Text style={styles.diagramText}>BI → explains the past</Text>
        <Text style={{ ...styles.diagramText, color: '#60a5fa', fontWeight: 'bold', marginTop: 8 }}>Bluecore → drives the next move</Text>
      </View>
      <Text style={styles.punchline}>A new execution layer is emerging inside modern companies.</Text>
    </View>
    <Text style={styles.slideNumber}>3 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide04 = () => (
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
    <Text style={styles.slideNumber}>4 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 2 — WHY NOW
const Slide05 = () => (
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
    <Text style={styles.slideNumber}>5 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide06 = () => (
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
    <Text style={styles.slideNumber}>6 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 3 — THE PRODUCT
const Slide07 = () => (
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
    <Text style={styles.slideNumber}>7 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide08 = () => (
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
    <Text style={styles.slideNumber}>8 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide09 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Companies Do Not Replace Systems</Text>
      <Text style={styles.headlineAccent}>They Trust to Tell the Truth.</Text>
      <View style={styles.highlight}>
        <Text style={{ ...styles.highlightText, fontSize: 16 }}>Trust compounds.</Text>
        <Text style={{ ...styles.highlightText, marginTop: 8 }}>Once embedded in decision workflows,{'\n'}replacement risk drops dramatically.</Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>9 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 4 — TRACTION
const Slide10 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Already Becoming</Text>
      <Text style={styles.headlineEmerald}>Operationally Essential.</Text>
      <View style={styles.gridContainer}>
        {[{ label: 'ARR', value: '~$200K' }, { label: 'Retention', value: '90-95%' }, { label: 'Usage', value: 'Daily' }, { label: 'Workflows', value: 'Finance-dep.' }].map((item, i) => (
          <View key={i} style={styles.gridItem}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.punchline}>Executives open Bluecore daily — not monthly.{'\n'}That is infrastructure behavior.</Text>
    </View>
    <Text style={styles.slideNumber}>10 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide11 = () => (
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
    <Text style={styles.slideNumber}>11 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide12 = () => (
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
    <Text style={styles.slideNumber}>12 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 5 — MARKET
const Slide13 = () => (
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
    <Text style={styles.slideNumber}>13 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide14 = () => (
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
    <Text style={styles.slideNumber}>14 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide15 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Expansion Unlocks a</Text>
      <Text style={styles.headlineAccent}>Multi-Billion Category.</Text>
      <Text style={styles.subheadline}>After commerce: Consumer brands, Distribution, Pharmacy chains, F&B groups</Text>
      <Text style={styles.body}>Decision infrastructure becomes horizontal.</Text>
      <Text style={{ ...styles.highlightText, color: '#34d399', marginTop: 16 }}>Category potential exceeds $5B in Southeast Asia alone.</Text>
    </View>
    <Text style={styles.slideNumber}>15 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 6 — STRATEGY
const Slide16 = () => (
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
    <Text style={styles.slideNumber}>16 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide17 = () => (
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
    <Text style={styles.slideNumber}>17 / {TOTAL_SLIDES}</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

// ACT 7 — VISION
const Slide18 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>ERP Became Mandatory.</Text>
      <Text style={styles.headlineAccent}>Decision Infrastructure Will Too.</Text>
      <Text style={styles.subheadline}>
        Soon, companies will not debate{'\n'}
        whether they need financial decision systems.{'\n'}
        Only which one they trust.
      </Text>
      <View style={{ ...styles.highlight, marginTop: 24 }}>
        <Text style={{ ...styles.highlightText, fontSize: 14 }}>We Are Not Building Software.</Text>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', fontSize: 16, marginTop: 8 }}>
          We Are Building the System Companies Rely on to Survive.
        </Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>18 / {TOTAL_SLIDES}</Text>
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
  </Document>
);

export default VCPitchDeckPDF;
