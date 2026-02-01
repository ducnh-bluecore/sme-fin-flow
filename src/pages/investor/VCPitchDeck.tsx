/**
 * VC Pitch Deck - English Version
 * 
 * 12-slide interactive presentation for Series A investors
 * Focus: Category claim, not product demo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  MessageSquareText,
  Globe,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Presenter notes for each slide
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: {
    tip: "We are not building a better dashboard. We are building the system CEOs rely on to understand financial reality — every morning.",
    action: "Pause. Let it land."
  },
  2: {
    tip: "VCs invest in shifts. They don't invest in tools. Frame Bluecore as a response to a macro shift, not a feature improvement.",
    action: "Emphasize: decision latency = existential risk."
  },
  3: {
    tip: "Leadership teams still operate without a system designed to answer: 'Are we financially safe right now?'",
    action: "Point to the missing layer in the diagram."
  },
  4: {
    tip: "Financial awareness is not a feature. It is an architectural layer.",
    action: "Let this definition sink in. Don't over-explain."
  },
  5: {
    tip: "The winners of the next decade will not be data-rich. They will be awareness-rich.",
    action: "This is VC language. Use it."
  },
  6: {
    tip: "Series A = architecture story, not UI demo. Show the control layer, not the buttons.",
    action: "Walk through the flow from data to alerts."
  },
  7: {
    tip: "Answer 'Why can't this be copied?' before they ask. This is a deep systems problem.",
    action: "Emphasize: This is not software you assemble. It is software you architect."
  },
  8: {
    tip: "You don't need massive ARR. You need the right signal: retention, usage depth, decision reliance.",
    action: "CEOs open Bluecore daily. Not monthly."
  },
  9: {
    tip: "Don't pitch retail analytics. Pitch a horizontal control-layer market starting with a vertical wedge.",
    action: "Start narrow, expand horizontal."
  },
  10: {
    tip: "Companies don't switch the system they trust to tell them the truth.",
    action: "Walk through all 4 moat layers."
  },
  11: {
    tip: "Running a company without financial awareness will soon feel as reckless as running one without accounting.",
    action: "Paint the future. Make it inevitable."
  },
  12: {
    tip: "We are not building a tool. We are building the system companies rely on to stay alive.",
    action: "Pause. End deck. Let silence work."
  }
};

// Slide components
const Slide01CategoryClaim: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight"
    >
      The Financial Awareness Layer<br />
      <span className="text-blue-400">for Modern Commerce.</span>
    </motion.h1>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="max-w-3xl"
    >
      <p className="text-2xl md:text-3xl font-light text-slate-300 mb-4">
        Every company runs on systems of record.
      </p>
      <p className="text-2xl md:text-3xl font-light text-slate-300">
        The next generation will run on <span className="text-blue-400 font-medium">systems of awareness.</span>
      </p>
    </motion.div>
  </div>
);

const Slide02InevitableShift: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Companies Don't Fail From Lack of Data.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-400 mb-12"
    >
      They Fail From Delayed Financial Truth.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl"
    >
      <div className="text-left p-6 rounded-xl bg-slate-800/50 border border-slate-700">
        <h3 className="text-amber-400 text-xl font-semibold mb-4">Old World</h3>
        <ul className="space-y-3 text-slate-300 text-lg">
          <li>• Monthly close</li>
          <li>• Quarterly review</li>
          <li>• Reactive decisions</li>
        </ul>
      </div>
      <div className="text-left p-6 rounded-xl bg-slate-800/50 border border-blue-500/30">
        <h3 className="text-blue-400 text-xl font-semibold mb-4">New World</h3>
        <ul className="space-y-3 text-slate-300 text-lg">
          <li>• Compressed margins</li>
          <li>• Volatile demand</li>
          <li>• Rising CAC</li>
        </ul>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="mt-12 text-xl md:text-2xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Decision latency = existential risk.
    </motion.p>
  </div>
);

const Slide03BrokenStack: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      The Modern Data Stack Was Not Built<br />
      <span className="text-amber-400">for Decision Makers.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="font-mono text-sm md:text-base bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-3xl w-full"
    >
      <div className="flex items-center justify-center gap-4 text-slate-300 mb-6">
        <span className="px-4 py-2 bg-slate-800 rounded">ERP</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">CRM</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">BI</span>
        <span className="text-slate-500">→</span>
        <span className="px-4 py-2 bg-slate-800 rounded">Analytics</span>
      </div>
      <div className="text-slate-500 text-2xl mb-4">↓</div>
      <div className="text-slate-400 mb-8">
        <div>Operators</div>
        <div>Analysts</div>
      </div>
      <div className="border-t-4 border-b-4 border-blue-500 py-4 my-4">
        <div className="text-blue-400 font-bold text-lg">MISSING LAYER</div>
        <div className="text-white font-bold text-xl mt-2">EXECUTIVE AWARENESS</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Leadership teams still operate without a system designed to answer:<br />
      <span className="text-white font-medium">"Are we financially safe right now?"</span>
    </motion.p>
  </div>
);

const Slide04IntroducingCategory: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8"
    >
      <span className="text-blue-400 text-xl font-medium tracking-wider uppercase">Introducing</span>
    </motion.div>
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8"
    >
      Bluecore is the<br />
      <span className="text-blue-400">Financial Decision OS.</span>
    </motion.h1>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="text-xl md:text-2xl text-slate-300 max-w-3xl font-light"
    >
      A system that converts fragmented financial signals into real-time executive awareness — enabling faster, safer decisions.
    </motion.p>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Financial awareness is not a feature.<br />
      <span className="text-white">It is an architectural layer.</span>
    </motion.p>
  </div>
);

const Slide05WhyNow: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-6xl font-bold text-white mb-4"
    >
      The Awareness Era
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      Has Begun.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full"
    >
      {[
        { num: "1", title: "Financial data is finally accessible", desc: "APIs, marketplaces, payments" },
        { num: "2", title: "Decision windows are collapsing", desc: "Weeks, not quarters" },
        { num: "3", title: "Margin for error is disappearing", desc: "Every decision counts" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left"
        >
          <div className="text-blue-400 text-4xl font-bold mb-4">{item.num}</div>
          <h3 className="text-white text-lg font-semibold mb-2">{item.title}</h3>
          <p className="text-slate-400">{item.desc}</p>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      The winners of the next decade will not be data-rich.<br />
      <span className="text-white">They will be awareness-rich.</span>
    </motion.p>
  </div>
);

const Slide06ProductInfrastructure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      The Control Layer for<br />
      <span className="text-blue-400">Financial Reality.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-4 max-w-md"
    >
      {[
        { label: "Data sources", color: "slate" },
        { label: "Unified financial truth", color: "blue" },
        { label: "Decision engine", color: "blue" },
        { label: "Executive alerts", color: "emerald" }
      ].map((item, i) => (
        <React.Fragment key={i}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.15 }}
            className={cn(
              "w-full py-4 px-8 rounded-lg text-center font-medium text-lg",
              item.color === "slate" && "bg-slate-700 text-slate-200",
              item.color === "blue" && "bg-blue-500/20 text-blue-400 border border-blue-500/40",
              item.color === "emerald" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            )}
          >
            {item.label}
          </motion.div>
          {i < 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="text-slate-500 text-2xl"
            >
              ↓
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-12 text-lg text-slate-500 italic"
    >
      Series A = Architecture story. Not UI demo.
    </motion.p>
  </div>
);

const Slide07WhatMakesHard: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-12"
    >
      Financial Awareness Is a<br />
      <span className="text-amber-400">Deep Systems Problem.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full"
    >
      {[
        "Financial semantics",
        "Reconciliation logic",
        "Profit normalization",
        "Decision modeling"
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <span className="text-slate-300 font-medium">{item}</span>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-8 text-slate-500 text-lg"
    >
      👉 Not dashboards.
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-amber-500 pl-6"
    >
      This is not software you assemble.<br />
      <span className="text-white">It is software you architect.</span>
    </motion.p>
  </div>
);

const Slide08EarlySignal: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      Once Leadership Trusts the System —
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-emerald-400 mb-12"
    >
      It Becomes Mission Critical.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
    >
      {[
        { metric: "Retention", signal: "High" },
        { metric: "Usage depth", signal: "Daily" },
        { metric: "Decision reliance", signal: "Critical" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-6 rounded-xl bg-slate-800/50 border border-emerald-500/30"
        >
          <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">{item.metric}</div>
          <div className="text-emerald-400 text-2xl font-bold">{item.signal}</div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-emerald-500 pl-6"
    >
      CEOs open Bluecore daily.<br />
      <span className="text-white">Not monthly.</span>
    </motion.p>
  </div>
);

const Slide09Market: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-12"
    >
      Every Margin-Sensitive Company Will Need<br />
      <span className="text-blue-400">a Financial Awareness Layer.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center gap-6 max-w-2xl w-full"
    >
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Start narrow</div>
        <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg py-3 px-6 text-blue-400 font-medium">
          Retail / Ecommerce
        </div>
      </div>
      <div className="text-slate-500 text-2xl">↓</div>
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Expand</div>
        <div className="grid grid-cols-3 gap-3">
          {["Multi-brand", "Consumer", "Marketplaces"].map((item, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg py-3 px-4 text-slate-300 text-sm">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="text-slate-500 text-2xl">↓</div>
      <div className="w-full">
        <div className="text-slate-500 text-sm uppercase tracking-wider mb-2">Mid-market</div>
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg py-3 px-6 text-emerald-400 font-medium">
          All Margin-Sensitive Companies
        </div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-10 text-lg text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      We are entering a horizontal control-layer market —<br />
      <span className="text-white">starting with a vertical wedge.</span>
    </motion.p>
  </div>
);

const Slide10Moat: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-6xl font-bold text-white mb-4"
    >
      Awareness
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-5xl md:text-6xl font-bold text-blue-400 mb-12"
    >
      Compounds.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col gap-2 max-w-xl w-full"
    >
      {[
        { num: 1, label: "Semantic Standard", desc: "Unified financial language" },
        { num: 2, label: "Decision Dataset", desc: "Historical patterns" },
        { num: 3, label: "Organizational Trust", desc: "Single source of truth" },
        { num: 4, label: "Executive Workflow Lock-in", desc: "Daily habit" }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-left"
        >
          <div className="text-blue-400 text-2xl font-bold w-8">{item.num}</div>
          <div>
            <div className="text-white font-medium">{item.label}</div>
            <div className="text-slate-500 text-sm">{item.desc}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-10 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6"
    >
      Companies don't switch the system<br />
      <span className="text-white">they trust to tell them the truth.</span>
    </motion.p>
  </div>
);

const Slide11VisionScale: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      We Believe Financial Awareness
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-4xl md:text-5xl font-bold text-blue-400 mb-12"
    >
      Will Become Default Infrastructure.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full"
    >
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 text-left">
        <div className="text-amber-400 text-sm uppercase tracking-wider mb-3">Today</div>
        <div className="text-white text-xl font-medium">ERP required</div>
        <div className="text-slate-500 mt-2">Every company has one</div>
      </div>
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/40 text-left">
        <div className="text-blue-400 text-sm uppercase tracking-wider mb-3">Tomorrow</div>
        <div className="text-white text-xl font-medium">Awareness required</div>
        <div className="text-slate-400 mt-2">Every company will need one</div>
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="mt-12 text-xl text-slate-400 italic border-l-4 border-blue-500 pl-6 max-w-2xl"
    >
      Running a company without financial awareness will soon feel as reckless<br />
      <span className="text-white">as running one without accounting.</span>
    </motion.p>
  </div>
);

const Slide12CompanyBuilding: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
    >
      Bluecore Is Building<br />
      <span className="text-blue-400">the Financial Control Plane</span><br />
      for Commerce.
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="max-w-2xl"
    >
      <p className="text-xl text-slate-300 mb-8">When Bluecore wins:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          "CEOs run mornings on it",
          "Boards trust it",
          "Operators align to it"
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-12 text-2xl text-slate-300 font-light"
    >
      We are not building a tool.
    </motion.p>
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-2 text-2xl text-white font-medium"
    >
      We are building the system companies rely on to stay alive.
    </motion.p>
  </div>
);

const slides = [
  Slide01CategoryClaim,
  Slide02InevitableShift,
  Slide03BrokenStack,
  Slide04IntroducingCategory,
  Slide05WhyNow,
  Slide06ProductInfrastructure,
  Slide07WhatMakesHard,
  Slide08EarlySignal,
  Slide09Market,
  Slide10Moat,
  Slide11VisionScale,
  Slide12CompanyBuilding
];

const VCPitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, []);
  
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);
  
  const toggleNotes = useCallback(() => {
    setShowNotes(prev => !prev);
  }, []);
  
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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "bg-blue-400 w-6" : "bg-slate-600 hover:bg-slate-500"
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
