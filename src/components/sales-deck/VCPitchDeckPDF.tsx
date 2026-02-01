/**
 * VC Pitch Deck PDF - English Version
 * 
 * 12-slide Series A presentation for international VCs
 * Focus on Category Claim: Financial Awareness Layer
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a', // slate-900
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.2,
  },
  headlineAccent: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#60a5fa', // blue-400
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.2,
  },
  subheadline: {
    fontSize: 18,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 1.6,
  },
  body: {
    fontSize: 14,
    color: '#cbd5e1', // slate-300
    lineHeight: 1.8,
    marginBottom: 16,
  },
  punchline: {
    fontSize: 16,
    color: '#60a5fa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 32,
    paddingLeft: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  diagramBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 24,
    marginVertical: 16,
  },
  diagramText: {
    fontSize: 12,
    color: '#e2e8f0',
    textAlign: 'center',
    marginVertical: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#60a5fa',
    textAlign: 'center',
    marginVertical: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  gridBody: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 12,
    color: '#60a5fa',
    marginRight: 8,
  },
  listText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
    lineHeight: 1.5,
  },
  moatLayer: {
    backgroundColor: '#1e293b',
    borderRadius: 4,
    padding: 12,
    marginVertical: 4,
  },
  moatNumber: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  moatText: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  highlight: {
    backgroundColor: '#1e3a5f',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  highlightText: {
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    fontSize: 10,
    color: '#475569',
  },
});

// Slide Components
const Slide01 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headlineAccent}>The Financial Awareness Layer</Text>
      <Text style={styles.headline}>for Modern Commerce.</Text>
      <Text style={styles.subheadline}>
        Every company runs on systems of record.{'\n'}
        The next generation will run on systems of awareness.
      </Text>
    </View>
    <Text style={styles.slideNumber}>1 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide02 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Companies Don't Fail From Lack of Data.</Text>
      <Text style={styles.headlineAccent}>They Fail From Delayed Financial Truth.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Old World</Text>
          <Text style={styles.gridBody}>• Monthly close{'\n'}• Quarterly review{'\n'}• Reactive decisions</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>New World</Text>
          <Text style={styles.gridBody}>• Compressed margins{'\n'}• Volatile demand{'\n'}• Rising CAC</Text>
        </View>
      </View>
      <Text style={styles.punchline}>Decision latency = Existential risk.</Text>
    </View>
    <Text style={styles.slideNumber}>2 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide03 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>The Modern Data Stack Was Not Built</Text>
      <Text style={styles.headlineAccent}>for Decision Makers.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>ERP → CRM → BI → Analytics</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Operators & Analysts</Text>
        <Text style={{ ...styles.arrow, marginTop: 16 }}>═══════════════════════</Text>
        <Text style={{ ...styles.highlightText, marginTop: 8 }}>MISSING LAYER: EXECUTIVE AWARENESS</Text>
      </View>
      <Text style={styles.punchline}>
        Leadership teams still operate without a system designed to answer:{'\n'}
        "Are we financially safe right now?"
      </Text>
    </View>
    <Text style={styles.slideNumber}>3 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide04 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Bluecore is the</Text>
      <Text style={styles.headlineAccent}>Financial Decision OS.</Text>
      <View style={styles.highlight}>
        <Text style={styles.highlightText}>
          A system that converts fragmented financial signals{'\n'}
          into real-time executive awareness —{'\n'}
          enabling faster, safer decisions.
        </Text>
      </View>
      <Text style={styles.punchline}>
        Financial awareness is not a feature.{'\n'}
        It is an architectural layer.
      </Text>
    </View>
    <Text style={styles.slideNumber}>4 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide05 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>The Awareness Era</Text>
      <Text style={styles.headlineAccent}>Has Begun.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>1. Data is Accessible</Text>
          <Text style={styles.gridBody}>APIs, marketplaces, payments — financial data is finally connected</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>2. Windows Collapsing</Text>
          <Text style={styles.gridBody}>Decision windows are weeks, not quarters</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>3. Zero Margin for Error</Text>
          <Text style={styles.gridBody}>The margin for error is disappearing</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        The winners of the next decade will not be data-rich.{'\n'}
        They will be awareness-rich.
      </Text>
    </View>
    <Text style={styles.slideNumber}>5 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide06 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>The Control Layer</Text>
      <Text style={styles.headlineAccent}>for Financial Reality.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Data Sources</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Unified Financial Truth</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Decision Engine</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Executive Alerts</Text>
      </View>
      <Text style={{ ...styles.body, textAlign: 'center', marginTop: 16, color: '#94a3b8' }}>
        Series A = Architecture Story, Not UI Demo
      </Text>
    </View>
    <Text style={styles.slideNumber}>6 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide07 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Financial Awareness Is a</Text>
      <Text style={styles.headlineAccent}>Deep Systems Problem.</Text>
      <View style={{ marginVertical: 24 }}>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Financial semantics across platforms</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Reconciliation logic at scale</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Profit normalization across channels</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>→</Text>
          <Text style={styles.listText}>Decision modeling for executives</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        This is not software you assemble.{'\n'}
        It is software you architect.
      </Text>
    </View>
    <Text style={styles.slideNumber}>7 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide08 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Once Leadership Trusts the System —</Text>
      <Text style={styles.headlineAccent}>It Becomes Mission Critical.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Retention</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>95%+</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Usage Depth</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>Daily</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Decision Reliance</Text>
          <Text style={{ ...styles.gridBody, fontSize: 24, color: '#34d399' }}>Primary</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        CEOs open Bluecore daily.{'\n'}
        Not monthly.
      </Text>
    </View>
    <Text style={styles.slideNumber}>8 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide09 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Every Margin-Sensitive Company</Text>
      <Text style={styles.headlineAccent}>Will Need a Financial Awareness Layer.</Text>
      <View style={styles.diagramBox}>
        <Text style={styles.diagramText}>Start Narrow: Retail / Ecommerce</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Expand: Multi-brand · Consumer · Marketplaces</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.diagramText}>Mid-market: All Margin-Sensitive Companies</Text>
      </View>
      <Text style={styles.punchline}>
        We are entering a horizontal control-layer market —{'\n'}
        starting with a vertical wedge.
      </Text>
    </View>
    <Text style={styles.slideNumber}>9 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide10 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Awareness</Text>
      <Text style={styles.headlineAccent}>Compounds.</Text>
      <View style={{ marginVertical: 16 }}>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>1. Semantic Standard</Text>
          <Text style={styles.moatText}>Unified financial language across systems</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>2. Decision Dataset</Text>
          <Text style={styles.moatText}>Proprietary patterns from executive decisions</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>3. Organizational Trust</Text>
          <Text style={styles.moatText}>Leadership confidence built over time</Text>
        </View>
        <View style={styles.moatLayer}>
          <Text style={styles.moatNumber}>4. Executive Workflow Lock-in</Text>
          <Text style={styles.moatText}>Daily habits are hard to break</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Companies don't switch the system{'\n'}
        they trust to tell them the truth.
      </Text>
    </View>
    <Text style={styles.slideNumber}>10 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide11 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>We Believe Financial Awareness</Text>
      <Text style={styles.headlineAccent}>Will Become Default Infrastructure.</Text>
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridTitle}>Today</Text>
          <Text style={styles.gridBody}>ERP is required</Text>
        </View>
        <View style={{ ...styles.gridItem, backgroundColor: '#1e3a5f' }}>
          <Text style={styles.gridTitle}>Tomorrow</Text>
          <Text style={{ ...styles.gridBody, color: '#93c5fd' }}>Awareness is required</Text>
        </View>
      </View>
      <Text style={styles.punchline}>
        Running a company without financial awareness{'\n'}
        will soon feel as reckless as running one without accounting.
      </Text>
    </View>
    <Text style={styles.slideNumber}>11 / 12</Text>
    <Text style={styles.footer}>BLUECORE · VC Pitch Deck</Text>
  </Page>
);

const Slide12 = () => (
  <Page size="A4" orientation="landscape" style={styles.page}>
    <View>
      <Text style={styles.headline}>Bluecore Is Building the</Text>
      <Text style={styles.headlineAccent}>Financial Control Plane for Commerce.</Text>
      <View style={{ marginVertical: 24 }}>
        <Text style={{ ...styles.body, textAlign: 'center' }}>When Bluecore wins:</Text>
        <View style={{ marginTop: 16 }}>
          <Text style={{ ...styles.diagramText }}>CEOs run mornings on it</Text>
          <Text style={{ ...styles.diagramText }}>Boards trust it</Text>
          <Text style={{ ...styles.diagramText }}>Operators align to it</Text>
        </View>
      </View>
      <View style={{ ...styles.highlight, marginTop: 32 }}>
        <Text style={{ ...styles.highlightText, fontWeight: 'bold', fontSize: 16 }}>
          We are not building a tool.{'\n'}
          We are building the system companies rely on to stay alive.
        </Text>
      </View>
    </View>
    <Text style={styles.slideNumber}>12 / 12</Text>
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
  </Document>
);

export default VCPitchDeckPDF;
