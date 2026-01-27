# Portfolio Rebalancing Tool - Quick Start Guide

## 🎯 Getting Started in 5 Minutes

### Step 1: Access the Tool
Navigate to your Investment Portfolio page and click the **"Rebalancing Tool"** button in the header.

```
Investment Portfolio → [Rebalancing Tool Button] → Portfolio Rebalancing Page
```

### Step 2: Set Your Target Allocation

Click **"Set Target Allocation"** button:

```
┌─────────────────────────────────────────┐
│ Set Target Allocation                   │
├─────────────────────────────────────────┤
│                                         │
│ Strategy Name: [My Balanced Portfolio]  │
│                                         │
│ Asset Type Allocations:                 │
│ ┌───────────────────────────────────┐   │
│ │ 📈 Stock       │ 40% │ ±5% │ [x] │   │
│ │ 📊 Bond        │ 30% │ ±5% │ [x] │   │
│ │ 📦 ETF         │ 20% │ ±5% │ [x] │   │
│ │ 💵 Cash        │ 10% │ ±5% │ [x] │   │
│ └───────────────────────────────────┘   │
│                                         │
│ [+ Add Asset Type]                      │
│                                         │
│ [Save Target] [Cancel]                  │
└─────────────────────────────────────────┘
```

**Tips:**
- Total must equal 100%
- Tolerance band (±5%) = when to rebalance
- Lower tolerance = more frequent rebalancing

### Step 3: View Current vs Target

The **Overview** tab shows your allocation status:

```
┌─────────────────────────────────────────┬─────────────────────────────────────────┐
│ Current Allocation                      │ Target Allocation                       │
├─────────────────────────────────────────┼─────────────────────────────────────────┤
│                                         │                                         │
│ 📈 Stock                                │ 📈 Stock                                │
│ $22,000 → 44.0%                        │ 40.0% (±5% tolerance)                   │
│ ████████████████████ 44%               │ +4.0% deviation ⚠️                     │
│                                         │                                         │
│ 📊 Bond                                 │ 📊 Bond                                 │
│ $12,000 → 24.0%                        │ 30.0% (±5% tolerance)                   │
│ ████████████ 24%                       │ -6.0% deviation ⚠️                     │
│                                         │                                         │
│ 📦 ETF                                  │ 📦 ETF                                  │
│ $10,000 → 20.0%                        │ 20.0% (±5% tolerance)                   │
│ ██████████ 20%                         │ 0.0% deviation ✅                       │
│                                         │                                         │
│ 💵 Cash                                 │ 💵 Cash                                 │
│ $6,000 → 12.0%                         │ 10.0% (±5% tolerance)                   │
│ ██████ 12%                             │ +2.0% deviation ✅                      │
└─────────────────────────────────────────┴─────────────────────────────────────────┘
```

**Alert Banner:**
```
⚠️ Rebalancing Recommended
Your portfolio allocation exceeds tolerance bands. Max deviation: 6.0%
[View Recommendations]
```

### Step 4: Calculate Recommendations

Go to **Recommendations** tab and click **"Calculate"**:

```
┌──────────────────────────────────────────────────────────────────┐
│ Rebalancing Recommendations                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Trade 1:                                                         │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Apple Stock (AAPL)                    [SELL] [HIGH PRIORITY]│  │
│ │                                                              │  │
│ │ Trade Value:    $2,000.00                                   │  │
│ │ Shares:         10.81                                       │  │
│ │ Estimated Fees: $2.00                                       │  │
│ │ Tax Impact:     $150.00 (short-term)                        │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Trade 2:                                                         │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ US Treasury Bond (AGG)                [BUY] [HIGH PRIORITY] │  │
│ │                                                              │  │
│ │ Trade Value:    $3,000.00                                   │  │
│ │ Shares:         32.43                                       │  │
│ │ Estimated Fees: $3.00                                       │  │
│ │ Tax Impact:     $0.00                                       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Summary:                                                         │
│ ┌──────────────┬──────────────┬──────────────┐                 │
│ │ Total Trades │ Total Fees   │ Tax Impact   │                 │
│ │     2        │   $5.00      │   $150.00    │                 │
│ └──────────────┴──────────────┴──────────────┘                 │
│                                                                  │
│ [Preview & Execute] [Save as Proposal]                          │
└──────────────────────────────────────────────────────────────────┘
```

### Step 5: Preview & Execute

Click **"Preview & Execute"** to see the full plan:

```
┌──────────────────────────────────────────────────────────────────┐
│ Preview Rebalancing                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ℹ️ Review the rebalancing plan below. Executing will create    │
│   the trades in your portfolio.                                 │
│                                                                  │
│ Trades Summary:                                                  │
│ ┌────────────┬────────────┬──────────────────┐                 │
│ │   Trades   │ Total Cost │ Avg Deviation    │                 │
│ │     2      │  $155.00   │      6.0%        │                 │
│ └────────────┴────────────┴──────────────────┘                 │
│                                                                  │
│ Trade Details:                                                   │
│ • SELL Apple Stock: $2,000 (Fees: $2, Tax: $150)               │
│ • BUY US Treasury Bond: $3,000 (Fees: $3, Tax: $0)             │
│                                                                  │
│ [✅ Execute Rebalancing] [Cancel]                               │
└──────────────────────────────────────────────────────────────────┘
```

Click **"Execute Rebalancing"** → Confirm → Done! ✅

### Step 6: View History

Check the **History** tab to see your rebalancing:

```
┌──────────────────────────────────────────────────────────────────┐
│ Rebalancing History                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Manual Rebalancing                         [✅ EXECUTED]    │  │
│ │ January 27, 2026                                           │  │
│ │                                                             │  │
│ │ Trades: 2    Total Cost: $155.00                          │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Scheduled Rebalancing                      [PROPOSED]       │  │
│ │ December 15, 2025                                          │  │
│ │                                                             │  │
│ │ Trades: 3    Total Cost: $210.00                          │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔔 Scheduled Alerts

Configure automatic reminders in the **Settings** tab:

```
┌──────────────────────────────────────────────────────────────────┐
│ Rebalancing Settings                                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Rebalancing Frequency:                                           │
│ [v Quarterly]                                                    │
│   • Monthly                                                      │
│   • Quarterly ← Recommended                                      │
│   • Semi-Annually                                                │
│   • Annually                                                     │
│   • Threshold-Based                                              │
│   • Manual Only                                                  │
│                                                                  │
│ Minimum Trade Amount: [$100]                                     │
│                                                                  │
│ ☑️ Enable Automatic Rebalancing                                 │
│ ☑️ Consider Tax Implications                                    │
│ ☑️ Use Cash Flow for Rebalancing                                │
│                                                                  │
│ [💾 Save Settings]                                               │
└──────────────────────────────────────────────────────────────────┘
```

## 📅 What Happens Automatically?

When you enable scheduled rebalancing:

```
Every Quarter (example):
├─ Day 1: System checks your portfolio
├─ Day 1: If deviation > tolerance, alert is created
├─ Day 1: You receive notification
├─ Day 2: You review recommendations
├─ Day 2: You execute or dismiss
└─ Next Quarter: Repeat

Optional Auto-Execute:
├─ Day 1: System checks portfolio
├─ Day 1: Deviation detected
├─ Day 1: Rebalancing calculated
├─ Day 1: Trades executed automatically
├─ Day 1: You receive confirmation notification
└─ Next Quarter: Repeat
```

## 💰 Understanding Costs

### Example Cost Breakdown:

```
Portfolio Value: $50,000
Rebalancing Needed: $5,000 in trades

┌─────────────────────────────────┐
│ Cost Component                  │
├─────────────────────────────────┤
│ Trading Fees (0.1%):      $5.00 │
│ Tax on Gains (varies):  $150.00 │
├─────────────────────────────────┤
│ TOTAL NET COST:         $155.00 │
│                                 │
│ As % of Portfolio:       0.31%  │
└─────────────────────────────────┘
```

**Tips to Minimize Costs:**
- ✅ Use quarterly rebalancing (not monthly)
- ✅ Set appropriate tolerance bands (±5%)
- ✅ Enable "Use Cash Flow" to rebalance naturally
- ✅ Consider tax implications
- ✅ Set minimum trade threshold ($100+)

## 🎯 Common Scenarios

### Scenario 1: First Time Setup
1. Click "Set Target Allocation"
2. Enter your desired percentages
3. Save and wait for next scheduled check
4. Or manually calculate immediately

### Scenario 2: Market Changed Portfolio
1. Notice alert banner on Overview tab
2. Go to Recommendations → Calculate
3. Review suggested trades
4. Preview & Execute when ready

### Scenario 3: Quarterly Review
1. System sends you notification
2. Open Rebalancing Tool
3. Review current vs target
4. Calculate if needed
5. Execute or dismiss alert

### Scenario 4: Auto-Rebalancing
1. Enable in Settings
2. System monitors automatically
3. Executes when deviation > tolerance
4. You receive confirmation notification
5. Review in History tab

## ⚠️ Important Notes

- **Always preview** before executing
- **Check tax impact** especially for short-term holdings
- **Consider market timing** - you can save as proposal and execute later
- **Review history** to track performance
- **Adjust tolerance** if rebalancing too frequently

## 🆘 Quick Troubleshooting

**Q: Not seeing any recommendations?**
→ Your portfolio is balanced! Check tolerance bands if you want more sensitivity.

**Q: High tax impact?**
→ Consider waiting for holdings to become long-term (1 year+) or disable tax optimization.

**Q: Too many small trades?**
→ Increase minimum trade amount in Settings.

**Q: Not receiving alerts?**
→ Check Settings tab and ensure frequency is not "Manual Only".

## 🎓 Best Practices

✅ **DO:**
- Review quarterly
- Set realistic targets
- Consider your risk tolerance
- Use tolerance bands wisely
- Preview before executing

❌ **DON'T:**
- Rebalance too frequently
- Ignore tax implications
- Make tiny trades
- Panic-rebalance during volatility
- Set unrealistic targets

## 📊 Success Metrics

Track these in your History:
- Deviation improvement after rebalancing
- Total costs as % of portfolio
- Tax efficiency
- Rebalancing frequency
- Portfolio performance

---

## 🚀 You're Ready!

You now know how to:
✅ Set target allocations
✅ Monitor your portfolio
✅ Get rebalancing recommendations
✅ Preview and execute trades
✅ Schedule automatic alerts
✅ Review history and costs

**Start by clicking "Set Target Allocation" on the Rebalancing Tool page!**

Happy Rebalancing! 🎉
