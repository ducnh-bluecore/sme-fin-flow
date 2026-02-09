import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChannelData {
  name: string;
  key: string;
  revenue: number;
  channelCost: number;
  grossProfit: number;
  margin: number;
  share: number;
  growth: number;
  commission: number;
  // New fields for retention analysis
  returnRate?: number;
  newCustomers?: number;
  repeatCustomers?: number;
  avgOrderValue?: number;
  customerLifetimeValue?: number;
}

interface RealCustomerMetrics {
  source: string;
  totalCustomers: number;
  repeatCustomers: number;
  returnRate: number;
  avgOrderValue: number;
  avgOrdersPerCustomer: number;
  totalOrders: number;
  totalRevenue: number;
}

interface OptimizationRequest {
  channels: ChannelData[];
  totalBudget: number;
  targetROI?: number;
  tenantId?: string;
}

// Function to fetch real customer retention data from database
async function fetchRealCustomerMetrics(supabase: any, tenantId?: string): Promise<Map<string, RealCustomerMetrics>> {
  const metricsMap = new Map<string, RealCustomerMetrics>();
  
  try {
    // Query 1: Get overall metrics by source/channel
    let query = supabase
      .from('orders')
      .select('source, customer_id, total_amount')
      .not('customer_id', 'is', null);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
      console.error("Error fetching orders:", error);
      return metricsMap;
    }
    
    if (!orders || orders.length === 0) {
      console.log("No orders found in database");
      return metricsMap;
    }
    
    console.log(`Found ${orders.length} orders for retention analysis`);
    
    // Group orders by source
    const sourceGroups: Record<string, typeof orders> = {};
    for (const order of orders) {
      const source = order.source || 'unknown';
      if (!sourceGroups[source]) {
        sourceGroups[source] = [];
      }
      sourceGroups[source].push(order);
    }
    
    // Calculate metrics for each source
    for (const [source, sourceOrders] of Object.entries(sourceGroups)) {
      // Count unique customers
      const customerOrderCounts: Record<string, { count: number; total: number }> = {};
      
      for (const order of sourceOrders) {
        const customerId = order.customer_id;
        if (!customerOrderCounts[customerId]) {
          customerOrderCounts[customerId] = { count: 0, total: 0 };
        }
        customerOrderCounts[customerId].count++;
        customerOrderCounts[customerId].total += order.total_amount || 0;
      }
      
      const customerIds = Object.keys(customerOrderCounts);
      const totalCustomers = customerIds.length;
      const repeatCustomers = customerIds.filter(id => customerOrderCounts[id].count > 1).length;
      const totalOrders = sourceOrders.length;
      const totalRevenue = sourceOrders.reduce((acc: number, o: { total_amount?: number }) => acc + (o.total_amount || 0), 0);
      
      const returnRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
      
      metricsMap.set(source.toLowerCase(), {
        source,
        totalCustomers,
        repeatCustomers,
        returnRate,
        avgOrderValue,
        avgOrdersPerCustomer,
        totalOrders,
        totalRevenue,
      });
      
      console.log(`Real metrics for ${source}:`, {
        totalCustomers,
        repeatCustomers,
        returnRate: returnRate.toFixed(1) + '%',
        avgOrderValue: avgOrderValue.toFixed(0),
        avgOrdersPerCustomer: avgOrdersPerCustomer.toFixed(2),
      });
    }
    
    return metricsMap;
  } catch (err) {
    console.error("Error in fetchRealCustomerMetrics:", err);
    return metricsMap;
  }
}

// Map channel key to database source
function mapChannelToSource(channelKey: string): string[] {
  const key = channelKey.toLowerCase();
  const mappings: Record<string, string[]> = {
    'shopee': ['shopee', 'ecommerce', 'marketplace'],
    'lazada': ['lazada', 'ecommerce', 'marketplace'],
    'tiki': ['tiki', 'ecommerce', 'marketplace'],
    'tiktok': ['tiktok', 'tiktok_shop', 'social'],
    'website': ['website', 'web', 'online', 'direct'],
    'offline': ['offline', 'store', 'pos', 'retail'],
    'store': ['offline', 'store', 'pos', 'retail'],
  };
  
  for (const [pattern, sources] of Object.entries(mappings)) {
    if (key.includes(pattern)) {
      return sources;
    }
  }
  
  return [key];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { channels, totalBudget, targetROI = 300, tenantId } = await req.json() as OptimizationRequest;

    console.log("Received optimization request:", { 
      channelCount: channels.length, 
      totalBudget, 
      targetROI,
      tenantId: tenantId ? 'provided' : 'not provided'
    });

    // Fetch real customer retention data from database
    const realMetrics = await fetchRealCustomerMetrics(supabase, tenantId);
    console.log(`Fetched real metrics for ${realMetrics.size} sources`);

    // Calculate ROI metrics and retention metrics for each channel
    const channelROI = channels.map(channel => {
      const roi = channel.channelCost > 0 
        ? (channel.grossProfit / channel.channelCost) * 100 
        : 0;
      
      const efficiency = channel.channelCost > 0 
        ? channel.revenue / channel.channelCost 
        : 0;

      const scalabilityScore = (channel.growth / 10) + (channel.margin / 20);

      // Try to get real metrics from database
      const possibleSources = mapChannelToSource(channel.key);
      let realChannelMetrics: RealCustomerMetrics | undefined;
      
      for (const source of possibleSources) {
        if (realMetrics.has(source)) {
          realChannelMetrics = realMetrics.get(source);
          console.log(`Matched channel ${channel.name} to real source: ${source}`);
          break;
        }
      }

      // Use real data if available, otherwise estimate
      let returnRate: number;
      let avgOrderValue: number;
      let totalCustomers: number;
      let repeatCustomers: number;
      let dataSource: 'real' | 'estimated';
      
      if (realChannelMetrics && realChannelMetrics.totalCustomers >= 5) {
        // Use real data from database
        returnRate = realChannelMetrics.returnRate;
        avgOrderValue = realChannelMetrics.avgOrderValue;
        totalCustomers = realChannelMetrics.totalCustomers;
        repeatCustomers = realChannelMetrics.repeatCustomers;
        dataSource = 'real';
        
        console.log(`Using REAL data for ${channel.name}: returnRate=${returnRate.toFixed(1)}%, customers=${totalCustomers}`);
      } else {
        // Estimate based on channel characteristics
        dataSource = 'estimated';
        const key = channel.key.toLowerCase();
        
        if (key.includes('offline') || key.includes('store')) {
          returnRate = 45 + Math.random() * 15; // 45-60% for offline
        } else if (key.includes('web') || key.includes('website')) {
          returnRate = 25 + Math.random() * 15; // 25-40% for web
        } else if (key.includes('shopee') || key.includes('lazada') || key.includes('marketplace')) {
          returnRate = 20 + Math.random() * 15; // 20-35% for marketplaces
        } else if (key.includes('tiktok') || key.includes('social')) {
          returnRate = 15 + Math.random() * 10; // 15-25% for social
        } else {
          returnRate = 30 + Math.random() * 10; // 30-40% default
        }
        
        avgOrderValue = channel.avgOrderValue || (channel.revenue / Math.max(channel.newCustomers || 1000, 1));
        totalCustomers = channel.newCustomers || Math.floor(channel.revenue / avgOrderValue * 0.8);
        repeatCustomers = Math.floor(totalCustomers * returnRate / 100);
        
        console.log(`Using ESTIMATED data for ${channel.name}: returnRate=${returnRate.toFixed(1)}%`);
      }

      // Calculate CLV based on actual or estimated data
      const estimatedCLV = avgOrderValue * (1 + returnRate / 100) * 2.5;

      // Customer acquisition cost (CAC)
      const newCustomers = totalCustomers - repeatCustomers;
      const cac = newCustomers > 0 ? channel.channelCost / newCustomers : 0;

      // Sustainability score
      const sustainabilityScore = (
        (returnRate / 60) * 35 +
        (channel.margin / 30) * 25 +
        (Math.min(channel.growth, 30) / 30) * 20 +
        (estimatedCLV / (cac || 1) > 3 ? 20 : (estimatedCLV / (cac || 1)) * 6.67)
      );

      return {
        ...channel,
        roi,
        efficiency,
        scalabilityScore,
        currentBudget: channel.channelCost,
        returnRate,
        estimatedCLV,
        cac,
        sustainabilityScore,
        avgOrderValue,
        totalCustomers,
        repeatCustomers,
        newCustomers,
        dataSource, // Track whether data is real or estimated
      };
    }).sort((a, b) => b.roi - a.roi);

    const realDataChannels = channelROI.filter(c => c.dataSource === 'real').length;
    const estimatedDataChannels = channelROI.filter(c => c.dataSource === 'estimated').length;
    
    console.log(`Data sources: ${realDataChannels} real, ${estimatedDataChannels} estimated`);

    console.log("Channel ROI analysis:", channelROI.map(c => ({
      name: c.name,
      roi: c.roi.toFixed(1),
      efficiency: c.efficiency.toFixed(2),
      returnRate: c.returnRate?.toFixed(1),
      sustainabilityScore: c.sustainabilityScore.toFixed(2),
      dataSource: c.dataSource,
    })));

    // Create prompt for AI analysis with retention focus
    const systemPrompt = `Bạn là chuyên gia tối ưu ngân sách marketing cho doanh nghiệp bán lẻ đa kênh tại Việt Nam, với chuyên môn về phân tích tỷ lệ khách hàng quay lại (retention) và chiến lược phát triển bền vững.

Nhiệm vụ: Phân tích dữ liệu hiệu quả các kênh bán hàng VÀ tỷ lệ khách quay lại để đề xuất phân bổ ngân sách marketing tối ưu cho tăng trưởng bền vững.

LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU:
- Một số kênh có dữ liệu khách hàng THỰC từ database (đánh dấu "real") - tin cậy hơn
- Một số kênh chỉ có dữ liệu ƯỚC TÍNH (đánh dấu "estimated") - cần thận trọng hơn
- Ưu tiên phân tích và đề xuất dựa trên dữ liệu thực khi có

NGUYÊN TẮC PHÂN TÍCH:
1. Kênh có tỷ lệ khách quay lại cao (>40%) thường đáng đầu tư vì CLV cao hơn
2. Kênh có CAC thấp và retention cao = bền vững nhất
3. Kênh tăng trưởng quá nhanh (>50%) có thể không bền vững
4. Cân bằng giữa thu hút khách mới và giữ chân khách cũ
5. Đánh giá cao hơn các kênh có dữ liệu thực

Hãy trả về JSON với format sau:
{
  "summary": "Tóm tắt ngắn về tình hình hiện tại, đặc biệt nhấn mạnh về retention và bền vững (2-3 câu)",
  "dataQualityNote": "Ghi chú về chất lượng dữ liệu: bao nhiêu kênh có dữ liệu thực vs ước tính",
  "retentionInsights": {
    "overview": "Đánh giá tổng quan về tỷ lệ khách quay lại trên các kênh",
    "bestRetentionChannel": "Kênh có tỷ lệ khách quay lại tốt nhất",
    "worstRetentionChannel": "Kênh cần cải thiện retention",
    "avgRetentionRate": 35,
    "recommendations": [
      "Đề xuất cải thiện retention cụ thể 1",
      "Đề xuất cải thiện retention cụ thể 2"
    ]
  },
  "sustainabilityAnalysis": {
    "overallScore": 72,
    "assessment": "Đánh giá tổng thể về tính bền vững của chiến lược marketing hiện tại",
    "risks": ["Rủi ro 1 về tính bền vững", "Rủi ro 2"],
    "opportunities": ["Cơ hội phát triển bền vững 1", "Cơ hội 2"],
    "longTermStrategy": "Chiến lược dài hạn 3-5 năm được đề xuất"
  },
  "recommendations": [
    {
      "channel": "Tên kênh",
      "currentShare": 15,
      "recommendedShare": 25,
      "change": "+10%",
      "rationale": "Lý do ngắn gọn bao gồm yếu tố retention",
      "expectedImpact": "Tác động dự kiến",
      "retentionStrategy": "Chiến lược cải thiện retention cho kênh này",
      "sustainabilityNote": "Ghi chú về tính bền vững"
    }
  ],
  "actionItems": [
    "Hành động cụ thể 1 (ưu tiên ngắn hạn)",
    "Hành động cụ thể 2",
    "Hành động cụ thể 3"
  ],
  "sustainableGrowthPlan": [
    "Kế hoạch phát triển bền vững 1 (trung-dài hạn)",
    "Kế hoạch phát triển bền vững 2",
    "Kế hoạch phát triển bền vững 3"
  ],
  "warnings": ["Rủi ro hoặc lưu ý nếu có"],
  "projectedResults": {
    "currentROI": 250,
    "projectedROI": 320,
    "revenueIncrease": "+15%",
    "costSaving": "5%",
    "retentionImprovement": "+5%",
    "sustainabilityImprovement": "+10 điểm"
  }
}`;

    const channelSummary = channelROI.map(c => 
      `- ${c.name} [${c.dataSource}]: Doanh thu ${(c.revenue / 1_000_000_000).toFixed(1)}B, Chi phí ${(c.channelCost / 1_000_000_000).toFixed(2)}B, ROI ${c.roi.toFixed(0)}%, Biên LN ${c.margin.toFixed(1)}%, Tăng trưởng ${c.growth}%, Tỷ lệ quay lại ${c.returnRate?.toFixed(1)}%, Khách QT ${c.repeatCustomers}/${c.totalCustomers}, CLV/CAC ${c.cac > 0 ? (c.estimatedCLV / c.cac).toFixed(1) : 'N/A'}x, Điểm bền vững ${c.sustainabilityScore.toFixed(0)}/100`
    ).join('\n');

    const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = channels.reduce((sum, c) => sum + c.channelCost, 0);
    const avgROI = totalCost > 0 ? (channels.reduce((sum, c) => sum + c.grossProfit, 0) / totalCost) * 100 : 0;
    const avgRetentionRate = channelROI.reduce((sum, c) => sum + (c.returnRate || 0), 0) / channelROI.length;
    const avgSustainability = channelROI.reduce((sum, c) => sum + c.sustainabilityScore, 0) / channelROI.length;

    const userPrompt = `Phân tích và đề xuất tối ưu ngân sách marketing với trọng tâm vào TỶ LỆ KHÁCH QUAY LẠI và PHÁT TRIỂN BỀN VỮNG:

CHẤT LƯỢNG DỮ LIỆU:
- Số kênh có dữ liệu THỰC từ database: ${realDataChannels}
- Số kênh có dữ liệu ƯỚC TÍNH: ${estimatedDataChannels}

TỔNG QUAN:
- Tổng doanh thu: ${(totalRevenue / 1_000_000_000).toFixed(1)} tỷ VND
- Tổng chi phí kênh: ${(totalCost / 1_000_000_000).toFixed(2)} tỷ VND
- ROI trung bình: ${avgROI.toFixed(0)}%
- Tỷ lệ khách quay lại trung bình: ${avgRetentionRate.toFixed(1)}%
- Điểm bền vững trung bình: ${avgSustainability.toFixed(0)}/100
- Ngân sách marketing tổng: ${(totalBudget / 1_000_000_000).toFixed(2)} tỷ VND
- Target ROI: ${targetROI}%

CHI TIẾT TỪNG KÊNH (bao gồm retention metrics và nguồn dữ liệu):
${channelSummary}

PHÂN TÍCH CHI TIẾT:
${channelROI.map(c => `- ${c.name} [Dữ liệu: ${c.dataSource === 'real' ? 'THỰC' : 'ƯỚC TÍNH'}]: 
  + ROI ${c.roi.toFixed(0)}%, Efficiency ${c.efficiency.toFixed(2)}x
  + Tỷ lệ khách quay lại: ${c.returnRate?.toFixed(1)}%
  + Khách hàng: ${c.repeatCustomers} quay lại / ${c.totalCustomers} tổng
  + CLV ước tính: ${(c.estimatedCLV / 1_000_000).toFixed(1)}M VND
  + CAC: ${(c.cac / 1_000_000).toFixed(1)}M VND
  + CLV/CAC: ${c.cac > 0 ? (c.estimatedCLV / c.cac).toFixed(1) : 'N/A'}x
  + Điểm bền vững: ${c.sustainabilityScore.toFixed(0)}/100`
).join('\n')}

YÊU CẦU PHÂN TÍCH:
1. Đánh giá tỷ lệ khách quay lại trên từng kênh - kênh nào có retention tốt/cần cải thiện
2. Đề xuất phân bổ ngân sách ưu tiên kênh có retention cao VÀ ROI tốt
3. Đưa ra chiến lược phát triển bền vững 3-5 năm
4. Cảnh báo về các kênh phụ thuộc vào khách mới quá nhiều (retention thấp)
5. Đề xuất cách cải thiện retention cho các kênh yếu
6. Ghi chú về độ tin cậy của phân tích dựa trên chất lượng dữ liệu`;

    console.log("Calling Claude for optimization analysis with retention focus...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        system: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON, no markdown or explanation.",
        messages: [
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    console.log("Claude response received, input/output tokens:", data.usage);

    let optimizationResult;
    try {
      optimizationResult = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse optimization result");
    }

    // Add channel ROI data with retention metrics to response
    const result = {
      ...optimizationResult,
      channelAnalysis: channelROI.map(c => ({
        name: c.name,
        key: c.key,
        roi: c.roi,
        efficiency: c.efficiency,
        scalabilityScore: c.scalabilityScore,
        currentBudget: c.currentBudget,
        revenue: c.revenue,
        margin: c.margin,
        returnRate: c.returnRate,
        estimatedCLV: c.estimatedCLV,
        cac: c.cac,
        clvCacRatio: c.cac > 0 ? c.estimatedCLV / c.cac : 0,
        sustainabilityScore: c.sustainabilityScore,
        totalCustomers: c.totalCustomers,
        repeatCustomers: c.repeatCustomers,
        newCustomers: c.newCustomers,
        dataSource: c.dataSource,
      })),
      dataQuality: {
        realDataChannels,
        estimatedDataChannels,
        totalChannels: channels.length,
        dataReliability: realDataChannels >= estimatedDataChannels ? 'high' : 
                        realDataChannels > 0 ? 'medium' : 'low',
      },
      generatedAt: new Date().toISOString(),
    };

    console.log("Optimization complete:", {
      recommendationCount: result.recommendations?.length || 0,
      projectedROI: result.projectedResults?.projectedROI,
      avgRetention: avgRetentionRate.toFixed(1),
      sustainabilityScore: avgSustainability.toFixed(0),
      dataQuality: result.dataQuality,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in optimize-channel-budget:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
