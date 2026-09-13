'use strict';
const $=id=>document.getElementById(id), pct=x=>(x*100).toFixed(1)+'%', bn=x=>(x/1000).toFixed(1), money=x=>'$'+x.toFixed(2);
let data, current, result;
const fields=[['product_growth','Products growth',-5,12,.5],['service_growth','Services growth',0,20,.5],['product_margin','Products gross margin',30,45,.1],['service_margin','Services gross margin',65,85,.1],['opex_ratio','Operating expenses / sales',12,20,.1],['wacc','WACC · discount rate',6,14,.25],['terminal_growth','Long-run growth',0,4,.25]];
function csv(rows){const keys=Object.keys(rows[0]);return keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n');}
function download(name,body,type){const u=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function bars(rows){const max=Math.max(...rows.map(r=>r.revenue));return rows.map(r=>`<div class="bar-row"><span>FY${r.year}</span><div class="bar-track"><div class="bar" style="width:${r.revenue/max*100}%"><span class="products" style="width:${r.products/r.revenue*100}%"></span><span class="services" style="width:${r.services/r.revenue*100}%"></span></div></div><b>$${bn(r.revenue)}B</b></div>`).join('');}
function update(){
 try{result=AppleModel.calculate(data,current);$('error').textContent='';}catch(e){$('error').textContent=e.message;return;}
 $('per-share').textContent=money(result.per_share);$('ev').textContent='$'+bn(result.enterprise_value)+'B';$('terminal').textContent=pct(result.terminal_share);$('final-cash').textContent='$'+bn(result.rows.at(-1).fcff)+'B';
 $('forecast-bars').innerHTML=bars(result.rows);
 $('forecast').innerHTML=result.rows.map(r=>`<tr><th scope="row">FY${r.year}</th>${['products','services','revenue','ebit','nopat','da','capex','delta_nwc','fcff','pv'].map(k=>`<td>${bn(r[k])}</td>`).join('')}</tr>`).join('');
 $('bridge').innerHTML=[['PV of five-year FCFF',result.enterprise_value-result.pv_terminal],['PV of terminal value',result.pv_terminal],['Enterprise value',result.enterprise_value],['Cash + marketable securities',result.liquid_assets],['Less: interest-bearing debt',-result.debt],['Equity value',result.equity_value]].map(([k,v])=>`<div><span>${k}</span><strong>$${bn(v)}B</strong></div>`).join('');
 const gs=[.015,.02,.025,.03,.035],ws=[.07,.08,.09,.10,.11];
 $('heatmap').innerHTML='<thead><tr><th>WACC ↓ / g →</th>'+gs.map(g=>`<th>${pct(g)}</th>`).join('')+'</tr></thead><tbody>'+ws.map(w=>'<tr><th scope="row">'+pct(w)+'</th>'+gs.map(g=>{const v=AppleModel.calculate(data,{...current,wacc:w,terminal_growth:g}).per_share;return `<td style="background:rgba(12,130,120,${Math.min(.7,Math.max(.07,v/450))})">${money(v)}</td>`;}).join('')+'</tr>').join('')+'</tbody>';
 $('scenarios').innerHTML=Object.entries(data.presets).map(([k,a])=>{const r=AppleModel.calculate(data,a);return `<div><span>${k}</span><strong>${money(r.per_share)}</strong><small>Products ${pct(a.product_growth)} · Services ${pct(a.service_growth)}</small></div>`;}).join('');
 const impacts=fields.slice(0,5).map(([k,label])=>{const v=AppleModel.calculate(data,{...current,[k]:current[k]+.01}).per_share;return {label,delta:v-result.per_share};}).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 $('drivers').innerHTML=impacts.map(r=>`<div><span>${r.label} +1 percentage point</span><strong>${r.delta>=0?'+':'−'}$${Math.abs(r.delta).toFixed(2)}/share</strong></div>`).join('');
 $('live-summary').textContent=`At these assumptions, the model gives ${money(result.per_share)} per share. ${pct(result.terminal_share)} of enterprise value comes from the terminal period. This dependence is why the assumptions matter more than a single headline value.`;
}
function preset(name){current={...data.presets[name]};for(const [k] of fields){$(k).value=current[k]*100;$('out-'+k).textContent=pct(current[k]);}document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===name)));update();}
async function start(){try{
 const response=await fetch('./data.json');if(!response.ok)throw Error('Data could not load. Please reload the page.');data=await response.json();
 $('controls').innerHTML=fields.map(([k,label,min,max,step])=>`<label for="${k}"><span>${label}</span><output id="out-${k}" for="${k}"></output><input id="${k}" type="range" min="${min}" max="${max}" step="${step}" /></label>`).join('');
 for(const [k] of fields)$(k).addEventListener('input',()=>{current[k]=Number($(k).value)/100;$('out-'+k).textContent=pct(current[k]);document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed','false'));update();});
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));
 $('history-bars').innerHTML=bars(data.history);
 $('history').innerHTML=data.history.map(h=>`<tr><th scope="row">FY${h.year}</th><td>${bn(h.revenue)}</td><td>${pct(h.services/h.revenue)}</td><td>${pct(h.ebit/h.revenue)}</td><td>${bn(h.net_income)}</td><td>${bn(h.cfo)}</td><td>${bn(h.capex)}</td><td>${bn(h.cfo-h.capex)}</td></tr>`).join('');
 preset('Base');$('export').disabled=false;$('export').addEventListener('click',()=>download('apple-forecast.csv',csv(result.rows),'text/csv'));
 $('export-assumptions').disabled=false;$('export-assumptions').addEventListener('click',()=>download('apple-valuation.json',JSON.stringify({basis:data.basis,assumptions:current,...result},null,2),'application/json'));
 }catch(e){$('error').textContent=e.message;}}
start();
