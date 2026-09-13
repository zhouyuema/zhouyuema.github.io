"""Run: python -m unittest discover -s projects/apple-valuation -p test_model.py"""
import json
import subprocess
import unittest
from pathlib import Path
from model import calculate, validate

ROOT = Path(__file__).parent
DATA = json.loads((ROOT/'data.json').read_text())

class ModelTests(unittest.TestCase):
    def test_statement_identities(self):
        validate(DATA)
        self.assertEqual(DATA['history'][1]['net_income'] + DATA['normalization']['FY2024_tax_charge'], 103982)

    def test_equity_bridge(self):
        r = calculate(DATA, DATA['presets']['Base'])
        self.assertEqual(r['liquid_assets']-r['debt'], 33763)
        self.assertAlmostEqual(r['per_share']*14773.260, r['equity_value'])
        self.assertAlmostEqual(r['enterprise_value'],sum(v['pv'] for v in r['rows'])+r['pv_terminal'])

    def test_sensitivities(self):
        a = DATA['presets']['Base']
        v = calculate(DATA,a)['per_share']
        self.assertLess(calculate(DATA,dict(a,wacc=.10))['per_share'],v)
        self.assertGreater(calculate(DATA,dict(a,service_growth=.11))['per_share'],v)
        self.assertLess(calculate(DATA,dict(a,opex_ratio=.16))['per_share'],v)
        self.assertLess(calculate(DATA,DATA['presets']['Downside'])['per_share'],v)
        self.assertGreater(calculate(DATA,DATA['presets']['Upside'])['per_share'],v)

    def test_invalid_terminal(self):
        a = DATA['presets']['Base']
        for changes in [dict(wacc=.025),dict(terminal_roic=.02),dict(wacc=float('nan'))]:
            with self.assertRaises(ValueError): calculate(DATA,dict(a,**changes))

    def test_python_javascript_parity(self):
        cases=list(DATA['presets'].values())+[dict(DATA['presets']['Base'],wacc=w,terminal_growth=g) for w in [.06,.09,.14] for g in [0,.025,.04]]
        script="const fs=require('fs'),m=require('./model.js'); const x=JSON.parse(fs.readFileSync(0,'utf8')); console.log(JSON.stringify(x.cases.map(a=>m.calculate(x.data,a))));"
        out=subprocess.check_output(['node','-e',script],input=json.dumps(dict(data=DATA,cases=cases)),text=True,cwd=ROOT)
        for a,js in zip(cases,json.loads(out)):
            py=calculate(DATA,a)
            for k in ['per_share','enterprise_value','equity_value','terminal_fcff','terminal_share']:
                self.assertAlmostEqual(py[k],js[k],places=7)
            for p,j in zip(py['rows'],js['rows']):
                for k in p:self.assertAlmostEqual(p[k],j[k],places=7)

if __name__=='__main__': unittest.main()
