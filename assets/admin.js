'use strict';
(()=>{
const SESSION_KEY='socialcta.session.v2';let session;
try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY));}catch{}
function login(){sessionStorage.removeItem(SESSION_KEY);location.replace('login.html?next='+encodeURIComponent(location.pathname.split('/').pop()||'campaigns.html'));}
if(!session?.accessToken||session.expiresAt<=Date.now()){login();return;}
const API_BASE=window.SOCIAL_CTA_CONFIG?.apiBaseUrl||'';

const defs={
campaigns:{title:'Campaign',id:'ref_campaign_id',name:'ref_campaign_name',desc:'จัดกลุ่มลิงก์ตามแคมเปญ และควบคุมการใช้งานในที่เดียว'},
owners:{title:'Owner Account',id:'ref_owner_id',name:'ref_owner_name',desc:'จัดการเจ้าของลิงก์ Partner และ Influencer'},
links:{title:'Ref Link',id:'ref_link_id',name:'ref_code',desc:'สร้างลิงก์แนะนำ เลือกเจ้าของ และกำหนดปลายทาง'}};
const page=document.body.dataset.page,cfg=defs[page],$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data={campaigns:[],owners:[],links:[],sources:[]},editing=null,editingRow=null,loading=false,query='',filter='',timer,busy=false,loaded=false;
const find=(kind,id)=>data[kind].find(x=>String(x[defs[kind].id])===String(id));
const total=(kind,id)=>data.links.filter(x=>!x.deleted_dt&&String(x[kind==='campaigns'?'campaign_id':'owner_id'])===String(id)).length;
function state(x){if(x.deleted_dt)return 'ลบแล้ว';if(!x.is_active)return 'ปิดใช้งาน';if(x.expired_dt&&Date.parse(x.expired_dt)<=Date.now())return 'หมดอายุ';if(!find('owners',x.owner_id)?.is_active)return 'Owner ปิดใช้งาน';if(x.campaign_id&&!find('campaigns',x.campaign_id)?.is_active)return 'Campaign ปิดใช้งาน';if(x.source_id&&!data.sources.find(s=>s.source_id===x.source_id)?.is_active)return 'ช่องทางปิดใช้งาน';return 'พร้อมใช้งาน';}
$('app').innerHTML='<aside><div class="brand"><b>↗</b>Social CTA</div><div class="eyebrow">REFERRAL MANAGEMENT</div><nav>'+Object.entries(defs).map(([k,v])=>'<a href="'+k+'.html" class="'+(k===page?'active':'')+'" '+(k===page?'aria-current="page"':'')+'>'+({campaigns:'▦',owners:'◎',links:'↗'})[k]+' &nbsp; '+v.title+'</a>').join('')+'</nav><footer>จัดการลิงก์แนะนำของคุณ<br>โครงสร้างข้อมูล · 29 ก.ย. 2026</footer></aside><main><div class="topline"><span>พื้นที่จัดการ / '+cfg.title+'</span><button type="button" id="logout">ออกจากระบบ</button></div><div id="connection" role="status" class="connection">กำลังเชื่อมต่อ…</div><header><div><h1>'+cfg.title+'</h1><p>'+cfg.desc+'</p></div><button id="create" class="primary" disabled>＋ สร้างใหม่</button></header><div id="stats" class="stats"></div><div id="filter-note" class="filter-note"></div><section class="panel"><div class="toolbar"><button type="button" id="reload">รีเฟรชข้อมูล</button><input id="search" type="search" aria-label="ค้นหา" placeholder="ค้นหาชื่อ รหัส หรือปลายทาง…"><select id="status" aria-label="กรองสถานะ"><option value="">ทุกสถานะ</option><option value="1">เปิดใช้งาน</option><option value="0">ปิดใช้งาน</option>'+(page==='links'?'<option value="expired">หมดอายุ</option><option value="blocked">ติดข้อจำกัด</option>':'')+'</select></div><div class="tablewrap"><table><thead id="thead"></thead><tbody id="rows"></tbody></table></div><div class="bottom" id="result"></div></section></main><dialog id="editor" aria-labelledby="form-title"><form id="form"><h2 id="form-title"></h2><div id="fields" class="fields"></div><div id="error" class="error" role="alert"></div><div class="form-footer"><button id="cancel" type="button">ยกเลิก</button><button type="submit" class="primary">บันทึกข้อมูล</button></div></form></dialog><div id="toast" role="status" aria-live="polite"></div>';
function toast(t){$('toast').textContent=t;clearTimeout(timer);timer=setTimeout(()=>$('toast').textContent='',4500);}
async function api(url,options={}){
 let response;
 try{response=await fetch(API_BASE+url,{...options,credentials:'omit',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.accessToken,...options.headers}});}catch{throw Error('ติดต่อ Backend ไม่สำเร็จ หากเพิ่งบันทึกให้รีเฟรชตรวจผลก่อนลองใหม่');}
 let result;try{result=await response.json();}catch{throw Error(response.status===401?'กรุณาเข้าสู่ระบบใหม่':'Backend ไม่ตอบข้อมูล JSON กรุณาเปิดผ่าน npm start');}
 if(response.status===401){login();throw Error('เซสชันหมดอายุ');}
 if(!response.ok){const error=Error(result.error||'การทำงานไม่สำเร็จ');error.status=response.status;throw error;}
 return result;
}
async function load(){
 if(busy||loading)return;
 loading=true;loaded=false;$('create').disabled=true;$('reload').disabled=true;
 try{
 if(!API_BASE)throw Error('ยังไม่ได้ตั้งค่า Backend URL');
 const next=await api('/api/bootstrap');
 if(!['campaigns','owners','links','sources'].every(k=>Array.isArray(next[k])))throw Error('ข้อมูลจาก Backend ไม่ครบถ้วน');
 data=next;loaded=true;render();$('connection').textContent='';$('connection').className='connection';$('create').disabled=false;
 }catch(error){loaded=false;$('create').disabled=true;$('connection').textContent=error.message;$('connection').className='connection error';}
 finally{loading=false;$('reload').disabled=false;}
}
async function persist(item,old){
 const result=await api('/api/'+page+(old?'/'+encodeURIComponent(old[cfg.id]):''),{method:old?'PATCH':'POST',headers:old?{'If-Match':'"'+old._version+'"'}:{},body:JSON.stringify(item)});
 const index=data[page].findIndex(x=>x[cfg.id]===result[cfg.id]);if(index<0)data[page].push(result);else data[page][index]=result;
 render();return result;
}
const params=new URLSearchParams(location.search);
function render(){
const all=data[page].filter(x=>!x.deleted_dt),on=all.filter(x=>x.is_active).length;
$('stats').innerHTML=[['ทั้งหมด',all.length],['เปิดใช้งาน',on],[page==='links'?'พร้อมใช้งาน':'ปิดใช้งาน',page==='links'?all.filter(x=>state(x)==='พร้อมใช้งาน').length:all.length-on]].map(([t,n])=>'<div class="stat"><span>'+t+'</span><strong>'+n+'</strong></div>').join('');
let rows=all.filter(x=>(!filter||String(x.is_active)===filter||filter==='expired'&&state(x)==='หมดอายุ'||filter==='blocked'&&x.is_active&&/ปิดใช้งาน$/.test(state(x)))&&[x[cfg.name],x.ref_campaign_desc,x.memo,x.destination_url,page==='links'?find('owners',x.owner_id)?.ref_owner_name:''].join(' ').toLowerCase().includes(query.toLowerCase()));
const fk=params.has('campaign_id')?'campaign_id':params.has('owner_id')?'owner_id':null;
if(page==='links'&&fk){rows=rows.filter(x=>String(x[fk])===params.get(fk));$('filter-note').innerHTML='กรองตาม '+esc(fk==='campaign_id'?find('campaigns',params.get(fk))?.ref_campaign_name:find('owners',params.get(fk))?.ref_owner_name)+' · <a href="links.html">แสดงทั้งหมด</a>';}
$('thead').innerHTML='<tr>'+(page==='links'?['Ref Code / ปลายทาง','Owner / Campaign','ช่องทาง','สถานะ','จัดการ']:[cfg.title,'ลิงก์ที่เกี่ยวข้อง','สถานะ','จัดการ']).map(t=>'<th scope="col">'+t+'</th>').join('')+'</tr>';
$('rows').innerHTML=rows.map(x=>{
const id=esc(x[cfg.id]),s=page==='links'?state(x):x.is_active?'เปิดใช้งาน':'ปิดใช้งาน';
return '<tr><td><span class="name">'+esc(x[cfg.name])+'</span><small>'+esc(page==='links'?x.destination_url:page==='campaigns'?x.ref_campaign_desc:'ID: '+id)+'</small></td>'+(page==='links'?'<td>'+esc(find('owners',x.owner_id)?.ref_owner_name||'ไม่พบ Owner')+'<small>'+esc(find('campaigns',x.campaign_id)?.ref_campaign_name||'ไม่ระบุ Campaign')+'</small></td><td>'+esc(data.sources.find(t=>t.source_id===x.source_id)?.source_name||'ไม่ระบุ')+'</td>':'<td><a href="links.html?'+(page==='campaigns'?'campaign_id':'owner_id')+'='+id+'">'+total(page,x[cfg.id])+' ลิงก์ ↗</a></td>')+'<td><span class="badge '+(['พร้อมใช้งาน','เปิดใช้งาน'].includes(s)?'on':s==='ปิดใช้งาน'?'':'warn')+'">'+s+'</span>'+(page==='links'&&x.expired_dt?'<small>หมดอายุ '+esc(new Date(x.expired_dt).toLocaleString('th-TH'))+'</small>':'')+'</td><td><div class="actions"><button data-action="edit" data-id="'+id+'">แก้ไข</button><button class="switch" role="switch" aria-checked="'+!!x.is_active+'" aria-label="เปิดปิด '+esc(x[cfg.name])+'" data-action="toggle" data-id="'+id+'">'+(x.is_active?'● ON':'○ OFF')+'</button>'+(page==='links'?'<button data-action="copy" data-id="'+id+'">คัดลอกรหัส</button>':'')+'</div></td></tr>';
}).join('')||'<tr><td class="empty" colspan="'+(page==='links'?5:4)+'">'+(all.length?'ไม่พบข้อมูลที่ตรงกับการค้นหา':'ยังไม่มี '+cfg.title+' · กด “สร้างใหม่” เพื่อเริ่มต้น')+'</td></tr>';
$('result').textContent='แสดง '+rows.length+' จาก '+all.length+' รายการ';
}
const input=(n,t,v='',a='')=>'<label>'+t+'<input name="'+n+'" value="'+esc(v)+'" '+a+'></label>';
function options(k,id){return '<option value="">'+(k==='owners'?'เลือก Owner':'ไม่ระบุ Campaign')+'</option>'+data[k].filter(x=>x.is_active||String(x[defs[k].id])===String(id)).map(x=>'<option value="'+x[defs[k].id]+'" '+(String(x[defs[k].id])===String(id)?'selected':'')+'>'+esc(x[defs[k].name])+(!x.is_active?' (ปิดใช้งาน)':'')+'</option>').join('');}
function localDate(v){const d=new Date(v),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());}
function edit(row){
editing=row?row[cfg.id]:null;editingRow=row?structuredClone(row):null;const x=row||{is_active:1};$('error').textContent='';$('form-title').textContent=(row?'แก้ไข ':'สร้าง ')+cfg.title;
let html=input(cfg.name,page==='links'?'Ref Code *':'ชื่อ '+cfg.title+' *',x[cfg.name],page==='links'?'required maxlength="64" pattern="[A-Za-z0-9_-]+" title="ใช้ตัวอักษรอังกฤษ ตัวเลข ขีดกลาง หรือขีดล่าง"':'required maxlength="200"');
if(page==='campaigns')html+='<label>รายละเอียด<textarea name="ref_campaign_desc">'+esc(x.ref_campaign_desc)+'</textarea></label>';
if(page==='links')html+=''+input('destination_url','URL ปลายทาง *',x.destination_url,'required type="url" maxlength="2048" placeholder="https://…"')+'<div class="pair"><label>Owner *<select name="owner_id" required>'+options('owners',x.owner_id||params.get('owner_id'))+'</select></label><label>Campaign<select name="campaign_id">'+options('campaigns',x.campaign_id||params.get('campaign_id'))+'</select></label></div>'+(!data.owners.some(o=>o.is_active)?'<p class="hint">ยังไม่มี Owner ที่เปิดใช้งาน <a href="owners.html">ไปจัดการ Owner</a></p>':'')+'<div class="pair"><label>ช่องทาง<select name="source_id"><option value="">ไม่ระบุช่องทาง</option>'+data.sources.filter(s=>s.is_active||s.source_id===x.source_id).map(s=>'<option value="'+esc(s.source_id)+'" '+(s.source_id===x.source_id?'selected':'')+'>'+esc(s.source_name)+'</option>').join('')+'</select></label>'+input('expired_dt','วันหมดอายุ (ไม่บังคับ)',x.expired_dt?localDate(x.expired_dt):'','type="datetime-local" step="1"')+'</div><label>หมายเหตุ<textarea name="memo">'+esc(x.memo)+'</textarea></label>';
html+='<label><input name="is_active" type="checkbox" '+(x.is_active?'checked':'')+'> เปิดใช้งาน</label>';
$('fields').innerHTML=html;$('editor').showModal();
}
$('form').onsubmit=async e=>{
e.preventDefault();if(busy||!loaded)return;busy=true;const submitButton=e.target.querySelector('[type=submit]');submitButton.disabled=true;const f=new FormData(e.target),old=editingRow,item={is_active:f.has('is_active')?1:0};
try{
item[cfg.name]=f.get(cfg.name).trim();if(!item[cfg.name])throw Error('กรุณาระบุชื่อหรือรหัส');
if(page==='campaigns')item.ref_campaign_desc=f.get('ref_campaign_desc').trim()||null;
if(page==='links'){
if(data.links.some(x=>x.ref_code===item.ref_code&&x.ref_link_id!==editing))throw Error('Ref Code นี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
item.destination_url=f.get('destination_url').trim();const url=new URL(item.destination_url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('ใช้ URL แบบ http หรือ https ที่ไม่มีชื่อผู้ใช้และรหัสผ่าน');
item.owner_id=Number(f.get('owner_id'));item.campaign_id=f.get('campaign_id')?Number(f.get('campaign_id')):null;item.source_id=f.get('source_id')||null;
if(!find('owners',item.owner_id))throw Error('กรุณาเลือก Owner ที่มีอยู่');
for(const [k,fk] of [['owners','owner_id'],['campaigns','campaign_id']])if(item[fk]&&!find(k,item[fk])?.is_active&&item[fk]!==old?.[fk])throw Error('เลือก '+defs[k].title+' ที่เปิดใช้งาน');
item.expired_dt=f.get('expired_dt')?new Date(f.get('expired_dt')).toISOString():null;
if(item.expired_dt&&(Date.parse(item.expired_dt)<1000||Date.parse(item.expired_dt)>2147483647000))throw Error('วันหมดอายุอยู่นอกช่วง TIMESTAMP ที่ฐานข้อมูลรองรับ (1970–2038)');
item.memo=f.get('memo').trim()||null;
}
for(const k of ['memo','ref_campaign_desc'])if(item[k]&&new TextEncoder().encode(item[k]).length>65535)throw Error('ข้อความยาวเกินขนาดที่รองรับ');
await persist(item,old);$('editor').close();toast('บันทึกข้อมูลแล้ว');
}catch(err){$('error').textContent=err.message;}finally{busy=false;submitButton.disabled=false;}
};
$('rows').onclick=async e=>{
const b=e.target.closest('button[data-action]');if(!b||busy||!loaded)return;const x=data[page].find(r=>String(r[cfg.id])===b.dataset.id);if(!x)return;
if(b.dataset.action==='edit')edit(x);
if(b.dataset.action==='toggle'){
const n=page==='links'?0:total(page,x[cfg.id]);if(x.is_active&&!confirm('ปิดใช้งาน “'+x[cfg.name]+'”?'+(n?' ลิงก์ที่เกี่ยวข้อง '+n+' รายการจะติดข้อจำกัดจนกว่าจะเปิดกลับ':'')))return;
busy=true;b.disabled=true;try{await persist({is_active:1-x.is_active},x);toast('เปลี่ยนสถานะแล้ว');}catch(err){toast(err.message);}finally{busy=false;b.disabled=false;}
}
if(b.dataset.action==='copy'){try{await navigator.clipboard.writeText(x.ref_code);toast('คัดลอก Ref Code แล้ว');}catch{prompt('คัดลอก Ref Code นี้',x.ref_code);}}
};
$('create').onclick=()=>edit();$('cancel').onclick=()=>$('editor').close();$('search').oninput=e=>{query=e.target.value;render();};$('status').onchange=e=>{filter=e.target.value;render();};
$('reload').onclick=()=>load();
$('logout').onclick=()=>login();
$('editor').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('cancel').onclick=()=>{if(!busy)$('editor').close();};
window.addEventListener('focus',()=>{if(!busy&&!$('editor').open)load();});
render();load();
})();
