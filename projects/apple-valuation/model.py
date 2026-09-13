"""Apple FY2025 reference DCF. Python 3, standard library only.
Download alongside data.json. Run: python model.py
Optional: python model.py --scenario Upside --wacc 0.10
Writes forecast.csv, historical.csv and valuation.json to --output (default results).
Historical values are curated from cited Apple statements, not scraped/API-fetched.
"""
import argparse
import csv
import json
from pathlib import Path


def validate(data):
    for h in data['history']:
        assert h['products'] + h['services'] == h['revenue']
        assert h['iphone'] + h['mac'] + h['ipad'] + h['wearables'] == h['products']
        assert h['revenue'] - h['product_cost'] - h['service_cost'] == h['gross_profit']
        assert h['gross_profit'] - h['opex'] == h['ebit']
        assert h['pretax'] - h['tax'] == h['net_income']
        assert h['assets'] == h['liabilities'] + h['equity']


def calculate(data, a):
    if not all(isinstance(v, (int, float)) and float('-inf') < v < float('inf') for v in a.values()):
        raise ValueError('All assumptions must be finite numbers.')
    if not 0 <= a['terminal_growth'] < a['wacc'] or a['terminal_roic'] <= a['terminal_growth']:
        raise ValueError('Require WACC > terminal growth >= 0 and terminal ROIC > growth.')
    for k in ['product_margin', 'service_margin', 'opex_ratio', 'tax_rate', 'da_ratio', 'capex_ratio', 'nwc_increment']:
        if not 0 <= a[k] <= 1:
            raise ValueError(k + ' must lie between 0 and 1.')
    if min(a['product_growth'], a['service_growth']) <= -1:
        raise ValueError('Growth must be greater than -100%.')
    h = data['history'][-1]
    products, services, previous = h['products'], h['services'], h['revenue']
    rows = []
    for t in range(1, 6):
        products *= 1 + a['product_growth']
        services *= 1 + a['service_growth']
        revenue = products + services
        gross_profit = products * a['product_margin'] + services * a['service_margin']
        opex = revenue * a['opex_ratio']
        ebit = gross_profit - opex
        nopat = ebit * (1 - a['tax_rate'])
        da = revenue * a['da_ratio']
        capex = revenue * a['capex_ratio']
        delta_nwc = (revenue - previous) * a['nwc_increment']
        fcff = nopat + da - capex - delta_nwc
        pv = fcff / (1 + a['wacc']) ** t
        rows.append(dict(year=2025+t, products=products, services=services, revenue=revenue,
                         gross_profit=gross_profit, opex=opex, ebit=ebit, nopat=nopat,
                         da=da, capex=capex, delta_nwc=delta_nwc, fcff=fcff, pv=pv))
        previous = revenue
    # Normalize terminal reinvestment to growth / ROIC, rather than extending
    # unusually low explicit-period net reinvestment forever.
    terminal_nopat = rows[-1]['nopat'] * (1 + a['terminal_growth'])
    terminal_fcff = terminal_nopat * (1 - a['terminal_growth'] / a['terminal_roic'])
    terminal_value = terminal_fcff / (a['wacc'] - a['terminal_growth'])
    pv_terminal = terminal_value / (1 + a['wacc']) ** 5
    enterprise_value = sum(r['pv'] for r in rows) + pv_terminal
    liquid_assets = h['cash'] + h['securities_current'] + h['securities_noncurrent']
    debt = h['commercial_paper'] + h['debt_current'] + h['debt_noncurrent']
    equity_value = enterprise_value + liquid_assets - debt
    return dict(rows=rows, terminal_fcff=terminal_fcff, pv_terminal=pv_terminal,
                enterprise_value=enterprise_value, liquid_assets=liquid_assets, debt=debt,
                equity_value=equity_value, per_share=equity_value/h['shares'],
                terminal_share=pv_terminal/enterprise_value)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', choices=['Base', 'Upside', 'Downside'], default='Base')
    parser.add_argument('--wacc', type=float)
    parser.add_argument('--output', type=Path, default=Path('results'))
    args = parser.parse_args()
    data = json.loads(Path(__file__).with_name('data.json').read_text())
    validate(data)
    assumptions = dict(data['presets'][args.scenario])
    if args.wacc is not None:
        assumptions['wacc'] = args.wacc
    result = calculate(data, assumptions)
    args.output.mkdir(parents=True, exist_ok=True)
    for name, rows in [('forecast', result['rows']), ('historical', data['history'])]:
        with (args.output / (name+'.csv')).open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    (args.output/'valuation.json').write_text(json.dumps(dict(assumptions=assumptions, **result), indent=2))
    print(f"{args.scenario}: ${result['per_share']:.2f}/share; terminal value {result['terminal_share']:.1%} of EV")
