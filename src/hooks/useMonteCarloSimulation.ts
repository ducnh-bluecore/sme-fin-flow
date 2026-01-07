import { useState, useCallback } from 'react';

export interface ScenarioConfig {
  id: string;
  name: string;
  type: 'revenue_drop' | 'cost_increase' | 'customer_loss' | 'interest_rate' | 'fx_rate' | 'custom';
  impactPercent: number;
  probability: number; // 0-1
  volatility: number; // standard deviation for Monte Carlo
  isEnabled: boolean;
}

export interface SimulationResult {
  mean: number;
  median: number;
  stdDev: number;
  p5: number;  // 5th percentile (worst case)
  p25: number;
  p75: number;
  p95: number; // 95th percentile (best case)
  min: number;
  max: number;
  distribution: number[];
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
}

export interface MonteCarloOutput {
  baseCase: number;
  stressedCase: number;
  results: SimulationResult;
  scenarioImpacts: { name: string; impact: number }[];
  riskMetrics: {
    expectedLoss: number;
    maxLoss: number;
    probabilityOfLoss: number;
  };
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

export function runMonteCarloSimulation(
  baseValue: number,
  scenarios: ScenarioConfig[],
  iterations: number = 10000
): MonteCarloOutput {
  const enabledScenarios = scenarios.filter(s => s.isEnabled);
  const results: number[] = [];

  // Run simulations
  for (let i = 0; i < iterations; i++) {
    let simulatedValue = baseValue;

    for (const scenario of enabledScenarios) {
      // Check if scenario occurs (based on probability)
      if (Math.random() < scenario.probability) {
        // Apply impact with volatility (normal distribution)
        const actualImpact = randomNormal(
          scenario.impactPercent,
          scenario.volatility
        );
        simulatedValue *= (1 + actualImpact / 100);
      }
    }

    results.push(simulatedValue);
  }

  // Sort results for percentile calculations
  results.sort((a, b) => a - b);

  // Calculate statistics
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const median = results[Math.floor(results.length / 2)];
  
  const squaredDiffs = results.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / results.length;
  const stdDev = Math.sqrt(variance);

  const p5 = results[Math.floor(results.length * 0.05)];
  const p25 = results[Math.floor(results.length * 0.25)];
  const p75 = results[Math.floor(results.length * 0.75)];
  const p95 = results[Math.floor(results.length * 0.95)];
  const min = results[0];
  const max = results[results.length - 1];

  // VaR calculations
  const var95 = baseValue - results[Math.floor(results.length * 0.05)];
  const var99 = baseValue - results[Math.floor(results.length * 0.01)];

  // Create histogram distribution (20 buckets)
  const bucketCount = 30;
  const bucketSize = (max - min) / bucketCount;
  const distribution = new Array(bucketCount).fill(0);
  
  for (const value of results) {
    const bucket = Math.min(
      Math.floor((value - min) / bucketSize),
      bucketCount - 1
    );
    distribution[bucket]++;
  }

  // Calculate individual scenario impacts
  const scenarioImpacts = enabledScenarios.map(scenario => ({
    name: scenario.name,
    impact: baseValue * (scenario.impactPercent / 100) * scenario.probability
  }));

  // Stressed case (expected value after all scenarios)
  const stressedCase = enabledScenarios.reduce((value, scenario) => {
    return value * (1 + (scenario.impactPercent / 100) * scenario.probability);
  }, baseValue);

  // Risk metrics
  const lossResults = results.filter(r => r < baseValue);
  const expectedLoss = lossResults.length > 0 
    ? lossResults.reduce((a, b) => a + (baseValue - b), 0) / results.length
    : 0;
  const maxLoss = baseValue - min;
  const probabilityOfLoss = lossResults.length / results.length;

  return {
    baseCase: baseValue,
    stressedCase,
    results: {
      mean,
      median,
      stdDev,
      p5,
      p25,
      p75,
      p95,
      min,
      max,
      distribution,
      var95,
      var99
    },
    scenarioImpacts,
    riskMetrics: {
      expectedLoss,
      maxLoss,
      probabilityOfLoss
    }
  };
}

export function useMonteCarloSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<MonteCarloOutput | null>(null);

  const runSimulation = useCallback((
    baseValue: number,
    scenarios: ScenarioConfig[],
    iterations: number = 10000
  ) => {
    setIsRunning(true);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const result = runMonteCarloSimulation(baseValue, scenarios, iterations);
      setOutput(result);
      setIsRunning(false);
    }, 100);
  }, []);

  const reset = useCallback(() => {
    setOutput(null);
  }, []);

  return {
    isRunning,
    output,
    runSimulation,
    reset
  };
}
