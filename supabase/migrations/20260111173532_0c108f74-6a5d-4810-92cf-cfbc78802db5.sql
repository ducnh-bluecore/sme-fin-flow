-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'away', 'offline')),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performance INTEGER DEFAULT 80 CHECK (performance >= 0 AND performance <= 100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_team_members_tenant_id ON public.team_members(tenant_id);
CREATE INDEX idx_team_members_department ON public.team_members(department);
CREATE INDEX idx_team_members_status ON public.team_members(status);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users
CREATE POLICY "Users can view team members in their tenant"
ON public.team_members FOR SELECT
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

CREATE POLICY "Users can insert team members in their tenant"
ON public.team_members FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

CREATE POLICY "Users can update team members in their tenant"
ON public.team_members FOR UPDATE
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

CREATE POLICY "Users can delete team members in their tenant"
ON public.team_members FOR DELETE
USING (tenant_id IN (
  SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data
INSERT INTO public.team_members (tenant_id, name, email, phone, role, department, location, status, join_date, performance) VALUES
('11111111-1111-1111-1111-111111111111', 'Nguyễn Văn An', 'nva@company.com', '0901234567', 'Store Manager', 'Bán hàng', 'Quận 1', 'active', '2022-03-15', 95),
('11111111-1111-1111-1111-111111111111', 'Trần Thị Bình', 'ttb@company.com', '0902345678', 'Sales Lead', 'Bán hàng', 'Quận 3', 'active', '2021-08-20', 88),
('11111111-1111-1111-1111-111111111111', 'Lê Văn Cường', 'lvc@company.com', '0903456789', 'Sales Executive', 'Bán hàng', 'Quận 7', 'away', '2023-01-10', 82),
('11111111-1111-1111-1111-111111111111', 'Phạm Thị Dung', 'ptd@company.com', '0904567890', 'Warehouse Manager', 'Kho vận', 'Kho Tân Phú', 'active', '2020-11-05', 91),
('11111111-1111-1111-1111-111111111111', 'Hoàng Văn Đức', 'hvd@company.com', '0905678901', 'Inventory Specialist', 'Kho vận', 'Kho Thủ Đức', 'active', '2022-06-12', 87),
('11111111-1111-1111-1111-111111111111', 'Mai Thị Hoa', 'mth@company.com', '0906789012', 'Senior Accountant', 'Kế toán', 'Văn phòng', 'active', '2019-04-22', 93),
('11111111-1111-1111-1111-111111111111', 'Đỗ Văn Hùng', 'dvh@company.com', '0907890123', 'Junior Accountant', 'Kế toán', 'Văn phòng', 'active', '2023-02-28', 78),
('11111111-1111-1111-1111-111111111111', 'Vũ Thị Lan', 'vtl@company.com', '0908901234', 'HR Manager', 'Nhân sự', 'Văn phòng', 'away', '2022-09-14', 85),
('11111111-1111-1111-1111-111111111111', 'Ngô Văn Minh', 'nvm@company.com', '0909012345', 'IT Support', 'IT', 'Văn phòng', 'active', '2021-05-18', 89),
('11111111-1111-1111-1111-111111111111', 'Trương Thị Ngọc', 'ttn@company.com', '0910123456', 'Customer Service Lead', 'CSKH', 'Văn phòng', 'active', '2020-07-30', 92),
('11111111-1111-1111-1111-111111111111', 'Phan Văn Phúc', 'pvp@company.com', '0911234567', 'Customer Service', 'CSKH', 'Văn phòng', 'offline', '2023-06-01', 76),
('11111111-1111-1111-1111-111111111111', 'Lý Thị Quỳnh', 'ltq@company.com', '0912345678', 'Marketing Manager', 'Marketing', 'Văn phòng', 'active', '2019-10-15', 94),
('11111111-1111-1111-1111-111111111111', 'Bùi Văn Sơn', 'bvs@company.com', '0913456789', 'Digital Marketing', 'Marketing', 'Văn phòng', 'active', '2022-01-20', 81),
('11111111-1111-1111-1111-111111111111', 'Đinh Thị Thảo', 'dtt@company.com', '0914567890', 'Area Manager', 'Bán hàng', 'Quận 10', 'active', '2018-08-10', 96),
('11111111-1111-1111-1111-111111111111', 'Cao Văn Tú', 'cvt@company.com', '0915678901', 'Regional Sales', 'Bán hàng', 'Bình Dương', 'away', '2021-12-05', 84);