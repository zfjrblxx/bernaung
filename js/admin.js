let currentPrice = null;
let developerSettings = {};
let paymentMethodsDraft = [];
const TEMPLATE_DATA = [
  {id:1,name:'Minimal 01',category:'Minimal',url:''},
  {id:2,name:'Minimal 02',category:'Minimal',url:''},
  {id:3,name:'Adat Nusantara',category:'Elegant',url:'templates/adat-nusantara.html'},
  {id:4,name:'Elegant 02',category:'Elegant',url:''},
  {id:5,name:'Romantic 01',category:'Romantic',url:'templates/romantic-selasar-rindu.html'},
  {id:6,name:'Romantic 02',category:'Romantic',url:''},
  {id:7,name:'Modern 01',category:'Modern',url:''},
  {id:8,name:'Modern 02',category:'Modern',url:''},
  {id:9,name:'Artistic 01',category:'Artistic',url:''},
  {id:10,name:'Artistic 02',category:'Artistic',url:''},
  {id:11,name:'Nature 01',category:'Nature',url:''},
  {id:12,name:'Nature 02',category:'Nature',url:''},
  {id:13,name:'Playful Ceria',category:'Playful',url:'templates/playful-ceria.html'},
  {id:14,name:'Islamic 01',category:'Islamic',url:''},
  {id:15,name:'Islamic 02',category:'Islamic',url:''}
];

function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function money(n){return n===null||n===undefined||n===''?'':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)}
function abs(u){if(!u)return'';return u.startsWith('http')?u:location.origin+'/'+u.replace(/^\//,'')}
function randomManageId(){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';const out=[];const bytes=new Uint8Array(32);while(out.length<16){if(window.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);for(const b of bytes){if(b>=248)continue;out.push(chars[b%62]);if(out.length===16)break}}return out.join('')}
function randomSecret(){return window.crypto ? (function(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=new Uint8Array(7);crypto.getRandomValues(b);return Array.from(b,x=>c[x%c.length]).join('')})() : 'Y68JS78'}
function slugifyCouple(groom,bride){
  const value=String((groom||'')+'-'+(bride||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return value || 'undangan';
}
async function makeUniqueInviteSlug(groom,bride,currentId){
  const base=slugifyCouple(groom,bride);
  if(!supabaseReady()) return base;
  const {data,error}=await supabaseClient.from('orders').select('id,invite_slug').like('invite_slug',base+'%');
  if(error) throw error;
  const used=new Set((data||[]).filter(x=>String(x.id)!==String(currentId)).map(x=>String(x.invite_slug||'')));
  if(!used.has(base)) return base;
  let n=2;
  while(used.has(base+'-'+n)) n++;
  return base+'-'+n;
}
function statusBadge(s){return `<span class="status-badge ${s==='approved'?'approved':s==='rejected'?'rejected':'pending'}">${esc(s||'pending')}</span>`}

let currentOrder = null;
let orders = [];

async function loadOrders(){
  if(!supabaseReady()){
    const d=getData(); orders=Object.keys(d).length?[d]:[]; render(); return;
  }
  const {data,error}=await supabaseClient.from('orders').select('*').order('created_at',{ascending:false});
  if(error){console.error(error);openAdminDialog({kicker:'DATA PESANAN',title:'Tidak dapat memuat pesanan',message:error.message||'Terjadi kesalahan saat memuat data.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden');return;}
  orders=data||[]; render();
}

function relativeTime(value){
  if(!value)return '—';
  const t=new Date(value).getTime(); if(!Number.isFinite(t))return '—';
  const diff=Math.max(0,Date.now()-t), m=Math.floor(diff/60000), h=Math.floor(m/60), d=Math.floor(h/24);
  if(m<1)return 'BARU SAJA'; if(m<60)return `${m} MENIT YANG LALU`; if(h<24)return `${h} JAM YANG LALU`; if(d<30)return `${d} HARI YANG LALU`;
  const mo=Math.floor(d/30); return `${mo} BULAN YANG LALU`;
}
function eventLabel(value){
  if(!value)return 'Tanggal acara belum diatur';
  const dt=new Date(value+'T00:00:00');
  if(Number.isNaN(dt.getTime()))return value;
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(dt);
}
function paymentRow(d){
  const status=d.status||d.paymentStatus||'pending';
  const manageUrl=status==='approved' && d.manage_id?abs('/m/'+d.manage_id):'';
  const pair=(d.groom||'-')+' & '+(d.bride||'-');
  return `<article class="order-row" data-status="${esc(status)}" data-pair="${esc(pair.toLowerCase())}">
    <button type="button" class="order-summary" data-order-toggle aria-expanded="false">
      <span class="order-dot" aria-hidden="true"></span>
      <span class="order-main"><strong>${esc(pair)}</strong><small>${esc(relativeTime(d.created_at))}<i>|</i> FOR ${esc(eventLabel(d.event_date))}</small></span>
      <span class="order-right">${statusBadge(status)}</span>
    </button>
    <div class="order-actions" aria-hidden="true"><button type="button" class="order-action" data-payment-detail="${esc(d.id||'')}">Periksa</button>${manageUrl?`<a class="order-action" href="${esc(manageUrl)}" target="_blank" rel="noopener">Kelola ↗</a>`:`<span class="order-action is-disabled">Kelola</span>`}<button type="button" class="order-action is-danger" data-delete-order="${esc(d.id||'')}">Hapus</button></div>
  </article>`
}

function render(){
  const has=orders.length>0;
  const pending=orders.filter(x=>(x.status||x.paymentStatus)==='pending').length;
  const active=orders.filter(x=>(x.status||x.paymentStatus)==='approved').length;
  const revenue=orders.filter(x=>(x.status||x.paymentStatus)==='approved').reduce((n,x)=>n+Number(x.price||0),0);
  document.getElementById('statOrders').textContent=orders.length;
  document.getElementById('statPending').textContent=pending;
  document.getElementById('statActive').textContent=active;
  document.getElementById('statRevenue').textContent=money(revenue);
  document.getElementById('overviewPayments').innerHTML=has?orders.slice(0,5).map(paymentRow).join(''):'<div class="admin-empty">Belum ada pesanan.</div>';
  document.getElementById('ordersList').innerHTML=has?orders.map(paymentRow).join(''):'<div class="admin-empty">Belum ada pesanan.</div>';
  document.getElementById('customersList').innerHTML=has?orders.map(d=>`<div class="admin-flat-row"><div><strong>${esc((d.groom||'-')+' & '+(d.bride||'-'))}</strong><small>${esc(d.whatsapp||'WhatsApp belum tersedia')}</small></div><span>${esc(d.template_name||'-')}</span></div>`).join(''):'<div class="admin-empty">Belum ada customer.</div>';
  renderTemplates();
  const devPrice=document.getElementById('devPriceInput'); if(devPrice)devPrice.value=developerSettings.invitation_price??currentPrice??'';
  bind();
}

async function openModal(id){
  const d=orders.find(x=>String(x.id)===String(id)) || orders[0]; if(!d)return; currentOrder=d;
  const modal=document.getElementById('paymentModal');
  let proof='';
  if(supabaseReady() && d.payment_proof_path){
    const r=await supabaseClient.storage.from('payment-proofs').createSignedUrl(d.payment_proof_path,600);
    if(!r.error) proof=r.data.signedUrl;
  }
  const publicUrl=d.invite_slug?abs('/'+d.invite_slug):'';
  const manageUrl=d.manage_id?abs('/m/'+d.manage_id):'';
  const secret=d.secret_code_plain||'';
  const accessHtml=(publicUrl||manageUrl||secret)?`<div class="payment-access"><div class="payment-access-head"><span>Akses undangan</span><small>Informasi akses yang tersedia setelah pembayaran disetujui.</small></div><div class="payment-access-grid"><div><span>Link Undangan</span><strong>${publicUrl?`<a href="${esc(publicUrl)}" target="_blank" rel="noopener">${esc(publicUrl)}</a>`:'Belum tersedia'}</strong></div><div><span>Manage URL</span><strong>${manageUrl?`<a href="${esc(manageUrl)}" target="_blank" rel="noopener">${esc(manageUrl)}</a>`:'Belum tersedia'}</strong></div><div><span>Kode Rahasia</span><strong>${secret?`<code>${esc(secret)}</code>`:'Belum tersedia'}</strong></div></div></div>`:'';
  document.getElementById('paymentDetail').innerHTML=`<div class="modal-heading"><span>PAYMENT REVIEW</span><h2>${esc(d.groom||'-')} &amp; ${esc(d.bride||'-')}</h2></div><div class="payment-detail-grid"><div><span>Atas Nama</span><strong>${esc(d.buyer_name||'-')}</strong></div><div><span>Nominal</span><strong>${money(d.payment_amount||currentPrice)}</strong></div><div><span>Metode</span><strong>${esc(d.payment_method||'-')}</strong></div><div><span>Bukti</span><strong>${proof?`<a href="${proof}" target="_blank">Buka bukti</a>`:esc(d.payment_proof_path||'-')}</strong></div><div><span>Tema</span><strong>${esc(d.template_name||'-')}</strong></div><div><span>Status</span><strong>${statusBadge(d.status||'pending')}</strong></div></div>${accessHtml}${d.status==='rejected' && d.payment_reject_reason?`<div class="payment-reject-reason"><span>Alasan penolakan</span><strong>${esc(d.payment_reject_reason)}</strong></div>`:''}${d.payment_note?`<div class="payment-note"><b>Catatan</b><div>${esc(d.payment_note)}</div></div>`:''}<div class="modal-actions">${d.status==='approved'?'':`<button class="approve-btn" id="modalApprove">ACC pembayaran</button>`}${d.status==='rejected'?'':`<button class="reject-btn" id="modalReject">Tolak pembayaran</button>`}</div>`;
  modal.classList.add('show');
  document.getElementById('modalApprove')?.addEventListener('click',approve);
  document.getElementById('modalReject')?.addEventListener('click',reject);
}
function closeModal(){document.getElementById('paymentModal')?.classList.remove('show')}

function ensureAdminDialog(){
  let el=document.getElementById('adminActionModal');
  if(el)return el;
  el=document.createElement('div');
  el.id='adminActionModal';
  el.className='admin-action-modal';
  el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="admin-action-backdrop" data-dialog-close></div><div class="admin-action-box" role="dialog" aria-modal="true" aria-labelledby="adminActionTitle"><button type="button" class="admin-action-close" data-dialog-close>×</button><span id="adminActionKicker" class="admin-action-kicker">BERNAUNG ADMIN</span><h2 id="adminActionTitle">Konfirmasi</h2><p id="adminActionMessage"></p><label id="adminActionField" class="admin-action-field hidden"><span id="adminActionLabel">Alasan</span><textarea id="adminActionInput" rows="4"></textarea></label><div class="admin-action-buttons"><button type="button" class="admin-dialog-cancel" data-dialog-cancel>Batal</button><button type="button" class="admin-dialog-confirm" id="adminDialogConfirm">Lanjutkan</button></div></div>`;
  document.body.appendChild(el);
  return el;
}
function closeAdminDialog(){
  const el=document.getElementById('adminActionModal');
  if(!el)return;
  el.classList.remove('show'); el.setAttribute('aria-hidden','true');
}
function openAdminDialog({kicker='BERNAUNG ADMIN',title='Konfirmasi',message='',confirmText='Lanjutkan',cancelText='Batal',danger=false,input=false,inputLabel='Alasan',inputPlaceholder='',onConfirm}){
  const el=ensureAdminDialog();
  el.querySelector('#adminActionKicker').textContent=kicker;
  el.querySelector('#adminActionTitle').textContent=title;
  el.querySelector('#adminActionMessage').textContent=message;
  const field=el.querySelector('#adminActionField');
  const inputEl=el.querySelector('#adminActionInput');
  field.classList.toggle('hidden',!input);
  inputEl.value=''; inputEl.placeholder=inputPlaceholder;
  el.querySelector('#adminActionLabel').textContent=inputLabel;
  el.querySelector('#adminDialogConfirm').textContent=confirmText;
  el.querySelector('[data-dialog-cancel]').textContent=cancelText;
  el.querySelector('[data-dialog-cancel]').classList.remove('hidden');
  el.querySelector('#adminDialogConfirm').classList.toggle('danger',!!danger);
  el.classList.add('show'); el.setAttribute('aria-hidden','false');
  setTimeout(()=>input ? inputEl.focus() : el.querySelector('#adminDialogConfirm').focus(),30);
  const confirm=async()=>{
    if(input && !inputEl.value.trim()) { inputEl.focus(); return; }
    closeAdminDialog();
    await onConfirm?.(inputEl.value.trim());
  };
  el.querySelector('#adminDialogConfirm').onclick=confirm;
  return el;
}
function showAdminNotice(title,message,confirmText='Oke'){
  openAdminDialog({kicker:'BERNAUNG ADMIN',title,message,confirmText,cancelText:'',onConfirm:()=>{}});
  const el=document.getElementById('adminActionModal');
  el.querySelector('[data-dialog-cancel]').classList.add('hidden');
}
async function approve(){
  if(!currentOrder)return;
  let manageId=currentOrder.manage_id||randomManageId();
  if(!currentOrder.manage_id && supabaseReady()){
    for(let attempt=0;attempt<5;attempt++){const {data:dupe}=await supabaseClient.from('orders').select('id').eq('manage_id',manageId).limit(1);if(!dupe?.length)break;manageId=randomManageId()}
  }
  const secretCode=currentOrder.secret_code_plain||randomSecret();
  const slug=currentOrder.invite_slug||await makeUniqueInviteSlug(currentOrder.groom,currentOrder.bride,currentOrder.id);
  const patch={status:'approved',manage_id:manageId,secret_code_plain:secretCode,invite_slug:slug,approved_at:new Date().toISOString(),payment_reject_reason:null,rejected_at:null};
  try{
    if(supabaseReady()){
      const {error}=await supabaseClient.from('orders').update(patch).eq('id',currentOrder.id); if(error)throw error;
    }else{
      const d=getData(); Object.assign(d,{paymentStatus:'approved',manageId,secretCode,manageUrl:'/m/'+manageId,inviteSlug:slug,inviteUrl:'/'+encodeURIComponent(slug),approvedAt:new Date().toISOString()}); saveData(d); localStorage.setItem('bernaung_manage_'+manageId,JSON.stringify(d));
    }
    closeModal(); await loadOrders();
    openAdminDialog({kicker:'PEMBAYARAN DISETUJUI',title:'Pembayaran disetujui',message:`Undangan siap dikelola.\n\nManage URL: ${abs('/m/'+manageId)}\nKode rahasia: ${secretCode}`,confirmText:'Oke',cancelText:'',onConfirm:()=>{}});
    document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden');
  }catch(e){openAdminDialog({kicker:'TERJADI KESALAHAN',title:'Gagal ACC',message:e.message||'Terjadi kesalahan.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden')}
}
async function reject(){
  if(!currentOrder)return;
  openAdminDialog({kicker:'PEMBAYARAN',title:'Tolak pembayaran',message:'Masukkan alasan penolakan yang akan disimpan pada pesanan.',confirmText:'Tolak pembayaran',input:true,inputLabel:'Alasan penolakan',inputPlaceholder:'Contoh: Bukti pembayaran tidak sesuai dengan nominal transfer.',danger:true,onConfirm:async(reason)=>{
    try{
      if(supabaseReady()){
        const {error}=await supabaseClient.from('orders').update({status:'rejected',payment_reject_reason:reason,rejected_at:new Date().toISOString()}).eq('id',currentOrder.id); if(error)throw error;
      }else{const d=getData();d.paymentStatus='rejected';d.paymentRejectReason=reason;saveData(d)}
      closeModal(); await loadOrders();
    }catch(e){openAdminDialog({kicker:'TERJADI KESALAHAN',title:'Gagal menolak pembayaran',message:e.message||'Terjadi kesalahan.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden')}
  }});
}
async function deleteOrder(id){
  const d=orders.find(x=>String(x.id)===String(id)); if(!d)return;
  openAdminDialog({kicker:'HAPUS PESANAN',title:'Hapus pesanan?',message:`Pesanan ${d.groom||'-'} & ${d.bride||'-'} akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`,confirmText:'Hapus pesanan',danger:true,onConfirm:async()=>{
    try{
      if(supabaseReady()){
        const {error}=await supabaseClient.from('orders').delete().eq('id',d.id); if(error)throw error;
      }else{
        const current=getData(); if(String(current.id)===String(d.id)||!d.id){localStorage.removeItem('bernaung_data');} 
      }
      await loadOrders();
    }catch(e){openAdminDialog({kicker:'TERJADI KESALAHAN',title:'Gagal menghapus',message:e.message||'Pesanan tidak dapat dihapus.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden')}
  }});
}
async function loadDeveloperSettings(){
  if(!supabaseReady())return;
  try{const {data,error}=await supabaseClient.rpc('get_developer_settings');if(error)throw error;developerSettings=data||{};currentPrice=Number(developerSettings.invitation_price||0)||null;paymentMethodsDraft=Array.isArray(developerSettings.payment_methods)?developerSettings.payment_methods.map(x=>({...x})):[];fillDeveloperForms()}catch(e){console.error(e)}
}
function fillDeveloperForms(){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};
  set('devPriceInput',developerSettings.invitation_price);set('devWhatsappInput',developerSettings.admin_whatsapp);
  const rem=document.getElementById('devReminderEnabled');if(rem)rem.checked=developerSettings.reminder_enabled!==false;
  const maint=document.getElementById('devMaintenance');if(maint)maint.checked=developerSettings.maintenance===true;set('devMaintenanceMessage',developerSettings.maintenance_message||'Bernaung sedang melakukan pemeliharaan. Silakan kembali beberapa saat lagi.');
  renderPaymentMethods();renderQrisPreview();renderReminderList();
}
async function saveDeveloperSetting(key,value,success='Pengaturan tersimpan.'){
  if(!supabaseReady())return;
  try{const {data,error}=await supabaseClient.rpc('set_developer_setting',{p_key:key,p_value:value});if(error)throw error;developerSettings=data||developerSettings;currentPrice=Number(developerSettings.invitation_price||currentPrice)||null;fillDeveloperForms();showAdminNotice(success,'Perubahan berhasil disimpan.')}catch(e){showAdminNotice('Gagal menyimpan pengaturan',e.message||'Terjadi kesalahan.')}}
function renderPaymentMethods(){const wrap=document.getElementById('paymentMethodsEditor');if(!wrap)return;wrap.innerHTML=paymentMethodsDraft.map((x,i)=>`<div class="developer-payment-row"><label>Nama<input data-pay-name="${i}" value="${esc(x.name||'')}"></label><label>Nomor<input data-pay-number="${i}" value="${esc(x.number||'')}"></label><label>Atas nama<input data-pay-holder="${i}" value="${esc(x.holder||'')}"></label><button type="button" class="small-btn danger-outline" data-remove-pay="${i}">Hapus</button></div>`).join('')||'<div class="admin-empty">Belum ada rekening atau e-wallet.</div>'}
function syncPaymentDraft(){document.querySelectorAll('[data-pay-name]').forEach(e=>paymentMethodsDraft[Number(e.dataset.payName)].name=e.value.trim());document.querySelectorAll('[data-pay-number]').forEach(e=>paymentMethodsDraft[Number(e.dataset.payNumber)].number=e.value.trim());document.querySelectorAll('[data-pay-holder]').forEach(e=>paymentMethodsDraft[Number(e.dataset.payHolder)].holder=e.value.trim())}
function renderQrisPreview(){const e=document.getElementById('devQrisPreview');if(!e)return;e.innerHTML=developerSettings.qris_url?`<img src="${esc(developerSettings.qris_url)}" alt="QRIS admin">`:'<span>Belum ada QRIS.</span>'}
function renderReminderList(){const wrap=document.getElementById('reminderList');if(!wrap)return;if(developerSettings.reminder_enabled===false){wrap.innerHTML='<div class="admin-empty">Notifikasi sedang dinonaktifkan.</div>';return}const days=14;const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-days);const list=orders.filter(d=>d.status==='approved'&&d.event_date&&new Date(d.event_date+'T00:00:00')<=cutoff);wrap.innerHTML=list.length?`<div class="developer-reminder-head">${list.length} undangan sudah melewati ${days} hari</div>`+list.map(d=>`<div class="developer-reminder-item"><div><strong>${esc((d.groom||'-')+' & '+(d.bride||'-'))}</strong><small>Acara: ${esc(d.event_date)}</small></div><a class="text-link" href="${esc(abs(d.invite_slug?'/'+d.invite_slug:''))}" target="_blank" rel="noopener">Buka undangan →</a></div>`).join(''):'<div class="admin-empty">Belum ada undangan yang melewati batas notifikasi.</div>'}
async function uploadDeveloperQris(file){if(!file)return developerSettings.qris_url||'';if(!file.type.startsWith('image/'))throw Error('File QRIS harus berupa gambar.');if(file.size>8*1024*1024)throw Error('Ukuran QRIS maksimal 8 MB.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`qris/admin-${Date.now()}.${ext}`;const {error}=await supabaseClient.storage.from('admin-assets').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});if(error)throw error;return supabaseClient.storage.from('admin-assets').getPublicUrl(path).data.publicUrl}
function bindDeveloper(){
  document.getElementById('saveDevPrice')?.addEventListener('click',()=>saveDeveloperSetting('invitation_price',String(Number(document.getElementById('devPriceInput')?.value||0)),'Harga undangan berhasil disimpan.'));
  document.getElementById('saveDevWhatsapp')?.addEventListener('click',()=>saveDeveloperSetting('admin_whatsapp',document.getElementById('devWhatsappInput')?.value.trim()||'','Nomor WhatsApp berhasil disimpan.'));
  document.getElementById('saveDevReminder')?.addEventListener('click',()=>saveDeveloperSetting('reminder',{enabled:!!document.getElementById('devReminderEnabled')?.checked,days:14},'Pengaturan notifikasi berhasil disimpan.'));
  document.getElementById('saveDevMaintenance')?.addEventListener('click',()=>saveDeveloperSetting('maintenance',{enabled:!!document.getElementById('devMaintenance')?.checked,message:document.getElementById('devMaintenanceMessage')?.value.trim()||''},'Maintenance Web berhasil diperbarui.'));
  document.getElementById('addPaymentMethod')?.addEventListener('click',()=>{syncPaymentDraft();paymentMethodsDraft.push({name:'',number:'',holder:''});renderPaymentMethods()});
  document.getElementById('paymentMethodsEditor')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-pay]');if(!b)return;syncPaymentDraft();paymentMethodsDraft.splice(Number(b.dataset.removePay),1);renderPaymentMethods()});
  document.getElementById('saveDevPayment')?.addEventListener('click',async()=>{syncPaymentDraft();try{const f=document.getElementById('devQrisFile')?.files?.[0];let url=developerSettings.qris_url||'';if(f)url=await uploadDeveloperQris(f);await saveDeveloperSetting('payment_methods',paymentMethodsDraft);await saveDeveloperSetting('qris_url',url,'Pengaturan pembayaran berhasil disimpan.')}catch(e){showAdminNotice('Gagal menyimpan pembayaran',e.message||'Terjadi kesalahan.')}});
  document.getElementById('removeDevQris')?.addEventListener('click',()=>saveDeveloperSetting('qris_url','','QRIS berhasil dihapus.'));
}
async function loadSettings(){await loadDeveloperSettings()}
async function savePrice(){const input=document.getElementById('devPriceInput');if(input)await saveDeveloperSetting('invitation_price',String(Number(input.value||0)),'Harga undangan berhasil disimpan.')}
function bind(){
  document.querySelectorAll('[data-order-toggle]').forEach(el=>{
    const toggle=()=>{const row=el.closest('.order-row');if(!row)return;const expanded=row.classList.toggle('is-expanded');el.setAttribute('aria-expanded',expanded?'true':'false');row.querySelector('.order-actions')?.setAttribute('aria-hidden',expanded?'false':'true');};
    el.onclick=toggle;
    el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
  });
  document.querySelectorAll('[data-payment-detail]').forEach(b=>b.onclick=e=>{e.stopPropagation();openModal(b.dataset.paymentDetail)});
  document.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteOrder(b.dataset.deleteOrder)});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchSection(b.dataset.go));
  document.querySelectorAll('.orders-tab').forEach(tab=>tab.onclick=()=>{
    document.querySelectorAll('.orders-tab').forEach(x=>x.classList.toggle('active',x===tab));
    applyOrderFilters();
  });
  document.getElementById('orderSearch')?.addEventListener('input',applyOrderFilters);
}
function applyOrderFilters(){
  const active=document.querySelector('.orders-tab.active')?.dataset.filter||'all';
  const q=(document.getElementById('orderSearch')?.value||'').trim().toLowerCase();
  document.querySelectorAll('#ordersList .order-row').forEach(row=>{
    const okStatus=active==='all'||row.dataset.status===active;
    const okSearch=!q||row.dataset.pair.includes(q);
    row.hidden=!(okStatus&&okSearch);
  });
}


let templatePage = 1;
const TEMPLATE_PAGE_SIZE = 8;
let templateFilter = 'Semua';
let adminTemplates = [];

function loadAdminTemplates(){
  try{
    const raw=localStorage.getItem('bernaung_admin_templates');
    if(raw){
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length) return parsed;
    }
  }catch(e){console.warn('Gagal memuat template admin',e)}
  return TEMPLATE_DATA.map(t=>({...t,description:templateDescription(t)}));
}
function saveAdminTemplates(){
  try{localStorage.setItem('bernaung_admin_templates',JSON.stringify(adminTemplates));}catch(e){console.warn('Gagal menyimpan template admin',e)}
}
function templateList(){ return adminTemplates.length ? adminTemplates : (adminTemplates=loadAdminTemplates()); }
function nextTemplateId(){ return templateList().reduce((m,t)=>Math.max(m,Number(t.id)||0),0)+1; }
function templateCategories(){ return ['Semua',...Array.from(new Set(templateList().map(t=>t.category).filter(Boolean)))]; }
function ensureTemplateDialog(){
  let el=document.getElementById('templateEditorModal');
  if(el)return el;
  el=document.createElement('div');
  el.id='templateEditorModal';
  el.className='admin-action-modal template-editor-modal';
  el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="admin-action-backdrop" data-template-close></div><div class="admin-action-box template-editor-box" role="dialog" aria-modal="true" aria-labelledby="templateEditorTitle"><button type="button" class="admin-action-close" data-template-close>×</button><span class="admin-action-kicker">TEMPLATE MANAGER</span><h2 id="templateEditorTitle">Tambah Template</h2><p id="templateEditorMessage">Isi detail template yang akan tersedia untuk customer.</p><div class="template-editor-fields"><label>Nama template<input id="templateEditorName" type="text" placeholder="Contoh: Elegant 03" autocomplete="off"></label><label>Kategori<input id="templateEditorCategory" type="text" placeholder="Contoh: Elegant" autocomplete="off"></label><label>URL template<input id="templateEditorUrl" type="url" placeholder="templates/nama-template.html" autocomplete="off"></label><label>Deskripsi<textarea id="templateEditorDescription" rows="3" placeholder="Deskripsi singkat template."></textarea></label></div><div class="admin-action-buttons"><button type="button" class="admin-dialog-cancel" data-template-close>Batal</button><button type="button" class="admin-dialog-confirm" id="templateEditorSave">Simpan template</button></div></div>`;
  document.body.appendChild(el);
  return el;
}
function closeTemplateEditor(){const el=document.getElementById('templateEditorModal');if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}}
function openTemplateEditor(template=null){
  const el=ensureTemplateDialog();
  el.dataset.editId=template?String(template.id):'';
  el.querySelector('#templateEditorTitle').textContent=template?`Edit ${template.name}`:'Tambah Template';
  el.querySelector('#templateEditorMessage').textContent=template?'Perbarui detail template yang dipilih.':'Isi detail template yang akan tersedia untuk customer.';
  el.querySelector('#templateEditorName').value=template?.name||'';
  el.querySelector('#templateEditorCategory').value=template?.category||'';
  el.querySelector('#templateEditorUrl').value=template?.url||'';
  el.querySelector('#templateEditorDescription').value=template?.description||'';
  el.classList.add('show');el.setAttribute('aria-hidden','false');
  setTimeout(()=>el.querySelector('#templateEditorName').focus(),30);
}
function saveTemplateFromEditor(){
  const el=document.getElementById('templateEditorModal'); if(!el)return;
  const name=el.querySelector('#templateEditorName').value.trim();
  const category=el.querySelector('#templateEditorCategory').value.trim();
  const url=el.querySelector('#templateEditorUrl').value.trim();
  const description=el.querySelector('#templateEditorDescription').value.trim();
  if(!name||!category){showAdminNotice('Data belum lengkap','Nama template dan kategori wajib diisi.');return;}
  const list=templateList(); const editId=el.dataset.editId;
  if(editId){
    const item=list.find(t=>String(t.id)===editId);
    if(item) Object.assign(item,{name,category,url,description:description||templateDescription({category})});
  }else{
    list.push({id:nextTemplateId(),name,category,url,description:description||templateDescription({category})});
  }
  saveAdminTemplates(); closeTemplateEditor(); templatePage=1; renderTemplates();
  showAdminNotice('Template tersimpan',editId?'Perubahan template berhasil disimpan.':'Template baru berhasil ditambahkan.');
}

function templateOrders(t){ return orders.filter(d=>Number(d.template_id)===Number(t.id)).length; }
function templateInitial(t){ return String(t.name||'T').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function templateDescription(t){
  const map={Minimal:'Desain minimalis dengan tampilan bersih dan modern.',Elegant:'Sentuhan elegan dengan detail yang menawan.',Romantic:'Nuansa romantis dengan sentuhan bunga yang indah.',Modern:'Tampilan modern dengan desain yang kekinian.','Elegant':'Sentuhan elegan dengan detail yang menawan.',Artistic:'Eksplorasi visual artistik untuk undangan personal.',Nature:'Nuansa natural dengan sentuhan lembut.',Playful:'Tampilan ceria dan ringan untuk momen bahagia.',Islamic:'Desain bernuansa islami yang tenang dan elegan.'};
  return map[t.category]||'Template undangan yang dapat dipilih oleh customer.';
}
function renderTemplates(){
  const q=(document.getElementById('templateSearch')?.value||'').trim().toLowerCase();
  const sort=document.getElementById('templateSort')?.value||'newest';
  const data=templateList();
  const categories=templateCategories();
  const filtered=data.filter(t=>(templateFilter==='Semua'||t.category===templateFilter)&&(!q||(`${t.name} ${t.category}`).toLowerCase().includes(q)));
  const sorted=[...filtered].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='orders'?templateOrders(b)-templateOrders(a):a.id-b.id);
  const total=sorted.length, pages=Math.max(1,Math.ceil(total/TEMPLATE_PAGE_SIZE));
  templatePage=Math.min(templatePage,pages);
  const shown=sorted.slice((templatePage-1)*TEMPLATE_PAGE_SIZE,templatePage*TEMPLATE_PAGE_SIZE);
  const statCats=['Minimal','Elegant','Romantic','Modern','Adat Nusantara','Lainnya'];
  const stat=document.getElementById('templateStats');
  if(stat){ const counts=cat=>data.filter(t=>t.category===cat).length; const known=statCats.slice(0,5).reduce((n,c)=>n+(c==='Adat Nusantara'?data.filter(t=>t.name==='Adat Nusantara').length:counts(c)),0); stat.innerHTML=`<div class="template-stat-card"><span>SEMUA TEMPLATE</span><strong>${data.length}</strong><small>dalam ${categories.length-1} kategori</small></div>`+statCats.slice(0,5).map(cat=>{const n=cat==='Adat Nusantara'?data.filter(t=>t.name==='Adat Nusantara').length:counts(cat);return `<div class="template-stat-card"><span>${esc(cat)}</span><strong>${n}</strong><small>template</small></div>`}).join('')+`<div class="template-stat-card"><span>LAINNYA</span><strong>${Math.max(0,data.length-known)}</strong><small>template</small></div>`; }
  const tabs=document.getElementById('templateTabs');
  if(tabs) tabs.innerHTML=categories.map(cat=>`<button type="button" class="template-tab ${templateFilter===cat?'active':''}" data-template-filter="${esc(cat)}">${esc(cat)} <span>(${cat==='Semua'?data.length:data.filter(t=>t.category===cat).length})</span></button>`).join('');
  const list=document.getElementById('templatesList');
  if(list) list.innerHTML=shown.length?shown.map(t=>{const n=templateOrders(t);const thumb=t.url?`<iframe src="${esc(t.url)}" title="${esc(t.name)}" loading="lazy"></iframe>`:`<div class="template-placeholder"><span>${esc(t.category.toUpperCase())}</span><strong>${esc(templateInitial(t))}</strong><small>${esc(t.name)}</small></div>`;return `<article class="template-admin-card"><div class="template-admin-thumb">${thumb}<span class="template-category-badge">${esc(t.category)}</span></div><div class="template-admin-content"><div class="template-card-top"><div><h3>${esc(t.name)}</h3><p>${esc(templateDescription(t))}</p></div><button type="button" class="template-more" aria-label="Aksi ${esc(t.name)}">•••</button></div><div class="template-order-count">♧ ${n} pesanan</div><div class="template-card-actions">${t.url?`<a class="template-preview-btn" href="${esc(t.url)}" target="_blank" rel="noopener">◉&nbsp; Preview</a>`:`<button type="button" class="template-preview-btn" data-template-preview="${esc(t.id)}">◉&nbsp; Preview</button>`}<button type="button" class="template-edit-btn" data-template-edit="${esc(t.id)}">✎&nbsp; Edit</button></div></div></article>`}).join(''):'<div class="template-no-results">Tidak ada template yang cocok.</div>';
  const label=document.getElementById('templateCountLabel'); if(label) label.textContent=`Menampilkan ${shown.length} dari ${total} template`;
  const pag=document.getElementById('templatePagination'); if(pag) pag.innerHTML=`<button type="button" data-template-page="prev" ${templatePage<=1?'disabled':''}>‹</button>${Array.from({length:pages},(_,i)=>`<button type="button" class="${i+1===templatePage?'active':''}" data-template-page="${i+1}">${i+1}</button>`).join('')}<button type="button" data-template-page="next" ${templatePage>=pages?'disabled':''}>›</button>`;
  bindTemplateControls();
}
function bindTemplateControls(){
  document.querySelectorAll('[data-template-filter]').forEach(b=>b.onclick=()=>{templateFilter=b.dataset.templateFilter;templatePage=1;renderTemplates()});
  document.getElementById('templateSearch')?.addEventListener('input',()=>{templatePage=1;renderTemplates()});
  document.getElementById('templateSort')?.addEventListener('change',()=>{templatePage=1;renderTemplates()});
  document.querySelectorAll('[data-template-page]').forEach(b=>b.onclick=()=>{if(b.disabled)return;const v=b.dataset.templatePage;if(v==='prev')templatePage--;else if(v==='next')templatePage++;else templatePage=Number(v);renderTemplates()});
  document.querySelectorAll('[data-template-preview]').forEach(b=>b.onclick=()=>{const t=templateList().find(x=>String(x.id)===String(b.dataset.templatePreview));if(t?.url)window.open(t.url,'_blank','noopener');else openAdminDialog({kicker:'TEMPLATE',title:'Preview belum tersedia',message:'Template ini belum memiliki halaman preview yang terhubung.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}})});
  document.querySelectorAll('[data-template-edit]').forEach(b=>b.onclick=()=>{const t=templateList().find(x=>String(x.id)===String(b.dataset.templateEdit));if(t)openTemplateEditor(t)});
}

function switchSection(name){document.querySelectorAll('.admin-section').forEach(x=>x.classList.remove('active'));document.getElementById('section-'+name)?.classList.add('active');document.querySelectorAll('.admin-nav').forEach(x=>x.classList.toggle('active',x.dataset.section===name));const titles={overview:'Dashboard',orders:'Daftar Pesanan',customers:'Customer',templates:'Template',settings:'Pengaturan',media:'Media','dev-price':'Harga Undangan','dev-payment':'Pembayaran','dev-whatsapp':'WhatsApp','dev-reminder':'Notif Sudah 14 Hari Setelah Acara','dev-maintenance':'Maintenance Web'};document.getElementById('pageTitle').textContent=titles[name]||'Dashboard';document.getElementById('adminSidebar')?.classList.remove('open')}

document.getElementById('googleLogin')?.addEventListener('click',async()=>{if(!supabaseReady()){openAdminDialog({kicker:'KONFIGURASI',title:'Supabase belum aktif',message:'Isi Supabase URL dan publishable key di js/supabase.js terlebih dahulu.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden');return;}const {error}=await supabaseClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/admin-dashboard'}});if(error){openAdminDialog({kicker:'LOGIN ADMIN',title:'Google Login gagal',message:error.message||'Terjadi kesalahan saat login.',confirmText:'Oke',cancelText:'',onConfirm:()=>{}});document.querySelector('#adminActionModal [data-dialog-cancel]')?.classList.add('hidden')}});
document.querySelectorAll('.admin-nav').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));
document.getElementById('adminMenu')?.addEventListener('click',()=>document.getElementById('adminSidebar')?.classList.toggle('open'));
document.getElementById('adminSidebarBackdrop')?.addEventListener('click',()=>document.getElementById('adminSidebar')?.classList.remove('open'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();document.getElementById('adminSidebar')?.classList.remove('open')}});
document.getElementById('closePaymentModal')?.addEventListener('click',closeModal);
document.getElementById('paymentModal')?.addEventListener('click',e=>{if(e.target.id==='paymentModal')closeModal()});
document.addEventListener('click',e=>{if(e.target.matches('[data-dialog-close],[data-dialog-cancel]')){closeAdminDialog();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAdminDialog();});
document.getElementById('adminLogout')?.addEventListener('click',async()=>{if(supabaseReady())await supabaseClient.auth.signOut();location.href='/admin'});
document.getElementById('addTemplateBtn')?.addEventListener('click',()=>openTemplateEditor());
document.addEventListener('click',e=>{if(e.target.matches('[data-template-close]'))closeTemplateEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTemplateEditor()});
document.addEventListener('click',e=>{if(e.target.id==='templateEditorSave')saveTemplateFromEditor()});

adminTemplates=loadAdminTemplates();

(async()=>{
  if(!/\/(admin-dashboard(?:\.html)?)$/.test(location.pathname)) return;
  if(supabaseReady()){
    const {data}=await supabaseClient.auth.getUser();
    if(!data?.user){location.href='/admin';return;}
    const {data:isAdmin,error}=await supabaseClient.rpc('is_admin');
    if(error || !isAdmin){document.body.innerHTML='<main style="padding:40px;font-family:system-ui"><h1>Akses admin ditolak.</h1><p>Tambahkan akun Google ini ke public.admin_users di Supabase.</p><a href="/admin">Kembali</a></main>';return;}
  }
  await loadOrders();
  await loadDeveloperSettings();
  bindDeveloper();
})();
