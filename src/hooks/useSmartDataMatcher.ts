/**
 * useSmartDataMatcher - Smart matching algorithm for data assessment
 * 
 * Compares user's survey responses with module requirements
 * to generate an optimal import plan using inferred data types.
 */

import { useMemo } from 'react';
import { useConnectorIntegrations } from './useConnectorIntegrations';
import {
  type ModuleKey,
  type DataRequirement,
  getModuleRequirements,
  dataSourceOptions,
  getConnectorTypesFromSubSources,
  getAllInferredDataTypes,
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
 * Check if user has this data type available (from inferred or additional)
 */
function userHasDataType(
  requirement: DataRequirement,
  inferredDataTypes: string[],
  additionalDataTypes: string[]
): boolean {
  const allUserData = [...inferredDataTypes, ...additionalDataTypes];
  
  // Map requirement dataType to survey dataType options
  // D2C/Retail: Order từ MỌI nguồn = Invoice, Phí sàn = Bill
  const dataTypeMapping: Record<string, string[]> = {
    // === Core Financial Mapping (FDP Manifesto) ===
    // Order từ sàn TMĐT = Invoice (AR) = "Cash sẽ về"
    invoices: ['invoices', 'orders'],
    // Phí sàn, chi phí = Bill (AP) = "Cash bị khóa/trừ"  
    bills: ['bills', 'channel_fees', 'expenses'],
    // Settlement = "Cash đã về" (T+14)
    settlements: ['settlements', 'bank_transactions'],
    
    // === Standard Mappings ===
    orders: ['orders'],
    customers: ['customers'],
    vendors: ['vendors'],
    expenses: ['expenses'],
    bank_transactions: ['bank_transactions'],
    marketing_spend: ['marketing_spend'],
    cash_forecasts: ['expenses'], // Related to expenses
    campaigns: ['marketing_spend', 'campaigns'],
    products: ['products'],
    channel_fees: ['orders', 'channel_fees'], // Derived from orders/channel fees
    order_items: ['orders', 'order_items'],
    customer_events: ['orders'], // Behavior data
  };
  
  const mappedTypes = dataTypeMapping[requirement.dataType] || [requirement.dataType];
  return mappedTypes.some(t => allUserData.includes(t));
}

/**
 * Determine if sources indicate API preference (has connectors) or Excel
 */
function determineDataFormat(selectedSources: string[]): { prefersAPI: boolean; prefersExcel: boolean } {
  const hasConnectorSources = selectedSources.some(sourceId => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    return source && source.connectorTypes.length > 0;
  });
  
  const hasExcelManual = selectedSources.includes('excel') || selectedSources.includes('manual');
  
  return {
    prefersAPI: hasConnectorSources,
    prefersExcel: hasExcelManual || !hasConnectorSources,
  };
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
    
    // Get user's connector types from selected sub-sources
    const userConnectorTypes = getConnectorTypesFromSubSources(
      surveyResponses.data_sources,
      surveyResponses.sub_sources
    );
    
    // Get inferred data types from sources
    const inferredDataTypes = getAllInferredDataTypes(
      surveyResponses.data_sources,
      surveyResponses.sub_sources
    );
    
    // Get active connector types from existing integrations
    const activeConnectorTypes = integrations
      .filter(i => i.status === 'active')
      .map(i => i.connector_type);
    
    // Determine data format preference
    const { prefersAPI, prefersExcel } = determineDataFormat(surveyResponses.data_sources);
    
    const plan: ImportPlan = {
      connect: [],
      import: [],
      skip: [],
      existing: [],
    };
    
    const recommendations: string[] = [];
    
    // Process each requirement
    requirements.forEach(req => {
      const hasData = userHasDataType(req, inferredDataTypes, surveyResponses.additional_data_types);
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
