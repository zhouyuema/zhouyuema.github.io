/* Same USD-million, year-end FCFF model as model.py. No runtime dependencies. */
(function(root){
'use strict';
function calculate(data,a){
 if(Object.values(a).some(v=>!Number.isFinite(v))) throw Error('All assumptions must be finite numbers.');
 if(!(a.terminal_growth>=0 && a.wacc>a.terminal_growth && a.terminal_roic>a.terminal_growth)) throw Error('Require WACC > terminal growth ≥ 0 and terminal ROIC > growth.');
 for(const k of ['product_margin','service_margin','opex_ratio','tax_rate','da_ratio','capex_ratio','nwc_increment']) if(a[k]<0||a[k]>1) throw Error(k+' must lie between 0 and 1.');
 if(Math.min(a.product_growth,a.service_growth)<=-1) throw Error('Growth must exceed −100%.');
 const h=data.history.at(-1); let products=h.products,services=h.services,previous=h.revenue;const rows=[];
 for(let t=1;t<=5;t++){
  products*=1+a.product_growth; services*=1+a.service_growth;
  const revenue=products+services,gross_profit=products*a.product_margin+services*a.service_margin,opex=revenue*a.opex_ratio,ebit=gross_profit-opex,nopat=ebit*(1-a.tax_rate),da=revenue*a.da_ratio,capex=revenue*a.capex_ratio,delta_nwc=(revenue-previous)*a.nwc_increment,fcff=nopat+da-capex-delta_nwc,pv=fcff/(1+a.wacc)**t;
  rows.push({year:2025+t,products,services,revenue,gross_profit,opex,ebit,nopat,da,capex,delta_nwc,fcff,pv});previous=revenue;
 }
 const terminal_fcff=rows.at(-1).nopat*(1+a.terminal_growth)*(1-a.terminal_growth/a.terminal_roic),pv_terminal=terminal_fcff/(a.wacc-a.terminal_growth)/(1+a.wacc)**5,enterprise_value=rows.reduce((s,r)=>s+r.pv,0)+pv_terminal,liquid_assets=h.cash+h.securities_current+h.securities_noncurrent,debt=h.commercial_paper+h.debt_current+h.debt_noncurrent,equity_value=enterprise_value+liquid_assets-debt;
 return {rows,terminal_fcff,pv_terminal,enterprise_value,liquid_assets,debt,equity_value,per_share:equity_value/h.shares,terminal_share:pv_terminal/enterprise_value};
}
if(typeof module!=='undefined') module.exports={calculate};else root.AppleModel={calculate};
})(typeof window==='undefined'?globalThis:window);
