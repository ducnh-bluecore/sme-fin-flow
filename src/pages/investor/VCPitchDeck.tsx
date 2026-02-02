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
import { presenterScriptsEN, parseScriptLines } from '@/data/presenterScripts';

// Presenter notes for each slide (23 slides - synced with VI)
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: {
    tip: "VC must feel DANGER, not just opportunity. Financial blindness kills companies - make it violent.",
    action: "Wait for reaction. If partner nods strongly → hook has landed."
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
    tip: "Flywheel makes moat logical. VC wants to see mechanism, not philosophy.",
    action: "Point to each step. Let compounding effect sink in."
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
    tip: "This slide massively reduces risk perception. Thailand $3K MRR placed right after velocity.",
    action: "Thailand is now a validated second beachhead — not a future bet."
  },
  13: {
    tip: "This is the believability slide. One real example = worth 100 concept slides.",
    action: "Partner thinks: 'This is real. This works.'"
  },
  14: {
    tip: "This is not assembled software. It is engineered infrastructure.",
    action: "Partner thought: Hard to replicate. Good."
  },
  15: {
    tip: "Infra investors LOVE this slide. Trust compounds.",
    action: "Companies don't replace systems they trust."
  },
  16: {
    tip: "Repeatable deployment. Very investable signal.",
    action: "Bluecore scales with minimal localization."
  },
  17: {
    tip: "No inflated TAM. Partners smell fake numbers instantly.",
    action: "Start with margin-sensitive operators who feel decision latency first."
  },
  18: {
    tip: "No hype needed. Numbers already strong.",
    action: "Show the combined wedge: $1.4B-$2.3B"
  },
  19: {
    tip: "After commerce: consumer brands, distribution, pharmacy, F&B.",
    action: "Partner now sees venture scale."
  },
  20: {
    tip: "Many decks forget this. Partners invest in execution clarity.",
    action: "Expansion is deliberate — not opportunistic."
  },
  21: {
    tip: "3+ years warehouse maturity. ~99.8% data accuracy. Decision AI can be copied. Financial data history cannot.",
    action: "Founder signal becomes VERY strong here. Amplify unfair advantage."
  },
  22: {
    tip: "Never skip this in infra decks. Sound calm — almost obvious.",
    action: "Let the inevitability sink in. ERP = mandatory. Decision infra = next."
  },
  23: {
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
      Data infrastructure has become standard.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-400 mb-10"
    >
      Financial Awareness will be the next default infrastructure.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-3xl space-y-8"
    >
      <p className="text-xl md:text-2xl text-slate-400 leading-relaxed">
        Data tells the past.<br />
        <span className="text-white font-medium">Financial Awareness tells you if you're safe — right now.</span>
      </p>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-xl md:text-2xl text-slate-500 pt-6 border-t border-slate-700/50"
      >
        Not the company with the most data will win.<br />
        <span className="text-amber-400 font-semibold">But the company with the earliest awareness.</span>
      </motion.p>
    </motion.div>
  </div>
);

const Slide03PlatformShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 max-w-4xl w-full mb-12"
    >
      {[
        { system: "Systems of Record", action: "record the past.", color: "slate" },
        { system: "Systems of Intelligence", action: "explain the past.", color: "slate" },
        { system: "Systems of Awareness", action: "decide what happens next.", color: "blue" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.2 }}
          className="text-center"
        >
          <span className={cn(
            "text-3xl md:text-4xl lg:text-5xl font-bold",
            item.color === "slate" ? "text-slate-400" : "text-blue-400"
          )}>
            {item.system}
          </span>
          <span className={cn(
            "text-3xl md:text-4xl lg:text-5xl font-light ml-3",
            item.color === "slate" ? "text-slate-500" : "text-white"
          )}>
            {item.action}
          </span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.h2 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="text-2xl md:text-3xl text-white font-medium mb-12"
    >
      Bluecore is building the <span className="text-blue-400 font-bold">Awareness Layer.</span>
    </motion.h2>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="text-lg md:text-xl text-slate-500 italic max-w-2xl border-t border-slate-700/50 pt-8"
    >
      Operating without financial awareness<br />
      <span className="text-amber-400 not-italic font-medium">will soon feel as risky as operating without accounting.</span>
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

// NEW SLIDE 7 — DECISION DATASET + FLYWHEEL
const Slide07DecisionDataset: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
    >
      The Moat That <span className="text-emerald-400">Compounds.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-lg text-slate-400 mb-8"
    >
      Every decision strengthens the system.
    </motion.p>
    
    {/* Flywheel Visual */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex flex-col items-center gap-2 max-w-md w-full mb-8"
    >
      {[
        { text: "More customers", color: "emerald" },
        { text: "More financial patterns", color: "emerald" },
        { text: "Better risk detection", color: "blue" },
        { text: "Better decisions", color: "blue" },
        { text: "Deeper trust", color: "amber" },
        { text: "Harder to replace", color: "amber" }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className={cn(
              "w-full py-3 px-6 rounded-lg text-center font-medium",
              item.color === "emerald" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              item.color === "blue" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
              item.color === "amber" && "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}
          >
            {item.text}
          </motion.div>
          {i < 5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 + i * 0.1 }}
              className="text-slate-500 text-lg"
            >
              ↓
            </motion.div>
          )}
        </React.Fragment>
      ))}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-emerald-400 text-lg mt-2"
      >
        ↻ loop back
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
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


// Slide 12 — Cross-Border (MOVED UP)
const Slide12CrossBorder: React.FC = () => (
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

// NEW SLIDE 13 — PRODUCT REALITY
const Slide13ProductReality: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      THIS IS WHAT A <span className="text-blue-400">DECISION LOOKS LIKE</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 rounded-xl bg-slate-800/80 border border-red-500/50 max-w-2xl w-full"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-red-400 text-xl font-bold mb-6 flex items-center gap-2"
      >
        <span className="text-2xl">⚠</span> CASH RISK DETECTED
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Sell-through</div>
          <div className="text-red-400 text-2xl font-bold">↓ 23%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Inventory turn</div>
          <div className="text-red-400 text-2xl font-bold">↓ 18%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Payment terms</div>
          <div className="text-amber-400 text-2xl font-bold">Extended</div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t border-slate-700 pt-6"
      >
        <div className="text-slate-400 text-lg mb-2">→ Recommendation: Slow down purchase orders</div>
        <div className="text-emerald-400 text-3xl font-bold">→ Preserve $480K in liquidity</div>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-8 text-lg text-slate-500 italic"
    >
      One real example = 100 concept slides.
    </motion.p>
  </div>
);

// Slide 14 — Architecture Advantage
const Slide14ArchitectureAdvantage: React.FC = () => (
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

// Slide 15 — Switching Cost
const Slide15SwitchingCost: React.FC = () => (
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

// Slide 16 — Architecture Travels
const Slide16ArchitectureTravels: React.FC = () => (
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

// Slide 17 — Initial Wedge
const Slide17InitialWedge: React.FC = () => (
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

// Slide 18 — SEA Market
const Slide18SEAMarket: React.FC = () => (
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

// Slide 19 — Expansion Unlocks
const Slide19ExpansionUnlocks: React.FC = () => (
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

// Slide 20 — Regional Expansion
const Slide20RegionalExpansion: React.FC = () => (
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

// Slide 21 — Why Bluecore Wins
const Slide21WhyBluecoreWins: React.FC = () => (
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

// Slide 22 — Inevitability Vision
const Slide22InevitabilityVision: React.FC = () => (
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

// Slide 23 — Closing
const Slide23Closing: React.FC = () => (
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
  Slide01CategoryShock,           // 1
  Slide02SilentFailure,           // 2 - UPDATED messaging
  Slide03PlatformShift,           // 3 - UPDATED format
  Slide04Inevitability,           // 4
  Slide05DefineCategory,          // 5
  Slide06ArchitectureMoat,        // 6
  Slide07DecisionDataset,         // 7 - UPDATED Flywheel
  Slide08WhyImpossibleBefore,     // 8
  Slide09WhyMandatory,            // 9
  Slide10ProductOneSentence,      // 10
  Slide11Velocity,                // 11
  Slide12CrossBorder,             // 12 - MOVED UP
  Slide13ProductReality,          // 13 - NEW
  Slide14ArchitectureAdvantage,   // 14
  Slide15SwitchingCost,           // 15
  Slide16ArchitectureTravels,     // 16
  Slide17InitialWedge,            // 17
  Slide18SEAMarket,               // 18
  Slide19ExpansionUnlocks,        // 19
  Slide20RegionalExpansion,       // 20
  Slide21WhyBluecoreWins,         // 21
  Slide22InevitabilityVision,     // 22
  Slide23Closing                  // 23
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
              className="fixed top-0 right-0 bottom-0 w-[400px] bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto z-40"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Presenter Notes</h3>
                <Button variant="ghost" size="icon" onClick={toggleNotes} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Script Section */}
                {presenterScriptsEN[currentSlide + 1] && (
                  <div>
                    <div className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-2">
                      <span>📜</span> Script
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                      {parseScriptLines(presenterScriptsEN[currentSlide + 1]).map((line, i) => (
                        <span 
                          key={i} 
                          className={line.isInstruction ? 'text-amber-400 font-medium' : 'text-slate-300'}
                        >
                          {line.text}
                          {'\n'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <span>💡</span> Founder Tip
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {presenterNotes[currentSlide + 1]?.tip}
                  </p>
                </div>
                <div>
                  <div className="text-emerald-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <span>⚡</span> Action
                  </div>
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
