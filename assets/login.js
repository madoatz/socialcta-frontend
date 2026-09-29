'use strict';
(()=>{
 const environment=window.SOCIAL_CTA_CONFIG?.environment||'runtest';
 const key='socialcta.session.v3.'+environment,form=document.getElementById('login-form'),error=document.getElementById('login-error');
 document.title=(environment==='production'?'PRODUCTION':'RUNTEST')+' · '+document.title;
 form.insertAdjacentHTML('afterbegin','<p class="environment-label">'+(environment==='production'?'PRODUCTION':'RUNTEST')+'</p>');
 const requested=new URLSearchParams(location.search).get('next');
 const next=['campaigns.html','owners.html','links.html'].includes(requested)?requested:'campaigns.html';
 form.onsubmit=async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;error.textContent='';
  try{
   const base=window.SOCIAL_CTA_CONFIG?.apiBaseUrl;if(!base)throw Error('ยังไม่ได้ตั้งค่า Backend URL');
   const fields=new FormData(form);
   const response=await fetch(base+'/api/auth/login',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password')})});
   const value=await response.json();if(!response.ok)throw Error(value.error||'เข้าสู่ระบบไม่สำเร็จ');
   if(typeof value.accessToken!=='string'||!Number.isFinite(value.expiresAt))throw Error('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
   sessionStorage.setItem(key,JSON.stringify(value));form.reset();location.replace(next);
  }catch(problem){error.textContent=problem instanceof TypeError?'ติดต่อ Backend ไม่สำเร็จ กรุณาลองใหม่':problem.message;}
  finally{button.disabled=false;}
 };
})();

