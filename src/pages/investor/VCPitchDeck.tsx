/**
 * VC Pitch Deck - English Version
 * 
 * 22-slide interactive presentation for Series A investors
 * Focus: Category claim - Financial Decision Infrastructure
 * Structure: 7 Acts - Psychological sequence addressing investor risks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  MessageSquareText,
  Globe,
  X,
  FileDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sanitizePdfElement, sanitizePdfElementHard } from '@/components/sales-deck/pdfStyleSanitizer';
import VCPitchDeckPDF from '@/components/sales-deck/VCPitchDeckPDF';

// Presenter notes for each slide (22 slides)
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: {
    tip: "Partner immediately senses systemic problem, not feature gap. Good startups fix problems. Great startups fix structural shifts.",
    action: "Pause. Let it land. Sound inevitable, not excited."
  },
  2: {
    tip: "This is ELITE positioning. Keep this slide. It frames everything.",
    action: "Partner thinks: 'This sounds big.'"
  },
  3: {
    tip: "This is the slide where category is born. Do NOT clutter it.",
    action: "Show the shift: Record → Decision. Simple."
  },
  4: {
    tip: "This slide removes 'too early' risk. Every structural force in commerce is compressing decision time.",
    action: "Pause. Let macro shift land. Partner thinks: 'This is a wave, not a feature.'"
  },
  5: {
    tip: "Infrastructure = big outcomes. Not dashboards. Not analytics.",
    action: "Let the definition sink in. Don't over-explain."
  },
  6: {
    tip: "Most companies build dashboards. We built the financial truth layer those dashboards depend on.",
    action: "Show the 5-layer architecture. Removes 'AI wrapper' fear."
  },
  7: {
    tip: "Software scales. Decision intelligence compounds. This is where you shift from software company to data compounding company.",
    action: "Removes commoditization fear. Partner thinks: 'Category leader potential.'"
  },
  8: {
    tip: "Most founders underplay timing. Do NOT. Timing sells companies.",
    action: "Financial signals are finally connectable."
  },
  9: {
    tip: "This is your 'macro shift' slide. VCs invest in shifts, not tools.",
    action: "Kill line: Operating without real-time awareness = operating without accounting."
  },
  10: {
    tip: "Infra founders oversell features — mistake. Keep this TIGHT.",
    action: "Show 3 roles only: CFO, COO, CEO. No UI screenshots."
  },
  11: {
    tip: "CEOs don't open Bluecore monthly. They open it daily. Companies don't replace systems they trust.",
    action: "This is where you stop sounding smart and start sounding fundable."
  },
  12: {
    tip: "This is not assembled software. It is engineered infrastructure.",
    action: "Partner thought: Hard to replicate. Good."
  },
  13: {
    tip: "Infra investors LOVE this slide. Trust compounds.",
    action: "Companies don't replace systems they trust."
  },
  14: {
    tip: "This slide massively reduces risk perception.",
    action: "Thailand is now a validated second beachhead — not a future bet."
  },
  15: {
    tip: "Repeatable deployment. Very investable signal.",
    action: "Bluecore scales with minimal localization."
  },
  16: {
    tip: "No inflated TAM. Partners smell fake numbers instantly.",
    action: "Start with margin-sensitive operators who feel decision latency first."
  },
  17: {
    tip: "No hype needed. Numbers already strong.",
    action: "Show the combined wedge: $1.4B-$2.3B"
  },
  18: {
    tip: "After commerce: consumer brands, distribution, pharmacy, F&B.",
    action: "Partner now sees venture scale."
  },
  19: {
    tip: "Many decks forget this. Partners invest in execution clarity.",
    action: "Expansion is deliberate — not opportunistic."
  },
  20: {
    tip: "3+ years warehouse maturity. ~99.8% data accuracy.",
    action: "Founder signal becomes VERY strong here."
  },
  21: {
    tip: "Never skip this in infra decks. Sound calm — almost obvious.",
    action: "Let the inevitability sink in. ERP = mandatory. Decision infra = next."
  },
  22: {
    tip: "End with conviction. This is the system companies rely on to survive.",
    action: "End deck. Let silence work. Do NOT add fluff."
  }
};

// ACT 1 — OPEN THE CATEGORY (Slides 1–3)
const Slide01CategoryShock: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-10 leading-tight"
    >
      CASH COLLAPSES<br />
      <span className="text-red-500">QUIETLY.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full"
    >
      {[
        { metric: "Margin erodes 6%.", consequence: "Detected week 4." },
        { metric: "CAC spikes 35%.", consequence: "Visible after burn." },
        { metric: "Inventory expands.", consequence: "Liquidity disappears." },
        { metric: "Runway shrinks.", consequence: "CEO sees it last." }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-left"
        >
          <span className="text-red-400 font-bold text-lg block">{item.metric}</span>
          <span className="text-slate-500 text-sm">{item.consequence}</span>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

const Slide02SilentFailure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Companies Rarely Fail from Lack of Data.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-400 mb-12"
    >
      They Fail from Delayed Financial Truth.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-2xl"
    >
      <p className="text-xl text-slate-300 mb-6">Modern stacks optimized for:</p>
      <div className="flex justify-center gap-4 mb-8">
        {["Recording", "Reporting", "Analyzing"].map((item, i) => (
          <span key={i} className="px-4 py-2 bg-slate-800 rounded-lg text-slate-400">{item}</span>
        ))}
      </div>
      <p className="text-xl text-slate-400">
        Not <span className="text-white font-medium">deciding.</span>
      </p>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Leadership is forced to operate reactively.
    </motion.p>
  </div>
);

const Slide03PlatformShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-12"
    >
      System of Record → <span className="text-blue-400">System of Decision</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-4 max-w-lg w-full"
    >
      {[
        { label: "ERP", desc: "records the past", color: "slate" },
        { label: "BI", desc: "explains the past", color: "slate" },
        { label: "Bluecore", desc: "drives the next move", color: "blue" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg",
            item.color === "slate" && "bg-slate-800/50 border border-slate-700",
            item.color === "blue" && "bg-blue-500/20 border border-blue-500/40"
          )}
        >
          <span className={cn(
            "font-bold text-xl",
            item.color === "slate" ? "text-slate-300" : "text-blue-400"
          )}>{item.label}</span>
          <span className={cn(
            "text-lg",
            item.color === "slate" ? "text-slate-500" : "text-blue-300"
          )}>{item.desc}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      A new execution layer is emerging inside modern companies.
    </motion.p>
  </div>
);

// NEW SLIDE 4 — INEVITABILITY (Market timing risk)
const Slide04Inevitability: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
    >
      Financial Awareness Is<br />
      <span className="text-amber-400">Not Optional Anymore.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-xl text-slate-300 mb-8 max-w-2xl"
    >
      Every structural force in commerce is compressing decision time:
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full mb-10"
    >
      {[
        "Margin compression is structural, not cyclical",
        "CAC volatility destroys forecast reliability",
        "Multi-channel revenue fragments financial truth",
        "Real-time payments accelerate cash risk",
        "Operators move faster than finance can close books"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-left"
        >
          <span className="text-amber-400 text-lg">→</span>
          <span className="text-slate-300 text-sm">{item}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/30 max-w-2xl"
    >
      <p className="text-lg text-slate-300 italic">
        The market is not asking for better reports.<br />
        <span className="text-white font-medium">It is demanding real-time financial awareness.</span>
      </p>
    </motion.div>
  </div>
);

// Slide 5 — Define Category (was 4)
const Slide05DefineCategory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6"
    >
      <span className="text-blue-400 text-xl font-medium tracking-wider uppercase">Introducing</span>
    </motion.div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-10"
    >
      Financial Decision<br />
      <span className="text-blue-400">Infrastructure.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="max-w-2xl text-left mb-8"
    >
      <p className="text-lg text-slate-300 mb-4">A new operational layer that:</p>
      <ul className="space-y-2 text-slate-400">
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> unifies financial reality</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> models operational exposure</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> detects risk in real time</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> guides leadership action</li>
      </ul>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-xl text-slate-500"
    >
      Not dashboards. Not analytics. <span className="text-white font-medium">Infrastructure.</span>
    </motion.p>
  </div>
);

// NEW SLIDE 6 — ARCHITECTURE MOAT (Build risk)
const Slide06ArchitectureMoat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      This Is Not Software.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-10"
    >
      This Is Financial Infrastructure.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-2 max-w-xl w-full mb-8"
    >
      {[
        { layer: "Fragmented Financial Signals", sub: "(POS / Marketplaces / Payments / ERP)", action: "normalize" },
        { layer: "Financial Semantics Layer", sub: "(one language of margin, cash, liability)", action: "reconcile" },
        { layer: "Truth Engine", sub: "(cross-channel verification)", action: "compute" },
        { layer: "Decision Dataset", sub: "(patterns extracted from operations)", action: "activate" },
        { layer: "Executive Awareness Layer", sub: "(real-time survivability signals)", action: null }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="p-3 rounded-lg bg-slate-800/50 border border-blue-500/30"
          >
            <div className="text-white font-medium text-sm">{item.layer}</div>
            <div className="text-slate-500 text-xs">{item.sub}</div>
          </motion.div>
          {item.action && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 + i * 0.1 }}
              className="text-blue-400 text-sm"
            >
              ↓ {item.action}
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-lg text-slate-300 italic border-l-4 border-blue-500 pl-6"
    >
      Most companies build dashboards.<br />
      <span className="text-white font-medium">We built the financial truth layer those dashboards depend on.</span>
    </motion.p>
  </div>
);

// NEW SLIDE 7 — DECISION DATASET (Moat/commoditization risk)
const Slide07DecisionDataset: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
    >
      The Moat That<br />
      <span className="text-emerald-400">Compounds.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-xl text-slate-300 mb-8"
    >
      Every decision strengthens the system.
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full mb-8"
    >
      {[
        "Financial language becomes standardized",
        "Decision patterns become structured",
        "Risk signatures become predictable",
        "Operational responses become measurable"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
          className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-left"
        >
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-slate-300">{item}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 max-w-xl mb-6"
    >
      <p className="text-slate-400 text-sm mb-2">This creates a proprietary decision dataset:</p>
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-emerald-400">what was detected</span>
        <span className="text-slate-500">→</span>
        <span className="text-blue-400">what decision was made</span>
        <span className="text-slate-500">→</span>
        <span className="text-amber-400">what outcome followed</span>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="text-xl text-slate-300"
    >
      Software scales. <span className="text-white font-medium">Decision intelligence compounds.</span>
    </motion.p>
  </div>
);

// Slide 8 — Why Impossible Before (was 5)
const Slide08WhyImpossibleBefore: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Only Now Is Decision Infrastructure
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Technically Feasible.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full"
    >
      {[
        "API-first commerce ecosystems",
        "Payment digitization",
        "Warehouse maturity",
        "Real-time data pipelines"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30 text-slate-300"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-emerald-400 font-medium"
    >
      Financial signals are finally connectable.
    </motion.p>
  </div>
);

// Slide 9 — Why Mandatory (was 6)
const Slide09WhyMandatory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Decision Speed Is Becoming
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      a Competitive Advantage.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-3 max-w-lg mb-10"
    >
      {[
        "Margin compression.",
        "Capital is expensive.",
        "Operational volatility is rising."
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="text-xl text-slate-300"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-lg text-slate-400 mb-10"
    >
      Companies can no longer wait for month-end truth.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-xl text-slate-300 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Soon, operating without real-time financial awareness<br />
      <span className="text-white font-medium">will feel like operating without accounting.</span>
    </motion.p>
  </div>
);

// Slide 10 — Product One Sentence (was 7)
const Slide10ProductOneSentence: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
    >
      A Single Financial Reality —<br />
      <span className="text-blue-400">Trusted in Real Time.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-xl text-slate-300 mb-10"
    >
      When leadership trusts the system, it becomes operational infrastructure.
    </motion.p>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
    >
      {[
        { role: "CFO", focus: "Cash Exposure" },
        { role: "COO", focus: "Operational Leakage" },
        { role: "CEO", focus: "Margin Risk" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-blue-500/30"
        >
          <div className="text-blue-400 text-2xl font-bold mb-2">{item.role}</div>
          <div className="text-slate-300">{item.focus}</div>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

// NEW SLIDE 11 — VELOCITY (Execution risk)
const Slide11Velocity: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      When Financial Awareness Becomes
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Mission-Critical.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        { label: "Retention", value: "95%+" },
        { label: "Usage", value: "Daily" },
        { label: "Dependency", value: "Executive" },
        { label: "Expansion", value: "Continuous" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-emerald-500/30"
        >
          <div className="text-slate-400 text-sm mb-1">{item.label}</div>
          <div className="text-emerald-400 text-2xl font-bold">{item.value}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-xl text-slate-300 mb-6"
    >
      CEOs don't open Bluecore monthly.<br />
      <span className="text-white font-medium">They open it daily.</span>
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-lg text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      Companies don't replace systems they trust to tell them the truth.
    </motion.p>
  </div>
);

// Slide 12 — Architecture Advantage (was 8)
const Slide12ArchitectureAdvantage: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Financial Truth Is an<br />
      <span className="text-amber-400">Architecture Problem.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-3 max-w-md"
    >
      {[
        "Sources",
        "Semantic normalization",
        "Reconciliation",
        "Decision dataset",
        "Alerts"
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className={cn(
              "w-full py-3 px-6 rounded-lg text-center font-medium",
              i === 0 ? "bg-slate-700 text-slate-200" :
              i === 4 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
              "bg-blue-500/20 text-blue-400 border border-blue-500/40"
            )}
          >
            {item}
          </motion.div>
          {i < 4 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-slate-500 text-xl"
            >
              →
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-10 text-lg text-slate-400 italic"
    >
      This is not assembled software. <span className="text-white">It is engineered infrastructure.</span>
    </motion.p>
  </div>
);

// Slide 13 — Switching Cost (was 9)
const Slide13SwitchingCost: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-8"
    >
      Companies Do Not Replace Systems<br />
      <span className="text-blue-400">They Trust to Tell the Truth.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 rounded-xl bg-blue-500/10 border border-blue-500/30 max-w-xl"
    >
      <p className="text-2xl text-blue-300 font-medium mb-4">Trust compounds.</p>
      <p className="text-lg text-slate-300">
        Once embedded in decision workflows,<br />
        replacement risk drops dramatically.
      </p>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Infra investors understand this.
    </motion.p>
  </div>
);

// Slide 14 — Cross-Border (was 11)
const Slide14CrossBorder: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Proven Beyond
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Our Home Market.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full mb-8"
    >
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left">
        <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Built in</div>
        <div className="text-white text-2xl font-bold">Vietnam</div>
      </div>
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/40 text-left">
        <div className="text-blue-400 text-sm uppercase tracking-wider mb-2">Deployed in</div>
        <div className="text-white text-2xl font-bold">Thailand</div>
        <div className="text-slate-400 mt-2">Leading retail operator</div>
        <div className="text-emerald-400 font-medium">~$3K MRR (~$36K ARR)</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="text-lg text-slate-300 italic"
    >
      Thailand is now a validated second beachhead —<br />
      <span className="text-white">not a future expansion bet.</span>
    </motion.p>
  </div>
);

// Slide 15 — Architecture Travels (was 12)
const Slide15ArchitectureTravels: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Financial Complexity Is Structurally Similar
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Across Southeast Asia.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        "Multi-channel fragmentation",
        "Cash pressure",
        "Inventory exposure",
        "Marketing volatility"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="text-xl text-emerald-400 font-medium"
    >
      Bluecore scales with minimal localization.
    </motion.p>
  </div>
);

// Slide 16 — Initial Wedge (was 13)
const Slide16InitialWedge: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      We Start with<br />
      <span className="text-blue-400">Margin-Sensitive Commerce Operators.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="max-w-xl text-left"
    >
      <p className="text-lg text-slate-300 mb-6">Target profile:</p>
      <ul className="space-y-3 text-slate-400">
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Mid-market retailers & ecommerce companies</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Revenue: $2M–$50M</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> High operational complexity</li>
        <li className="flex items-center gap-2"><span className="text-blue-400">→</span> Decision-sensitive economics</li>
      </ul>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      These companies feel decision latency first.
    </motion.p>
  </div>
);

// Slide 17 — SEA Market (was 14)
const Slide17SEAMarket: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      A <span className="text-emerald-400">$1B+</span> Wedge
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Across Southeast Asia.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8"
    >
      {[
        { country: "Vietnam", range: "$150–250M" },
        { country: "Thailand", range: "$350–500M" },
        { country: "Indonesia", range: "$900M–1.6B" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
        >
          <div className="text-slate-400 text-sm mb-2">{item.country}</div>
          <div className="text-white text-2xl font-bold">{item.range}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40"
    >
      <span className="text-emerald-400 font-medium">Combined wedge: $1.4B–$2.3B</span>
    </motion.div>
  </div>
);

// Slide 18 — Expansion Unlocks (was 15)
const Slide18ExpansionUnlocks: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Expansion Unlocks a
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Multi-Billion Category.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="mb-8"
    >
      <p className="text-lg text-slate-300 mb-6">After commerce:</p>
      <div className="flex flex-wrap justify-center gap-3">
        {["Consumer brands", "Distribution", "Pharmacy chains", "F&B groups"].map((item, i) => (
          <motion.span 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="px-4 py-2 bg-slate-800 rounded-lg text-slate-300"
          >
            {item}
          </motion.span>
        ))}
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-lg text-slate-400 mb-6"
    >
      Decision infrastructure becomes horizontal.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1 }}
      className="text-xl text-emerald-400 font-medium"
    >
      Category potential exceeds $5B in Southeast Asia alone.
    </motion.p>
  </div>
);

// Slide 19 — Regional Expansion (was 16)
const Slide19RegionalExpansion: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Built in Vietnam.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Scaling Across Southeast Asia.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-4 max-w-lg w-full"
    >
      {[
        { market: "Vietnam", status: "Primary build market", color: "slate" },
        { market: "Thailand", status: "Second beachhead (live revenue)", color: "blue" },
        { market: "Indonesia", status: "Category-scale expansion", color: "emerald" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg",
            item.color === "slate" && "bg-slate-800/50 border border-slate-700",
            item.color === "blue" && "bg-blue-500/20 border border-blue-500/40",
            item.color === "emerald" && "bg-emerald-500/20 border border-emerald-500/40"
          )}
        >
          <span className={cn(
            "font-bold text-xl",
            item.color === "slate" ? "text-slate-300" :
            item.color === "blue" ? "text-blue-400" : "text-emerald-400"
          )}>{item.market}</span>
          <span className={cn(
            "text-sm",
            item.color === "slate" ? "text-slate-500" :
            item.color === "blue" ? "text-blue-300" : "text-emerald-300"
          )}>{item.status}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-10 text-lg text-slate-500 italic"
    >
      Expansion is deliberate — not opportunistic.
    </motion.p>
  </div>
);

// Slide 20 — Why Bluecore Wins (was 17)
const Slide20WhyBluecoreWins: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Built the Financial Truth Layer
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Before the Category Existed.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full mb-10"
    >
      {[
        "3+ years warehouse maturity",
        "~99.8% data accuracy",
        "Deep financial semantics",
        "Reconciliation logic",
        "Multi-source ingestion"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="text-lg text-slate-400"
    >
      Most companies start with dashboards.
    </motion.p>
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-xl text-white font-medium"
    >
      We started with truth.
    </motion.p>
  </div>
);

// Slide 21 — Inevitability Vision (was 18)
const Slide21InevitabilityVision: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
    >
      ERP Became Mandatory.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-400 mb-12"
    >
      Decision Infrastructure Will Too.
    </motion.h2>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="text-xl text-slate-300 mb-12 max-w-2xl"
    >
      Soon, companies will not debate<br />
      whether they need financial decision systems.<br />
      <span className="text-white font-medium">Only which one they trust.</span>
    </motion.p>
  </div>
);

// Slide 22 — Closing
const Slide22Closing: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="p-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 max-w-3xl"
    >
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl text-slate-300 font-light mb-4"
      >
        We Are Not Building Software.
      </motion.p>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-3xl md:text-4xl text-white font-medium"
      >
        We Are Building the System<br />
        Companies Rely on to Survive.
      </motion.p>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-16"
    >
      <div className="text-blue-400 text-2xl font-bold">BLUECORE</div>
      <div className="text-slate-500 text-sm mt-2">Financial Decision Infrastructure</div>
    </motion.div>
  </div>
);

const slides = [
  Slide01CategoryShock,
  Slide02SilentFailure,
  Slide03PlatformShift,
  Slide04Inevitability,           // NEW
  Slide05DefineCategory,          // was 04
  Slide06ArchitectureMoat,        // NEW
  Slide07DecisionDataset,         // NEW
  Slide08WhyImpossibleBefore,     // was 05
  Slide09WhyMandatory,            // was 06
  Slide10ProductOneSentence,      // was 07
  Slide11Velocity,                // NEW
  Slide12ArchitectureAdvantage,   // was 08
  Slide13SwitchingCost,           // was 09
  Slide14CrossBorder,             // was 11
  Slide15ArchitectureTravels,     // was 12
  Slide16InitialWedge,            // was 13
  Slide17SEAMarket,               // was 14
  Slide18ExpansionUnlocks,        // was 15
  Slide19RegionalExpansion,       // was 16
  Slide20WhyBluecoreWins,         // was 17
  Slide21InevitabilityVision,     // was 18
  Slide22Closing                  // NEW
];

const VCPitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, []);
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);
  
  const toggleNotes = useCallback(() => {
    setShowNotes(prev => !prev);
  }, []);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    toast.info('Generating PDF...', {
      description: 'Please wait a moment',
    });

    try {
      const pdfComponent = <VCPitchDeckPDF />;
      let blob: Blob;
      try {
        blob = await pdf(sanitizePdfElement(pdfComponent)).toBlob();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const isBorderCrash = /Invalid border width/i.test(err.message);
        if (!isBorderCrash) throw e;
        console.warn('[VCPitchDeck] Retrying PDF generation with border-stripped sanitizer');
        blob = await pdf(sanitizePdfElementHard(sanitizePdfElement(pdfComponent))).toBlob();
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Bluecore_VC_Pitch_Deck_EN.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Download complete!', {
        description: 'Bluecore_VC_Pitch_Deck_EN.pdf',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation error', {
        description: 'Please try again later',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
      if (e.key === 'n' || e.key === 'N') {
        toggleNotes();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleNotes]);
  
  const CurrentSlideComponent = slides[currentSlide];
  
  return (
    <>
      <Helmet>
        <title>VC Pitch Deck | Bluecore</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
        {/* Top Navigation */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
            <Link to="/portal">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portal
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <Link to="/investor/vc-pitch-vi">
                <Globe className="mr-2 h-4 w-4" />
                VI
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleNotes}
              className={cn(
                "text-slate-400 hover:text-white hover:bg-slate-800",
                showNotes && "text-blue-400 bg-slate-800"
              )}
            >
              <MessageSquareText className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main Slide Area */}
        <div 
          className="min-h-screen flex items-center justify-center cursor-pointer"
          onClick={nextSlide}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-screen flex items-center justify-center"
            >
              <CurrentSlideComponent />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Navigation Arrows */}
        <div className="fixed bottom-1/2 left-4 transform translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            disabled={currentSlide === 0}
            className="text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        </div>
        <div className="fixed bottom-1/2 right-4 transform translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            disabled={currentSlide === slides.length - 1}
            className="text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
        
        {/* Progress Dots */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "bg-blue-400 w-4" : "bg-slate-600 hover:bg-slate-500"
              )}
            />
          ))}
        </div>
        
        {/* Presenter Notes Panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto z-40"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Presenter Notes</h3>
                <Button variant="ghost" size="icon" onClick={toggleNotes} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-blue-400 text-sm font-medium mb-2">Founder Tip</div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {presenterNotes[currentSlide + 1]?.tip}
                  </p>
                </div>
                <div>
                  <div className="text-emerald-400 text-sm font-medium mb-2">Action</div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {presenterNotes[currentSlide + 1]?.action}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-700">
                <div className="text-slate-500 text-xs">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">N</kbd> to toggle notes
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">→</kbd> to navigate
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default VCPitchDeck;
