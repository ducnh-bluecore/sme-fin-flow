/**
 * useSmartDataMatcher - Smart matching algorithm for data assessment
 * 
 * Compares user's survey responses with module requirements
 * to generate an optimal import plan.
 */

import { useMemo } from 'react';
import { useConnectorIntegrations } from './useConnectorIntegrations';
import {
  type ModuleKey,
  type DataRequirement,
  getModuleRequirements,
  dataSourceOptions,
} from '@/lib/dataRequirementsMap';
import type { SurveyResponses, ImportPlan, ImportPlanItem } from './useDataAssessment';

interface MatcherResult {
  importPlan: ImportPlan;
  summary: {
    totalRequirements: number;
    criticalMet: number;
    criticalTotal: number;
    connectCount: number;
    importCount: number;
    skipCount: number;
    existingCount: number;
  };
  recommendations: string[];
}

/**
 * Maps user-selected data sources to connector types
 */
function getConnectorTypesFromSources(selectedSources: string[]): string[] {
  const connectorTypes = new Set<string>();
  
  selectedSources.forEach(sourceId => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    if (source) {
      source.connectorTypes.forEach(ct => connectorTypes.add(ct));
    }
  });
  
  return Array.from(connectorTypes);
}

/**
 * Check if a requirement can be fulfilled by a connector
 */
function canConnectRequirement(
  requirement: DataRequirement,
  userConnectorTypes: string[],
  activeConnectorTypes: string[]
): { canConnect: boolean; isExisting: boolean; connectorType?: string } {
  // Check if already connected
  const existingConnector = requirement.connectorSources.find(source =>
    activeConnectorTypes.includes(source)
  );
  
  if (existingConnector) {
    return { canConnect: true, isExisting: true, connectorType: existingConnector };
  }
  
  // Check if user has a source that can provide this
  const availableConnector = requirement.connectorSources.find(source =>
    userConnectorTypes.includes(source)
  );
  
  if (availableConnector) {
    return { canConnect: true, isExisting: false, connectorType: availableConnector };
  }
  
  return { canConnect: false, isExisting: false };
}

/**
 * Check if user indicated they have this data type available
 */
function userHasDataType(
  requirement: DataRequirement,
  userDataTypes: string[]
): boolean {
  // Map requirement dataType to survey dataType options
  const dataTypeMapping: Record<string, string[]> = {
    orders: ['orders'],
    invoices: ['invoices'],
    bills: ['bills'],
    customers: ['customers'],
    vendors: ['vendors'],
    expenses: ['expenses'],
    bank_transactions: ['bank_transactions'],
    marketing_spend: ['marketing_spend'],
    cash_forecasts: ['expenses'], // Related to expenses
    campaigns: ['marketing_spend'],
    products: ['products'],
    channel_fees: ['orders'], // Derived from orders
    settlements: ['bank_transactions'],
    order_items: ['orders'],
    customer_events: ['orders'], // Behavior data
  };
  
  const mappedTypes = dataTypeMapping[requirement.dataType] || [requirement.dataType];
  return mappedTypes.some(t => userDataTypes.includes(t));
}

export function useSmartDataMatcher(
  moduleKey: ModuleKey,
  surveyResponses: SurveyResponses | null
): MatcherResult {
  const { integrations, isLoading: connectorsLoading } = useConnectorIntegrations();
  
  return useMemo(() => {
    const requirements = getModuleRequirements(moduleKey);
    
    // Default empty plan
    const emptyPlan: ImportPlan = {
      connect: [],
      import: [],
      skip: [],
      existing: [],
    };
    
    if (!surveyResponses || connectorsLoading) {
      return {
        importPlan: emptyPlan,
        summary: {
          totalRequirements: requirements.length,
          criticalMet: 0,
          criticalTotal: requirements.filter(r => r.priority === 'critical').length,
          connectCount: 0,
          importCount: 0,
          skipCount: 0,
          existingCount: 0,
        },
        recommendations: [],
      };
    }
    
    // Get user's connector types from selected sources
    const userConnectorTypes = getConnectorTypesFromSources(surveyResponses.data_sources);
    
    // Get active connector types from existing integrations
    const activeConnectorTypes = integrations
      .filter(i => i.status === 'active')
      .map(i => i.connector_type);
    
    // Determine data format preference
    const dataFormat = surveyResponses.data_format;
    const prefersAPI = dataFormat === 'api' || dataFormat === 'mixed';
    const prefersExcel = dataFormat === 'excel' || dataFormat === 'mixed';
    
    const plan: ImportPlan = {
      connect: [],
      import: [],
      skip: [],
      existing: [],
    };
    
    const recommendations: string[] = [];
    
    // Process each requirement
    requirements.forEach(req => {
      const hasData = userHasDataType(req, surveyResponses.data_types);
      const connectionResult = canConnectRequirement(req, userConnectorTypes, activeConnectorTypes);
      
      const planItem: ImportPlanItem = {
        requirementId: req.id,
        dataType: req.dataType,
        displayName: req.displayName,
        action: 'skip',
        priority: req.priority,
        templateId: req.templateId,
      };
      
      // Decision logic
      if (connectionResult.isExisting) {
        // Already connected - great!
        planItem.action = 'existing';
        planItem.connectorType = connectionResult.connectorType;
        plan.existing.push(planItem);
      } else if (connectionResult.canConnect && prefersAPI) {
        // Can connect via API
        planItem.action = 'connect';
        planItem.connectorType = connectionResult.connectorType;
        plan.connect.push(planItem);
      } else if (hasData && req.templateId && prefersExcel) {
        // User has data in Excel format
        planItem.action = 'import';
        plan.import.push(planItem);
      } else if (req.templateId && req.priority !== 'optional') {
        // Important data, suggest import
        planItem.action = 'import';
        plan.import.push(planItem);
      } else {
        // Optional or no clear path
        planItem.action = 'skip';
        plan.skip.push(planItem);
      }
    });
    
    // Generate recommendations
    const criticalItems = requirements.filter(r => r.priority === 'critical');
    const criticalMet = [
      ...plan.existing.filter(i => i.priority === 'critical'),
      ...plan.connect.filter(i => i.priority === 'critical'),
      ...plan.import.filter(i => i.priority === 'critical'),
    ].length;
    
    if (criticalMet < criticalItems.length) {
      recommendations.push(
        `Còn ${criticalItems.length - criticalMet} dữ liệu quan trọng cần được cung cấp để ${moduleKey.toUpperCase()} hoạt động đầy đủ.`
      );
    }
    
    if (plan.connect.length > 0) {
      const uniqueConnectors = new Set(plan.connect.map(i => i.connectorType));
      recommendations.push(
        `Kết nối ${uniqueConnectors.size} nguồn dữ liệu sẽ tự động đồng bộ ${plan.connect.length} loại dữ liệu.`
      );
    }
    
    if (plan.import.length > 2) {
      recommendations.push(
        `Bạn có thể import ${plan.import.length} file Excel. Hệ thống sẽ cung cấp template chuẩn.`
      );
    }
    
    return {
      importPlan: plan,
      summary: {
        totalRequirements: requirements.length,
        criticalMet,
        criticalTotal: criticalItems.length,
        connectCount: plan.connect.length,
        importCount: plan.import.length,
        skipCount: plan.skip.length,
        existingCount: plan.existing.length,
      },
      recommendations,
    };
  }, [moduleKey, surveyResponses, integrations, connectorsLoading]);
}

/**
 * Hook to check if a module needs data assessment
 */
export function useNeedsDataAssessment(moduleKey: ModuleKey): {
  needsAssessment: boolean;
  isLoading: boolean;
} {
  // This would typically check the database, but we can use
  // the useDataAssessment hook for that
  // This is a simplified version for route guards
  return {
    needsAssessment: false, // Will be overridden by actual check
    isLoading: false,
  };
}
