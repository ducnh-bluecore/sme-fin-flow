import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProductSearch } from '@/hooks/useAdsCommandCenter';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  selling_price: number | null;
  cost_price: number | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  description: string | null;
}

interface ProductPickerProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
}

export default function ProductPicker({ value, onChange }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useProductSearch(search);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span className="truncate">{value.name}</span>
            ) : (
              <span className="text-muted-foreground">Chọn sản phẩm...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm theo tên hoặc SKU..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Đang tìm...' : 'Không tìm thấy sản phẩm'}
              </CommandEmpty>
              <CommandGroup>
                {(products as unknown as Product[]).map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      onChange(product);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value?.id === product.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.selling_price && (
                          <span>{Number(product.selling_price).toLocaleString()}đ</span>
                        )}
                        {product.category && <span>{product.category}</span>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected product preview */}
      {value && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{value.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {value.sku && <Badge variant="outline" className="text-xs">SKU: {value.sku}</Badge>}
                    {value.selling_price && (
                      <Badge variant="secondary" className="text-xs">
                        {Number(value.selling_price).toLocaleString()}đ
                      </Badge>
                    )}
                    {value.category && <Badge variant="secondary" className="text-xs">{value.category}</Badge>}
                    {value.brand && <Badge variant="secondary" className="text-xs">{value.brand}</Badge>}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onChange(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
