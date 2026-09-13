# Apple: from earnings to value

An educational financial analysis and driver-based FCFF valuation case. Created September 2026 with AI assistance. Historical FY2023–FY2025; forecast FY2026–FY2030. No confidential or internship data.

## Reproduce

Download `model.py` and `data.json` to the same folder. Requires Python 3, no packages.

```
python model.py
python model.py --scenario Downside --wacc 0.10 --output downside-results
```

Outputs: `forecast.csv`, `historical.csv`, `valuation.json`. Amounts are USD millions, shares millions, rates decimal. The webpage shows rounded billions; calculations retain full precision. `model.js` implements the same model for the browser. `test_model.py` checks identities, sensitivity direction, the equity bridge, invalid assumptions and Python/JavaScript agreement (Node needed for cross-language tests).

## Data provenance

S25: https://www.apple.com/newsroom/pdfs/fy2025-q4/FY25_Q4_Consolidated_Financial_Statements.pdf (released October 30, 2025).

S24: https://www.apple.com/newsroom/pdfs/fy2024-q4/FY24_Q4_Consolidated_Financial_Statements.pdf (released October 31, 2024).

These are official unaudited earnings-release statements, not an audited annual-report extract. History is manually transcribed from twelve-month columns, not quarterly columns. Data records include source IDs and period ends; `field_pages` lists source pages for each numerical field. Shares are converted from thousands to millions. Source PDFs remain on Apple's site. Normalization of FY2024 net income uses S25 page 4, and is disclosed separately from GAAP figures. No automated API ingestion is claimed.

## Calculation

Separate products/services growth and gross margins; consolidated operating expenses proportional to sales. NOPAT = EBIT × (1 − tax). FCFF = NOPAT + D&A − capex − incremental NWC. Incremental NWC = 1% × change in annual revenue (a simplifying assumption, not reconstructed actual NWC). Discount five year-end FCFFs at WACC.

Terminal NOPAT = FY2030 NOPAT × (1+g). Terminal FCFF = terminal NOPAT × (1−g/terminal ROIC). Terminal value = terminal FCFF / (WACC−g). Require WACC>g and ROIC>g. Discount terminal value five years. Equity = enterprise value + cash and all marketable securities − commercial paper and term debt. Divide by fiscal-year-end common shares; do not use weighted average EPS shares.

## Choices and limits

This is an FY2025 year-end reference valuation using subsequently released data, not a contemporaneous trading backtest. No current price comparison or later FY2026 information. WACC is assumed, not estimated. Constant growth and margins, no full three-statement forecast or operational feedback between services and products. The terminal period normalizes reinvestment immediately using assumed 25% ROIC. Operating lease expenses remain in EBIT and lease liabilities are not separately deducted. SBC stays expensed, no SBC addback; shares fixed, no future buybacks or dilution. All cash/securities are treated as available to equity without required operating cash or liquidation tax adjustments. Net cash uses book values. These choices are visible in the website, not buried in code. Scenarios are illustrative, not confidence intervals or company guidance.

Base assumptions: products growth 4%, services growth 10%, product gross margin 36.77%, service gross margin 75.41%, opex/sales 14.93%, tax 16%, D&A/sales 2.81%, capex/sales 3.10%, incremental NWC 1% of revenue change, WACC 9%, long-run growth 2.5%, terminal ROIC 25%. Rationale and all presets are on the page and in JSON. Financial assumptions are not statistically estimated.
