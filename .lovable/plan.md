

# Populate Risk Scores tu Du Lieu KPI & Cash Flow

## Van de

Bang `risk_scores` hoan toan trong (0 records), nen view `v_risk_radar_summary` tra ve rong --> Risk Dashboard hien "Chua co du lieu risk scores" va Overall Risk Score = 0.

## Du lieu da co

- **8,254 KPI facts** (L3): NET_REVENUE, ORDER_COUNT, AOV, COGS, GROSS_MARGIN, AD_SPEND, ROAS, AD_IMPRESSIONS
- **14 cash flow records** (Jan 2025 - Feb 2026): closing_cash_balance avg ~78.7 ty, net_cash_operating avg ~10.8 ty

## Giai phap

Tao migration SQL de tinh va insert risk scores dua tren du lieu thuc:

### Logic tinh diem (0-100, cao = an toan)

| Category | Cach tinh | Nguon |
|----------|----------|-------|
| **Liquidity** | Dua tren cash runway (closing_cash / monthly_burn) va net_cash_operating trend | cash_flow_direct |
| **Credit** | Dua tren ty le thanh toan (payment coverage), AOV stability | kpi_facts_daily (AOV, ORDER_COUNT) |
| **Market** | Dua tren revenue trend (thang nay vs thang truoc), ROAS | kpi_facts_daily (NET_REVENUE, ROAS) |
| **Operational** | Dua tren COGS ratio, gross margin health | kpi_facts_daily (COGS, GROSS_MARGIN) |
| **Overall** | Weighted average: Liquidity 30%, Market 25%, Operational 25%, Credit 20% |

### Chi tiet tinh toan

**Liquidity Score:**
- Cash runway >= 12 thang: 85-95 diem
- Cash runway 6-12 thang: 60-84 diem
- Cash runway 3-6 thang: 40-59 diem
- Cash runway < 3 thang: 10-39 diem

**Market Score:**
- Revenue growth > 10%: 80-95
- Revenue stable (0-10%): 60-79
- Revenue giam < -10%: 30-59
- ROAS > 3: +10 bonus, ROAS < 2: -10 penalty

**Operational Score:**
- Gross margin > 30%: 80-95
- Gross margin 20-30%: 60-79
- Gross margin 10-20%: 40-59
- COGS/Revenue < 55%: +5 bonus

**Credit Score:**
- Payment coverage > 90%: 80-95
- AOV stable (low variance): +10 bonus
- High order count consistency: +5 bonus

### Output

INSERT 1 record vao `risk_scores` voi `score_date = CURRENT_DATE` va `calculation_details` chua toan bo logic + so lieu goc de audit.

## Ky vong sau fix

| Metric | Truoc | Sau |
|--------|-------|-----|
| Risk scores records | 0 | 1 |
| Overall Risk Score | 0 | 60-80 (tinh tu du lieu thuc) |
| Risk Profile tab | "Chua co du lieu" | 4 categories voi scores |
| Radar chart | Trong | Hien 4 truc risk |

## Files thay doi

| File | Thay doi |
|------|---------|
| Migration SQL | Tinh risk scores tu kpi_facts_daily + cash_flow_direct, insert vao risk_scores |

