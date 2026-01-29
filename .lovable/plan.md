

# REFACTOR: Data-First Outcome Recording Flow

## Vấn đề với flow hiện tại

```text
HIỆN TẠI (Bias-prone):
Step 1: User chọn verdict (đoán)  ← Chủ quan
Step 2: User nhập actual (optional)
Step 3: Submit

→ User quyết định "tốt/xấu" trước khi thấy data = bias
```

## Flow mới đề xuất

```text
MỚI (Data-driven):
Step 1: User nhập actual impact    ← Nhập số thực tế
Step 2: System tính và show comparison  ← Thấy kết quả
Step 3: User xác nhận verdict dựa trên data  ← Quyết định có căn cứ
Step 4: Submit
```

## UX Design - 2 bước trong dialog

### Bước 1: Nhập số liệu thực tế

```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 Đo lường kết quả                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scale TikTok Channel                                           │
│  Dự đoán: ₫45M                                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Impact thực tế là bao nhiêu?                                ││
│  │                                                             ││
│  │ [₫ ______________]                                          ││
│  │                                                             ││
│  │ ○ Chưa thể đo lường (theo dõi sau)                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Hủy]                                    [Xem kết quả →]       │
└─────────────────────────────────────────────────────────────────┘
```

### Bước 2: Xem kết quả & Xác nhận verdict

```text
┌─────────────────────────────────────────────────────────────────┐
│  📊 Kết quả so sánh                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────┐              │
│  │    DỰ ĐOÁN       │   →    │    THỰC TẾ       │              │
│  │     ₫45M         │        │     ₫52M         │              │
│  └──────────────────┘        └──────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📈 Variance: +₫7M (+15.6%)                                 ││
│  │  🎯 Accuracy: 86.5%                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Xác nhận đánh giá:                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○ Tốt hơn kỳ vọng (suggested based on +15.6%)              ││
│  │ ○ Đúng như kỳ vọng                                         ││
│  │ ○ Kém hơn kỳ vọng                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Ghi chú (tùy chọn):                                            │
│  [________________________________________________]            │
│                                                                 │
│  [← Quay lại]                            [Ghi nhận & Resolve]   │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### State Management

```typescript
// Thêm step tracking
const [step, setStep] = useState<'input' | 'confirm'>('input');
const [cannotMeasure, setCannotMeasure] = useState(false);

// Computed values khi có actual
const hasActual = actualImpact && parseFloat(actualImpact) > 0;
const variance = hasActual 
  ? ((parseFloat(actualImpact) - predictedImpact) / predictedImpact) * 100 
  : 0;
const accuracy = hasActual
  ? (Math.min(parseFloat(actualImpact), predictedImpact) / 
     Math.max(parseFloat(actualImpact), predictedImpact)) * 100
  : 0;

// Auto-suggest verdict based on variance
const suggestedVerdict: OutcomeVerdict = 
  variance > 10 ? 'better_than_expected' :
  variance < -10 ? 'worse_than_expected' :
  'as_expected';
```

### Step 1: InputStep Component

```typescript
function InputStep({ ... }) {
  return (
    <>
      {/* Decision info với predicted */}
      <div className="rounded-lg bg-muted p-4">
        <p className="font-medium">{alert.title}</p>
        <p className="text-lg font-bold mt-2">
          Dự đoán: {formatCurrency(predictedImpact)}
        </p>
      </div>

      {/* Actual input */}
      <div className="space-y-3">
        <Label>Impact thực tế là bao nhiêu?</Label>
        <Input 
          type="number" 
          value={actualImpact}
          onChange={(e) => setActualImpact(e.target.value)}
          disabled={cannotMeasure}
        />
        
        {/* Cannot measure checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={cannotMeasure}
            onCheckedChange={setCannotMeasure}
          />
          <Label>Chưa thể đo lường (theo dõi sau)</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button 
          onClick={() => cannotMeasure ? handleFollowup() : setStep('confirm')}
          disabled={!cannotMeasure && !actualImpact}
        >
          {cannotMeasure ? 'Đặt lịch theo dõi' : 'Xem kết quả →'}
        </Button>
      </DialogFooter>
    </>
  );
}
```

### Step 2: ConfirmStep Component

```typescript
function ConfirmStep({ ... }) {
  return (
    <>
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">DỰ ĐOÁN</p>
          <p className="text-2xl font-bold">{formatCurrency(predicted)}</p>
        </div>
        <div className="rounded-lg border-2 border-primary p-4 text-center">
          <p className="text-sm text-muted-foreground">THỰC TẾ</p>
          <p className="text-2xl font-bold">{formatCurrency(actual)}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="rounded-lg bg-muted p-4 space-y-2">
        <div className="flex justify-between">
          <span>Variance:</span>
          <span className={variance > 0 ? 'text-emerald-600' : 'text-destructive'}>
            {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Accuracy:</span>
          <span>{accuracy.toFixed(1)}%</span>
        </div>
      </div>

      {/* Verdict selection với suggested highlight */}
      <RadioGroup value={verdict} onValueChange={setVerdict}>
        {/* Options với suggested badge */}
      </RadioGroup>

      {/* Notes */}
      <Textarea ... />

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep('input')}>
          ← Quay lại
        </Button>
        <Button onClick={handleSubmit}>
          Ghi nhận & Resolve
        </Button>
      </DialogFooter>
    </>
  );
}
```

## Flow Logic

```text
User opens dialog
    │
    ▼
┌─────────────────┐
│  STEP: INPUT    │
│  - Show predicted│
│  - Input actual  │
│  - Or "can't    │
│    measure"     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
Has actual   Can't measure
    │              │
    ▼              ▼
┌─────────────────┐   ┌─────────────────┐
│  STEP: CONFIRM  │   │  Show calendar  │
│  - Comparison   │   │  for follow-up  │
│  - Auto-suggest │   │  date           │
│  - User confirms│   └─────────────────┘
└────────┬────────┘
         │
         ▼
    Submit to DB
         │
         ▼
┌─────────────────┐
│  SUCCESS VIEW   │
│  (Optional)     │
│  Show final     │
│  summary        │
└─────────────────┘
```

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `OutcomeRecordingDialog.tsx` | Refactor thành 2-step flow với InputStep và ConfirmStep |

## Ưu điểm của flow mới

1. **Data-driven** - User thấy số trước, quyết định sau
2. **Less bias** - Không đoán trước kết quả
3. **Auto-suggest** - System gợi ý verdict dựa trên variance
4. **Clear comparison** - Side-by-side dễ hiểu
5. **Reversible** - Có thể quay lại sửa số nếu nhập sai

## Timeline
- Estimate: 25 phút

