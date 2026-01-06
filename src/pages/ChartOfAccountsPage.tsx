import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Plus, Search, ChevronRight, ChevronDown, Edit2, Trash2, 
  MoreHorizontal, FileText, ArrowUpDown, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  useGLAccounts, 
  useCreateGLAccount, 
  useUpdateGLAccount, 
  useDeleteGLAccount,
  GLAccount,
  GLAccountInput 
} from '@/hooks/useGLAccounts';
import { formatCurrency } from '@/lib/formatters';

const accountTypes = [
  { value: 'asset', label: 'Tài sản', color: 'bg-blue-500' },
  { value: 'liability', label: 'Nợ phải trả', color: 'bg-red-500' },
  { value: 'equity', label: 'Vốn chủ sở hữu', color: 'bg-purple-500' },
  { value: 'revenue', label: 'Doanh thu', color: 'bg-green-500' },
  { value: 'expense', label: 'Chi phí', color: 'bg-orange-500' },
];

const normalBalances = [
  { value: 'debit', label: 'Nợ (Debit)' },
  { value: 'credit', label: 'Có (Credit)' },
];

export default function ChartOfAccountsPage() {
  const { data: accounts, isLoading } = useGLAccounts();
  const createAccount = useCreateGLAccount();
  const updateAccount = useUpdateGLAccount();
  const deleteAccount = useDeleteGLAccount();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);

  const [formData, setFormData] = useState<GLAccountInput>({
    account_code: '',
    account_name: '',
    account_type: 'asset',
    normal_balance: 'debit',
    is_header: false,
    is_active: true,
    description: '',
  });

  const resetForm = () => {
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'asset',
      normal_balance: 'debit',
      is_header: false,
      is_active: true,
      description: '',
    });
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredAccounts = accounts?.filter(account => {
    const matchesSearch = 
      account.account_code.toLowerCase().includes(search.toLowerCase()) ||
      account.account_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || account.account_type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  // Build tree structure
  const buildTree = () => {
    const accountMap = new Map<string, GLAccount & { children: (GLAccount & { children: any[] })[] }>();
    const roots: (GLAccount & { children: any[] })[] = [];

    filteredAccounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    filteredAccounts.forEach(account => {
      const node = accountMap.get(account.id)!;
      if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
        accountMap.get(account.parent_account_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots.sort((a, b) => a.account_code.localeCompare(b.account_code));
  };

  const handleSubmit = async () => {
    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...formData });
      setEditingAccount(null);
    } else {
      await createAccount.mutateAsync(formData);
    }
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (account: GLAccount) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_subtype: account.account_subtype,
      normal_balance: account.normal_balance,
      parent_account_id: account.parent_account_id,
      is_header: account.is_header,
      is_active: account.is_active,
      description: account.description,
    });
    setIsCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      await deleteAccount.mutateAsync(id);
    }
  };

  const renderAccountRow = (account: GLAccount & { children: any[] }, level = 0) => {
    const hasChildren = account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const typeConfig = accountTypes.find(t => t.value === account.account_type);

    return (
      <>
        <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpanded(account.id)} className="p-1 hover:bg-muted rounded">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <span className="font-mono font-medium">{account.account_code}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {account.is_header && <FileText className="w-4 h-4 text-muted-foreground" />}
              <span className={account.is_header ? 'font-semibold' : ''}>{account.account_name}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className={`${typeConfig?.color} text-white`}>
              {typeConfig?.label}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {account.normal_balance === 'debit' ? 'Nợ' : 'Có'}
            </Badge>
          </TableCell>
          <TableCell className="text-right font-mono">
            {formatCurrency(account.current_balance)}
          </TableCell>
          <TableCell>
            <Badge variant={account.is_active ? 'default' : 'secondary'}>
              {account.is_active ? 'Hoạt động' : 'Ngừng'}
            </Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(account)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </DropdownMenuItem>
                {!account.is_system && (
                  <DropdownMenuItem 
                    onClick={() => handleDelete(account.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {isExpanded && account.children.map((child: any) => renderAccountRow(child, level + 1))}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tree = buildTree();

  return (
    <>
      <Helmet>
        <title>Hệ thống tài khoản | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Hệ thống tài khoản
            </h1>
            <p className="text-muted-foreground">Chart of Accounts - Quản lý danh mục tài khoản kế toán</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingAccount(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Thêm tài khoản
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}</DialogTitle>
                <DialogDescription>
                  Nhập thông tin tài khoản kế toán
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã tài khoản *</Label>
                    <Input
                      placeholder="VD: 111, 1111"
                      value={formData.account_code}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại tài khoản *</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tên tài khoản *</Label>
                  <Input
                    placeholder="Nhập tên tài khoản"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Số dư bình thường</Label>
                    <Select
                      value={formData.normal_balance}
                      onValueChange={(value) => setFormData({ ...formData, normal_balance: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {normalBalances.map(nb => (
                          <SelectItem key={nb.value} value={nb.value}>
                            {nb.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tài khoản cha</Label>
                    <Select
                      value={formData.parent_account_id || 'none'}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        parent_account_id: value === 'none' ? null : value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tài khoản cha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Không có --</SelectItem>
                        {accounts?.filter(a => a.is_header).map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    placeholder="Nhập mô tả tài khoản"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_header}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_header: checked })}
                    />
                    <Label>Tài khoản tổng hợp</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Đang hoạt động</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.account_code || !formData.account_name || createAccount.isPending || updateAccount.isPending}
                >
                  {(createAccount.isPending || updateAccount.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAccount ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã hoặc tên tài khoản..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loại tài khoản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {accountTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setExpandedAccounts(new Set(accounts?.filter(a => a.is_header).map(a => a.id) || []))}>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Mở rộng tất cả
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {accountTypes.map(type => {
            const count = accounts?.filter(a => a.account_type === type.value).length || 0;
            return (
              <div key={type.value} className="data-card p-4">
                <div className={`w-3 h-3 rounded-full ${type.color} mb-2`} />
                <p className="text-sm text-muted-foreground">{type.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="data-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Mã TK</TableHead>
                <TableHead>Tên tài khoản</TableHead>
                <TableHead className="w-[120px]">Loại</TableHead>
                <TableHead className="w-[100px]">Số dư BT</TableHead>
                <TableHead className="text-right w-[150px]">Số dư hiện tại</TableHead>
                <TableHead className="w-[100px]">Trạng thái</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có tài khoản nào. Nhấn "Thêm tài khoản" để bắt đầu.
                  </TableCell>
                </TableRow>
              ) : (
                tree.map((account: any) => renderAccountRow(account))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
