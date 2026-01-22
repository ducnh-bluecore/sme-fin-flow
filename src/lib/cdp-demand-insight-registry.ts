// CDP Product & Demand Insight Registry
// 25 Demand Intelligence Insights - Shift-based, not product analytics
// Focus: "How are customers redistributing their spending?"

export type DemandInsightCode = 
  // DEMAND SHIFT (D01-D05)
  | 'D01' | 'D02' | 'D03' | 'D04' | 'D05'
  // SUBSTITUTION (S01-S05)
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05'
  // BASKET STRUCTURE (B01-B05)
  | 'B01' | 'B02' | 'B03' | 'B04' | 'B05'
  // PRODUCT × CUSTOMER (P01-P05)
  | 'P01' | 'P02' | 'P03' | 'P04' | 'P05'
  // PRODUCT-LED RISK (X01-X05)
  | 'X01' | 'X02' | 'X03' | 'X04' | 'X05';

export type DemandInsightCategory = 
  | 'demand_shift' 
  | 'substitution' 
  | 'basket_structure' 
  | 'product_customer' 
  | 'product_risk';

export interface DemandInsightDefinition {
  code: DemandInsightCode;
  name: string;
  nameVi: string;
  category: DemandInsightCategory;
  description: string;
  descriptionVi: string;
  
  // Detection parameters
  detection: {
    metric: string;
    operator: 'decrease' | 'increase' | 'shift';
    thresholdPercent: number;
    windowDays: number;
    baselineDays: number;
  };
  
  // Population affected
  population: {
    type: 'top_percent' | 'repeat' | 'new' | 'all' | 'segment';
    value?: number;
    filter?: string;
    minRevenueContribution: number;
  };
  
  // Risk classification
  risk: {
    primary: string;
    primaryVi: string;
    severity: 'critical' | 'high' | 'medium';
    equityImpact: 'direct' | 'indirect' | 'forecast';
  };
  
  // Business meaning
  businessMeaning: string;
  businessMeaningVi: string;
  
  // Cooldown
  cooldownDays: number;
}

// ============================================
// A. DEMAND SHIFT INSIGHTS (D01-D05)
// "Dịch chuyển nhu cầu"
// ============================================

export const DEMAND_SHIFT_INSIGHTS: Record<string, DemandInsightDefinition> = {
  D01: {
    code: 'D01',
    name: 'Category Spend Share Decline',
    nameVi: 'Tỷ trọng chi tiêu cho nhóm sản phẩm A giảm đáng kể',
    category: 'demand_shift',
    description: 'Spending allocation to a major category decreases significantly vs baseline',
    descriptionVi: 'Tỷ trọng chi tiêu vào một nhóm sản phẩm chính giảm đáng kể so với baseline',
    detection: {
      metric: 'category_spend_share',
      operator: 'decrease',
      thresholdPercent: 15,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Core category erosion',
      primaryVi: 'Xói mòn nhóm sản phẩm chủ lực',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Customers are redistributing spend away from a core category, signaling potential structural shift in demand.',
    businessMeaningVi: 'Khách hàng đang phân bổ lại chi tiêu ra khỏi nhóm sản phẩm cốt lõi, cho thấy tiềm năng thay đổi cấu trúc nhu cầu.',
    cooldownDays: 30,
  },
  
  D02: {
    code: 'D02',
    name: 'Category Spend Growth in Repeat Customers',
    nameVi: 'Tỷ trọng chi tiêu cho nhóm sản phẩm B tăng ở khách mua lại',
    category: 'demand_shift',
    description: 'Repeat customers increasing spend share in specific category',
    descriptionVi: 'Khách mua lại tăng tỷ trọng chi tiêu vào nhóm sản phẩm cụ thể',
    detection: {
      metric: 'category_spend_share_repeat',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'repeat',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Demand reallocation',
      primaryVi: 'Tái phân bổ nhu cầu',
      severity: 'medium',
      equityImpact: 'indirect',
    },
    businessMeaning: 'Repeat customers show emerging preference for a new category, may indicate product mix evolution.',
    businessMeaningVi: 'Khách mua lại cho thấy xu hướng ưa thích nhóm sản phẩm mới, có thể là dấu hiệu tiến hóa danh mục.',
    cooldownDays: 21,
  },
  
  D03: {
    code: 'D03',
    name: 'Basic to Fashion Shift',
    nameVi: 'Nhu cầu dịch chuyển từ nhóm cơ bản sang nhóm thời trang',
    category: 'demand_shift',
    description: 'Customer spend shifting from basic/essential to fashion/lifestyle categories',
    descriptionVi: 'Chi tiêu khách hàng dịch chuyển từ nhóm cơ bản/thiết yếu sang nhóm thời trang/lifestyle',
    detection: {
      metric: 'basic_to_fashion_ratio',
      operator: 'shift',
      thresholdPercent: 25,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 30,
    },
    risk: {
      primary: 'Margin structure change',
      primaryVi: 'Thay đổi cấu trúc biên lợi nhuận',
      severity: 'medium',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Structural shift from utility-based to discretionary spending may affect revenue predictability.',
    businessMeaningVi: 'Dịch chuyển cấu trúc từ chi tiêu thiết yếu sang tùy ý có thể ảnh hưởng đến khả năng dự báo doanh thu.',
    cooldownDays: 30,
  },
  
  D04: {
    code: 'D04',
    name: 'Traditional Category Revenue Leadership Loss',
    nameVi: 'Nhóm sản phẩm truyền thống mất vai trò dẫn dắt doanh thu',
    category: 'demand_shift',
    description: 'A historically leading category losing its revenue dominance position',
    descriptionVi: 'Nhóm sản phẩm từng dẫn đầu đang mất vị trí thống trị doanh thu',
    detection: {
      metric: 'category_revenue_rank_change',
      operator: 'decrease',
      thresholdPercent: 10,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 25,
    },
    risk: {
      primary: 'Portfolio structure risk',
      primaryVi: 'Rủi ro cấu trúc danh mục',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'A core revenue driver is being displaced, requiring strategic review of product positioning.',
    businessMeaningVi: 'Động lực doanh thu cốt lõi đang bị thay thế, cần xem xét lại chiến lược định vị sản phẩm.',
    cooldownDays: 30,
  },
  
  D05: {
    code: 'D05',
    name: 'Category Mix Structure Change',
    nameVi: 'Cơ cấu chi tiêu theo category thay đổi so với baseline',
    category: 'demand_shift',
    description: 'Overall spending structure across categories deviates from historical baseline',
    descriptionVi: 'Cơ cấu chi tiêu tổng thể theo nhóm sản phẩm lệch khỏi baseline lịch sử',
    detection: {
      metric: 'category_mix_deviation',
      operator: 'shift',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 50,
    },
    risk: {
      primary: 'Demand structure instability',
      primaryVi: 'Bất ổn cấu trúc nhu cầu',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Customer demand patterns are shifting, affecting forecasting reliability and inventory planning.',
    businessMeaningVi: 'Mô hình nhu cầu khách hàng đang thay đổi, ảnh hưởng đến độ tin cậy dự báo và kế hoạch tồn kho.',
    cooldownDays: 21,
  },
};

// ============================================
// B. SUBSTITUTION INSIGHTS (S01-S05)
// "Thay thế sản phẩm"
// ============================================

export const SUBSTITUTION_INSIGHTS: Record<string, DemandInsightDefinition> = {
  S01: {
    code: 'S01',
    name: 'Category Substitution Pattern',
    nameVi: 'Khách chuyển từ nhóm A sang nhóm B trong các đơn gần đây',
    category: 'substitution',
    description: 'Customers shifting purchases from category A to category B in recent orders',
    descriptionVi: 'Khách hàng chuyển từ mua nhóm A sang nhóm B trong các đơn hàng gần đây',
    detection: {
      metric: 'category_substitution_rate',
      operator: 'increase',
      thresholdPercent: 15,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'repeat',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Product lifecycle risk',
      primaryVi: 'Rủi ro vòng đời sản phẩm',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Systematic substitution pattern emerging, may indicate category maturity or competitive pressure.',
    businessMeaningVi: 'Mô hình thay thế có hệ thống đang xuất hiện, có thể cho thấy sự bão hòa nhóm sản phẩm hoặc áp lực cạnh tranh.',
    cooldownDays: 21,
  },
  
  S02: {
    code: 'S02',
    name: 'Entry Product Substitution',
    nameVi: 'Nhóm sản phẩm mở đầu hành trình mua bị thay thế',
    category: 'substitution',
    description: 'The product group that typically starts customer journeys is being replaced',
    descriptionVi: 'Nhóm sản phẩm thường bắt đầu hành trình mua của khách đang bị thay thế',
    detection: {
      metric: 'entry_product_shift',
      operator: 'shift',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'new',
      minRevenueContribution: 10,
    },
    risk: {
      primary: 'Acquisition funnel change',
      primaryVi: 'Thay đổi phễu thu hút khách',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Customer acquisition pathway is changing, may require marketing and product strategy adjustment.',
    businessMeaningVi: 'Lộ trình thu hút khách hàng đang thay đổi, có thể cần điều chỉnh chiến lược marketing và sản phẩm.',
    cooldownDays: 30,
  },
  
  S03: {
    code: 'S03',
    name: 'Secondary Product Becoming Primary',
    nameVi: 'Sản phẩm phụ đang trở thành sản phẩm chính',
    category: 'substitution',
    description: 'A previously secondary product group is becoming the primary purchase driver',
    descriptionVi: 'Nhóm sản phẩm từng là phụ đang trở thành động lực mua chính',
    detection: {
      metric: 'primary_product_shift',
      operator: 'shift',
      thresholdPercent: 25,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Revenue dependency shift',
      primaryVi: 'Dịch chuyển phụ thuộc doanh thu',
      severity: 'medium',
      equityImpact: 'direct',
    },
    businessMeaning: 'Product hierarchy is changing, affecting margin mix and inventory allocation strategies.',
    businessMeaningVi: 'Phân cấp sản phẩm đang thay đổi, ảnh hưởng đến cơ cấu biên và chiến lược phân bổ tồn kho.',
    cooldownDays: 21,
  },
  
  S04: {
    code: 'S04',
    name: 'High-Value Customer Substitution',
    nameVi: 'Sự thay thế diễn ra mạnh ở khách giá trị cao',
    category: 'substitution',
    description: 'Substitution pattern is more pronounced among high-CLV customers',
    descriptionVi: 'Mô hình thay thế rõ ràng hơn ở nhóm khách hàng CLV cao',
    detection: {
      metric: 'hv_substitution_rate',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'top_percent',
      value: 20,
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Core customer behavior change',
      primaryVi: 'Thay đổi hành vi khách cốt lõi',
      severity: 'critical',
      equityImpact: 'direct',
    },
    businessMeaning: 'Most valuable customers are changing their product preferences, high-impact equity risk.',
    businessMeaningVi: 'Khách hàng có giá trị nhất đang thay đổi sở thích sản phẩm, rủi ro tài sản khách hàng cao.',
    cooldownDays: 14,
  },
  
  S05: {
    code: 'S05',
    name: 'Substitution Causing AOV Decline',
    nameVi: 'Thay thế sản phẩm dẫn đến giảm AOV',
    category: 'substitution',
    description: 'Product substitution pattern is correlated with declining average order value',
    descriptionVi: 'Mô hình thay thế sản phẩm tương quan với giảm giá trị đơn hàng trung bình',
    detection: {
      metric: 'substitution_aov_impact',
      operator: 'decrease',
      thresholdPercent: 12,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 30,
    },
    risk: {
      primary: 'Value dilution',
      primaryVi: 'Pha loãng giá trị',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Customers are substituting with lower-value alternatives, eroding per-transaction revenue.',
    businessMeaningVi: 'Khách hàng đang thay thế bằng lựa chọn giá trị thấp hơn, xói mòn doanh thu mỗi giao dịch.',
    cooldownDays: 14,
  },
};

// ============================================
// C. BASKET STRUCTURE INSIGHTS (B01-B05)
// "Cấu trúc giỏ hàng"
// ============================================

export const BASKET_STRUCTURE_INSIGHTS: Record<string, DemandInsightDefinition> = {
  B01: {
    code: 'B01',
    name: 'Category Count per Order Decline',
    nameVi: 'Số nhóm sản phẩm trong mỗi đơn giảm',
    category: 'basket_structure',
    description: 'Average number of product categories per order is decreasing',
    descriptionVi: 'Số lượng nhóm sản phẩm trung bình mỗi đơn hàng đang giảm',
    detection: {
      metric: 'categories_per_order',
      operator: 'decrease',
      thresholdPercent: 15,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Cross-sell erosion',
      primaryVi: 'Xói mòn bán chéo',
      severity: 'medium',
      equityImpact: 'indirect',
    },
    businessMeaning: 'Customers are buying from fewer categories per visit, reducing basket depth.',
    businessMeaningVi: 'Khách hàng mua từ ít nhóm sản phẩm hơn mỗi lần ghé, giảm độ sâu giỏ hàng.',
    cooldownDays: 21,
  },
  
  B02: {
    code: 'B02',
    name: 'Single Category Order Concentration',
    nameVi: 'Đơn hàng ngày càng tập trung vào 1 category',
    category: 'basket_structure',
    description: 'Proportion of single-category orders is increasing',
    descriptionVi: 'Tỷ lệ đơn hàng chỉ có 1 nhóm sản phẩm đang tăng',
    detection: {
      metric: 'single_category_order_rate',
      operator: 'increase',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 30,
    },
    risk: {
      primary: 'Basket value risk',
      primaryVi: 'Rủi ro giá trị giỏ hàng',
      severity: 'medium',
      equityImpact: 'direct',
    },
    businessMeaning: 'Order composition becoming simpler, potential for lower lifetime value trajectories.',
    businessMeaningVi: 'Cấu trúc đơn hàng đang đơn giản hóa, tiềm năng quỹ đạo giá trị vòng đời thấp hơn.',
    cooldownDays: 21,
  },
  
  B03: {
    code: 'B03',
    name: 'Cross-Category Rate Decline',
    nameVi: 'Tỷ lệ cross-category giảm',
    category: 'basket_structure',
    description: 'Rate of customers purchasing across multiple categories is declining',
    descriptionVi: 'Tỷ lệ khách hàng mua từ nhiều nhóm sản phẩm đang giảm',
    detection: {
      metric: 'cross_category_rate',
      operator: 'decrease',
      thresholdPercent: 15,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'repeat',
      minRevenueContribution: 35,
    },
    risk: {
      primary: 'Engagement narrowing',
      primaryVi: 'Thu hẹp tương tác',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Customers engaging with fewer product lines, may limit future value expansion.',
    businessMeaningVi: 'Khách hàng tương tác với ít dòng sản phẩm hơn, có thể hạn chế mở rộng giá trị tương lai.',
    cooldownDays: 30,
  },
  
  B04: {
    code: 'B04',
    name: 'Basket Diversity Loss',
    nameVi: 'Giỏ hàng mất tính đa dạng',
    category: 'basket_structure',
    description: 'Overall basket diversity index is declining',
    descriptionVi: 'Chỉ số đa dạng giỏ hàng tổng thể đang giảm',
    detection: {
      metric: 'basket_diversity_index',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Product mix vulnerability',
      primaryVi: 'Dễ tổn thương cơ cấu sản phẩm',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Basket composition is becoming less diverse, increasing revenue concentration risk.',
    businessMeaningVi: 'Cấu trúc giỏ hàng đang kém đa dạng hơn, tăng rủi ro tập trung doanh thu.',
    cooldownDays: 21,
  },
  
  B05: {
    code: 'B05',
    name: 'Category Dependency Increase',
    nameVi: 'Giá trị giỏ hàng phụ thuộc vào ít nhóm hơn',
    category: 'basket_structure',
    description: 'Basket value increasingly depends on fewer product categories',
    descriptionVi: 'Giá trị giỏ hàng ngày càng phụ thuộc vào ít nhóm sản phẩm hơn',
    detection: {
      metric: 'category_hhi_index',
      operator: 'increase',
      thresholdPercent: 25,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 50,
    },
    risk: {
      primary: 'Concentration dependency',
      primaryVi: 'Phụ thuộc tập trung',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Revenue becoming more dependent on specific categories, increasing vulnerability.',
    businessMeaningVi: 'Doanh thu ngày càng phụ thuộc vào các nhóm sản phẩm cụ thể, tăng tính dễ tổn thương.',
    cooldownDays: 30,
  },
};

// ============================================
// D. PRODUCT × CUSTOMER INSIGHTS (P01-P05)
// "Tương tác Sản phẩm × Khách hàng"
// ============================================

export const PRODUCT_CUSTOMER_INSIGHTS: Record<string, DemandInsightDefinition> = {
  P01: {
    code: 'P01',
    name: 'High-CLV Traditional Category Decline',
    nameVi: 'Khách CLV cao giảm mua nhóm truyền thống',
    category: 'product_customer',
    description: 'High-CLV customers reducing purchases from traditional/core categories',
    descriptionVi: 'Khách hàng CLV cao giảm mua từ nhóm sản phẩm truyền thống/cốt lõi',
    detection: {
      metric: 'hclv_traditional_spend',
      operator: 'decrease',
      thresholdPercent: 15,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'top_percent',
      value: 20,
      minRevenueContribution: 40,
    },
    risk: {
      primary: 'Core customer defection signal',
      primaryVi: 'Tín hiệu ly khai khách cốt lõi',
      severity: 'critical',
      equityImpact: 'direct',
    },
    businessMeaning: 'Best customers changing their relationship with core products, early churn indicator.',
    businessMeaningVi: 'Khách hàng tốt nhất đang thay đổi mối quan hệ với sản phẩm cốt lõi, chỉ báo sớm rời bỏ.',
    cooldownDays: 14,
  },
  
  P02: {
    code: 'P02',
    name: 'New Customer Core Category Avoidance',
    nameVi: 'Khách mới không còn chọn nhóm sản phẩm cốt lõi',
    category: 'product_customer',
    description: 'New customers are not choosing the historically core product categories',
    descriptionVi: 'Khách hàng mới không chọn nhóm sản phẩm cốt lõi theo lịch sử',
    detection: {
      metric: 'new_customer_core_adoption',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'new',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Acquisition quality shift',
      primaryVi: 'Dịch chuyển chất lượng khách mới',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'New cohort has different product preferences, may indicate market positioning change.',
    businessMeaningVi: 'Cohort mới có sở thích sản phẩm khác, có thể cho thấy thay đổi vị thế thị trường.',
    cooldownDays: 30,
  },
  
  P03: {
    code: 'P03',
    name: 'Loyal Customer Preference Change',
    nameVi: 'Khách trung thành thay đổi nhóm sản phẩm ưa thích',
    category: 'product_customer',
    description: 'Loyal customers shifting their preferred product categories',
    descriptionVi: 'Khách hàng trung thành đang thay đổi nhóm sản phẩm ưa thích',
    detection: {
      metric: 'loyal_preference_shift',
      operator: 'shift',
      thresholdPercent: 25,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'segment',
      filter: 'loyal_customers',
      minRevenueContribution: 35,
    },
    risk: {
      primary: 'Relationship evolution',
      primaryVi: 'Tiến hóa mối quan hệ',
      severity: 'medium',
      equityImpact: 'indirect',
    },
    businessMeaning: 'Even loyal customers are evolving their preferences, requiring product strategy review.',
    businessMeaningVi: 'Ngay cả khách trung thành cũng đang tiến hóa sở thích, cần xem xét lại chiến lược sản phẩm.',
    cooldownDays: 30,
  },
  
  P04: {
    code: 'P04',
    name: 'Low Retention Category Identified',
    nameVi: 'Nhóm sản phẩm X giữ chân khách kém',
    category: 'product_customer',
    description: 'Specific category shows significantly lower customer retention rates',
    descriptionVi: 'Nhóm sản phẩm cụ thể cho thấy tỷ lệ giữ chân khách thấp hơn đáng kể',
    detection: {
      metric: 'category_retention_rate',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Product-led churn',
      primaryVi: 'Rời bỏ do sản phẩm',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Category may be creating negative customer experiences, affecting retention.',
    businessMeaningVi: 'Nhóm sản phẩm có thể đang tạo trải nghiệm tiêu cực, ảnh hưởng đến giữ chân.',
    cooldownDays: 21,
  },
  
  P05: {
    code: 'P05',
    name: 'High Churn Category Association',
    nameVi: 'Nhóm sản phẩm Y gắn với churn cao',
    category: 'product_customer',
    description: 'Category purchase is statistically associated with higher churn probability',
    descriptionVi: 'Mua nhóm sản phẩm này có liên quan thống kê với xác suất churn cao hơn',
    detection: {
      metric: 'category_churn_correlation',
      operator: 'increase',
      thresholdPercent: 30,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Product quality/fit issue',
      primaryVi: 'Vấn đề chất lượng/phù hợp sản phẩm',
      severity: 'critical',
      equityImpact: 'direct',
    },
    businessMeaning: 'Purchasing this category correlates with customer exit, requires investigation.',
    businessMeaningVi: 'Mua nhóm sản phẩm này tương quan với khách rời bỏ, cần điều tra.',
    cooldownDays: 14,
  },
};

// ============================================
// E. PRODUCT-LED RISK INSIGHTS (X01-X05)
// "Tín hiệu rủi ro từ sản phẩm"
// ============================================

export const PRODUCT_RISK_INSIGHTS: Record<string, DemandInsightDefinition> = {
  X01: {
    code: 'X01',
    name: 'Low Repeat Rate Category',
    nameVi: 'Nhóm sản phẩm có tỷ lệ quay lại thấp hơn baseline',
    category: 'product_risk',
    description: 'Category showing repeat purchase rate below baseline',
    descriptionVi: 'Nhóm sản phẩm cho thấy tỷ lệ mua lại thấp hơn baseline',
    detection: {
      metric: 'category_repeat_rate',
      operator: 'decrease',
      thresholdPercent: 20,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Product stickiness decline',
      primaryVi: 'Giảm sự bám dính sản phẩm',
      severity: 'high',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Category not generating repeat behavior, may affect customer lifetime value.',
    businessMeaningVi: 'Nhóm sản phẩm không tạo hành vi mua lại, có thể ảnh hưởng giá trị vòng đời.',
    cooldownDays: 21,
  },
  
  X02: {
    code: 'X02',
    name: 'Terminal Category Pattern',
    nameVi: 'Khách kết thúc hành trình mua ở nhóm A',
    category: 'product_risk',
    description: 'Customers ending their purchase journey after buying from specific category',
    descriptionVi: 'Khách hàng kết thúc hành trình mua sau khi mua từ nhóm sản phẩm cụ thể',
    detection: {
      metric: 'terminal_purchase_rate',
      operator: 'increase',
      thresholdPercent: 25,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Journey termination point',
      primaryVi: 'Điểm kết thúc hành trình',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Category purchase often marks the end of customer relationship, needs investigation.',
    businessMeaningVi: 'Mua nhóm sản phẩm này thường đánh dấu kết thúc mối quan hệ khách, cần điều tra.',
    cooldownDays: 21,
  },
  
  X03: {
    code: 'X03',
    name: 'High Return Category',
    nameVi: 'Nhóm sản phẩm làm tăng hoàn trả',
    category: 'product_risk',
    description: 'Category showing elevated return rates compared to baseline',
    descriptionVi: 'Nhóm sản phẩm cho thấy tỷ lệ hoàn trả cao hơn so với baseline',
    detection: {
      metric: 'category_return_rate',
      operator: 'increase',
      thresholdPercent: 30,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 15,
    },
    risk: {
      primary: 'Margin erosion',
      primaryVi: 'Xói mòn biên lợi nhuận',
      severity: 'high',
      equityImpact: 'direct',
    },
    businessMeaning: 'Category generating returns that erode net revenue and operational costs.',
    businessMeaningVi: 'Nhóm sản phẩm tạo hoàn trả làm xói mòn doanh thu ròng và chi phí vận hành.',
    cooldownDays: 14,
  },
  
  X04: {
    code: 'X04',
    name: 'Demand Volatility in Category',
    nameVi: 'Nhu cầu nhóm A biến động mạnh theo thời gian',
    category: 'product_risk',
    description: 'Category demand showing high volatility over time',
    descriptionVi: 'Nhu cầu nhóm sản phẩm cho thấy biến động cao theo thời gian',
    detection: {
      metric: 'category_demand_volatility',
      operator: 'increase',
      thresholdPercent: 40,
      windowDays: 90,
      baselineDays: 90,
    },
    population: {
      type: 'all',
      minRevenueContribution: 20,
    },
    risk: {
      primary: 'Forecasting unreliability',
      primaryVi: 'Dự báo không đáng tin cậy',
      severity: 'medium',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Unpredictable demand patterns make inventory and revenue planning difficult.',
    businessMeaningVi: 'Mô hình nhu cầu không thể dự đoán gây khó khăn cho kế hoạch tồn kho và doanh thu.',
    cooldownDays: 30,
  },
  
  X05: {
    code: 'X05',
    name: 'Revenue Over-Dependence',
    nameVi: 'Doanh thu phụ thuộc quá nhiều vào một nhóm sản phẩm',
    category: 'product_risk',
    description: 'Revenue concentration in single category exceeds risk threshold',
    descriptionVi: 'Tập trung doanh thu vào một nhóm sản phẩm vượt ngưỡng rủi ro',
    detection: {
      metric: 'category_revenue_concentration',
      operator: 'increase',
      thresholdPercent: 50,
      windowDays: 60,
      baselineDays: 60,
    },
    population: {
      type: 'all',
      minRevenueContribution: 50,
    },
    risk: {
      primary: 'Single point of failure',
      primaryVi: 'Điểm thất bại đơn lẻ',
      severity: 'critical',
      equityImpact: 'forecast',
    },
    businessMeaning: 'Excessive dependence on single category creates business vulnerability.',
    businessMeaningVi: 'Phụ thuộc quá mức vào một nhóm sản phẩm tạo tính dễ tổn thương cho doanh nghiệp.',
    cooldownDays: 30,
  },
};

// ============================================
// COMBINED REGISTRY
// ============================================

export const CDP_DEMAND_INSIGHT_REGISTRY: Record<DemandInsightCode, DemandInsightDefinition> = {
  ...DEMAND_SHIFT_INSIGHTS,
  ...SUBSTITUTION_INSIGHTS,
  ...BASKET_STRUCTURE_INSIGHTS,
  ...PRODUCT_CUSTOMER_INSIGHTS,
  ...PRODUCT_RISK_INSIGHTS,
} as Record<DemandInsightCode, DemandInsightDefinition>;

// Category metadata
export const DEMAND_INSIGHT_CATEGORIES: Record<DemandInsightCategory, {
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: string;
  color: string;
  count: number;
}> = {
  demand_shift: {
    name: 'Demand Shift',
    nameVi: 'Dịch chuyển nhu cầu',
    description: 'Changes in spending allocation across categories',
    descriptionVi: 'Thay đổi phân bổ chi tiêu theo nhóm sản phẩm',
    icon: 'TrendingUp',
    color: 'blue',
    count: 5,
  },
  substitution: {
    name: 'Substitution',
    nameVi: 'Thay thế sản phẩm',
    description: 'Product switching and replacement patterns',
    descriptionVi: 'Mô hình chuyển đổi và thay thế sản phẩm',
    icon: 'ArrowLeftRight',
    color: 'purple',
    count: 5,
  },
  basket_structure: {
    name: 'Basket Structure',
    nameVi: 'Cấu trúc giỏ hàng',
    description: 'Changes in order composition and diversity',
    descriptionVi: 'Thay đổi cấu trúc và tính đa dạng đơn hàng',
    icon: 'ShoppingCart',
    color: 'amber',
    count: 5,
  },
  product_customer: {
    name: 'Product × Customer',
    nameVi: 'Sản phẩm × Khách hàng',
    description: 'Interaction between customer segments and products',
    descriptionVi: 'Tương tác giữa phân khúc khách và sản phẩm',
    icon: 'Users',
    color: 'emerald',
    count: 5,
  },
  product_risk: {
    name: 'Product-Led Risk',
    nameVi: 'Rủi ro từ sản phẩm',
    description: 'Product-driven risk signals affecting customer value',
    descriptionVi: 'Tín hiệu rủi ro từ sản phẩm ảnh hưởng giá trị khách',
    icon: 'AlertTriangle',
    color: 'red',
    count: 5,
  },
};

// Helper functions
export function getDemandInsightsByCategory(category: DemandInsightCategory): DemandInsightDefinition[] {
  return Object.values(CDP_DEMAND_INSIGHT_REGISTRY).filter(insight => insight.category === category);
}

export function getDemandInsightDefinition(code: DemandInsightCode): DemandInsightDefinition | undefined {
  return CDP_DEMAND_INSIGHT_REGISTRY[code];
}

export function getCategoryColor(category: DemandInsightCategory): string {
  const colors: Record<DemandInsightCategory, string> = {
    demand_shift: 'bg-blue-50 text-blue-700 border-blue-200',
    substitution: 'bg-purple-50 text-purple-700 border-purple-200',
    basket_structure: 'bg-amber-50 text-amber-700 border-amber-200',
    product_customer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    product_risk: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[category];
}

export function getSeverityStyle(severity: 'critical' | 'high' | 'medium'): string {
  const styles: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
    high: 'bg-warning/10 text-warning-foreground border-warning/30',
    medium: 'bg-muted text-muted-foreground border-border',
  };
  return styles[severity];
}
