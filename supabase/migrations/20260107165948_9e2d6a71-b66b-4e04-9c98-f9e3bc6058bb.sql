-- Create table to store formula definitions
CREATE TABLE public.formula_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  formula_key TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  formula TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  example TEXT,
  usage_locations TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, formula_key)
);

-- Enable RLS
ALTER TABLE public.formula_definitions ENABLE ROW LEVEL SECURITY;

-- Policies for formula_definitions
CREATE POLICY "Users can view formulas for their tenant or system formulas"
ON public.formula_definitions
FOR SELECT
USING (
  is_system = true 
  OR tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage formulas for their tenant"
ON public.formula_definitions
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- Insert system formulas for Monte Carlo and Risk Analysis
INSERT INTO public.formula_definitions (category, formula_key, name_vi, name_en, formula, description, variables, example, usage_locations, is_system) VALUES
-- Monte Carlo Simulation
('monte_carlo', 'monte_carlo_simulation', 'Mô phỏng Monte Carlo', 'Monte Carlo Simulation', 
'Value_i = BaseValue × (1 + Impact × RandomFactor_i)', 
'Chạy N lần mô phỏng với các yếu tố ngẫu nhiên để ước tính phân phối kết quả có thể xảy ra',
'[{"name": "BaseValue", "desc": "Giá trị cơ sở (EBITDA, Cash, Revenue)"}, {"name": "Impact", "desc": "Mức độ tác động (-1 đến 1)"}, {"name": "RandomFactor", "desc": "Hệ số ngẫu nhiên từ phân phối chuẩn"}]',
'Base = 1,000M, Impact = -20%, Random = 0.8 → Value = 1,000 × (1 + (-0.2) × 0.8) = 840M',
ARRAY['stress_testing', 'risk_dashboard'], true),

('monte_carlo', 'normal_random', 'Phân phối chuẩn (Box-Muller)', 'Normal Distribution (Box-Muller)', 
'Z = √(-2 × ln(U1)) × cos(2π × U2)', 
'Tạo số ngẫu nhiên theo phân phối chuẩn từ 2 số ngẫu nhiên đều',
'[{"name": "U1, U2", "desc": "Số ngẫu nhiên đều trong (0,1)"}, {"name": "Z", "desc": "Số ngẫu nhiên chuẩn N(0,1)"}]',
'U1 = 0.3, U2 = 0.7 → Z = √(-2 × ln(0.3)) × cos(2π × 0.7) ≈ 0.52',
ARRAY['monte_carlo_simulation'], true),

-- Risk Metrics
('risk_metrics', 'value_at_risk', 'Giá trị rủi ro (VaR)', 'Value at Risk (VaR)', 
'VaR = BaseValue - Percentile(Results, α)', 
'Khoản lỗ tối đa có thể xảy ra với độ tin cậy (1-α)%',
'[{"name": "BaseValue", "desc": "Giá trị cơ sở"}, {"name": "Results", "desc": "Mảng kết quả mô phỏng"}, {"name": "α", "desc": "Mức ý nghĩa (thường 5% hoặc 1%)"}]',
'Base = 1,000M, P5 = 750M → VaR(95%) = 1,000 - 750 = 250M',
ARRAY['stress_testing', 'risk_dashboard'], true),

('risk_metrics', 'expected_shortfall', 'Kỳ vọng thiếu hụt (CVaR)', 'Expected Shortfall (CVaR)', 
'ES = E[Loss | Loss > VaR] = Mean(Results < Percentile_α)', 
'Kỳ vọng lỗ trong trường hợp xấu nhất vượt quá VaR',
'[{"name": "Results", "desc": "Các kết quả dưới ngưỡng VaR"}, {"name": "ES", "desc": "Giá trị kỳ vọng thiếu hụt"}]',
'Các giá trị < P5: [700, 720, 680, 750] → ES = Mean = 712.5M',
ARRAY['stress_testing', 'risk_dashboard'], true),

('risk_metrics', 'expected_loss', 'Kỳ vọng tổn thất', 'Expected Loss', 
'EL = |Impact| × Probability × BaseValue', 
'Tổn thất kỳ vọng dựa trên xác suất và mức độ tác động',
'[{"name": "Impact", "desc": "Mức độ tác động (%)"}, {"name": "Probability", "desc": "Xác suất xảy ra (%)"}, {"name": "BaseValue", "desc": "Giá trị cơ sở"}]',
'Impact = 20%, Prob = 30%, Base = 1,000M → EL = 0.2 × 0.3 × 1,000 = 60M',
ARRAY['stress_testing', 'risk_dashboard'], true),

('risk_metrics', 'cash_impact', 'Tác động dòng tiền', 'Cash Impact', 
'CashImpact = CurrentCash × Impact%', 
'Ước tính tác động trực tiếp lên dòng tiền hiện tại',
'[{"name": "CurrentCash", "desc": "Tiền mặt hiện tại"}, {"name": "Impact%", "desc": "Phần trăm tác động"}]',
'Cash = 500M, Impact = -15% → CashImpact = 500 × (-0.15) = -75M',
ARRAY['stress_testing', 'cash_forecast'], true),

-- Statistical Measures
('statistics', 'percentile', 'Phân vị', 'Percentile', 
'P_k = Value tại vị trí (k/100) × (n-1)', 
'Giá trị mà k% dữ liệu nằm dưới nó',
'[{"name": "k", "desc": "Phân vị cần tìm (5, 25, 50, 75, 95)"}, {"name": "n", "desc": "Số lượng mẫu"}, {"name": "Values", "desc": "Mảng giá trị đã sắp xếp"}]',
'Data sorted: [100, 200, 300, 400, 500], P50 = Value tại (50/100)×4 = 2 → 300',
ARRAY['monte_carlo_simulation', 'statistics'], true),

('statistics', 'standard_deviation', 'Độ lệch chuẩn', 'Standard Deviation', 
'σ = √(Σ(xi - μ)² / n)', 
'Đo lường mức độ phân tán của dữ liệu quanh giá trị trung bình',
'[{"name": "xi", "desc": "Các giá trị trong mẫu"}, {"name": "μ", "desc": "Giá trị trung bình"}, {"name": "n", "desc": "Số lượng mẫu"}]',
'Data: [100, 200, 300], μ = 200, σ = √((100-200)² + (200-200)² + (300-200)²)/3 = 81.6',
ARRAY['monte_carlo_simulation', 'variance_analysis'], true),

('statistics', 'confidence_interval', 'Khoảng tin cậy', 'Confidence Interval', 
'CI = [P_α/2, P_(1-α/2)]', 
'Khoảng giá trị chứa kết quả thực với độ tin cậy (1-α)%',
'[{"name": "P", "desc": "Phân vị"}, {"name": "α", "desc": "Mức ý nghĩa"}]',
'CI 90% = [P5, P95] = [750M, 1,200M]',
ARRAY['monte_carlo_simulation', 'forecasting'], true),

-- Scenario Analysis
('scenario', 'scenario_impact', 'Tác động kịch bản', 'Scenario Impact', 
'ScenarioValue = Σ(Factor_i × Weight_i × BaseValue)', 
'Tổng hợp tác động từ nhiều yếu tố trong một kịch bản',
'[{"name": "Factor_i", "desc": "Mức độ tác động của yếu tố i"}, {"name": "Weight_i", "desc": "Trọng số của yếu tố i"}, {"name": "BaseValue", "desc": "Giá trị cơ sở"}]',
'Revenue -10% (w=0.5), Cost +5% (w=0.3), FX -3% (w=0.2) → Total = -10×0.5 + 5×0.3 + (-3)×0.2 = -4.1%',
ARRAY['stress_testing', 'what_if'], true),

('scenario', 'probability_weighted', 'Giá trị theo xác suất', 'Probability Weighted Value', 
'PWV = Σ(Scenario_i × Probability_i)', 
'Giá trị kỳ vọng dựa trên xác suất của các kịch bản',
'[{"name": "Scenario_i", "desc": "Giá trị của kịch bản i"}, {"name": "Probability_i", "desc": "Xác suất của kịch bản i"}]',
'Best: 1,200M (20%), Base: 1,000M (50%), Worst: 700M (30%) → PWV = 1,200×0.2 + 1,000×0.5 + 700×0.3 = 950M',
ARRAY['stress_testing', 'forecasting'], true);

-- Create index for faster queries
CREATE INDEX idx_formula_definitions_category ON public.formula_definitions(category);
CREATE INDEX idx_formula_definitions_tenant ON public.formula_definitions(tenant_id);

-- Create trigger for updated_at
CREATE TRIGGER update_formula_definitions_updated_at
BEFORE UPDATE ON public.formula_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();