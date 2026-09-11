let currentPrice = null;
const TEMPLATE_DATA = [
  {id:1,name:'Minimal 01',category:'Minimal',url:''},
  {id:2,name:'Minimal 02',category:'Minimal',url:''},
  {id:3,name:'Adat Nusantara',category:'Elegant',url:'templates/adat-nusantara.html'},
  {id:4,name:'Elegant 02',category:'Elegant',url:''},
  {id:5,name:'Romantic 01',category:'Romantic',url:''},
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

function paymentRow(d){
  const status=d.status||d.paymentStatus||'pending';
  const manageUrl=status==='approved' && d.manage_id?abs('/m/'+d.manage_id):'';
  return `<div class="admin-table-row order-row">
    <div class="order-pair"><span>Pasangan</span><strong>${esc((d.groom||'-')+' & '+(d.bride||'-'))}</strong><small>${esc(d.buyer_name||d.paymentName||'-')}</small></div>
    <div class="order-theme"><span>Tema</span><strong>${esc(d.template_name||d.templateName||'-')}</strong></div>
    <div class="order-status"><span>Status</span>${statusBadge(status)}</div>
    <div class="order-actions"><span>Aksi</span><div class="order-action-buttons"><button class="small-btn" data-payment-detail="${esc(d.id||'')}">Periksa</button>${manageUrl?`<a class="manage-url-btn" href="${esc(manageUrl)}" target="_blank" rel="noopener">Kelola ↗</a>`:`<span class="manage-unavailable">Belum tersedia</span>`}<button type="button" class="delete-order-btn" data-delete-order="${esc(d.id||'')}">Hapus</button></div></div>
  </div>`
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
  document.getElementById('overviewPayments').innerHTML=has?paymentRow(orders[0]):'<div class="admin-empty">Belum ada pesanan.</div>';
  document.getElementById('ordersList').innerHTML=has?orders.map(paymentRow).join(''):'<div class="admin-empty">Belum ada pesanan.</div>';
  document.getElementById('customersList').innerHTML=has?orders.map(d=>`<div class="admin-customer"><div><span>Pasangan</span><strong>${esc(d.groom||'-')} &amp; ${esc(d.bride||'-')}</strong></div><div><span>WhatsApp</span><strong>${esc(d.whatsapp||'-')}</strong></div><div><span>Tema</span><strong>${esc(d.template_name||'-')}</strong></div></div>`).join(''):'<div class="admin-empty">Belum ada customer.</div>';
  document.getElementById('templatesList').innerHTML='<div class="template-stat-list">'+TEMPLATE_DATA.map(t=>`<div class="template-stat"><div><strong>${esc(t.name)}</strong><span>${esc(t.category)}</span></div><strong>${orders.filter(d=>Number(d.template_id)===t.id).length} pesanan</strong></div>`).join('')+'</div>';
  const priceEl=document.getElementById('settingPriceValue'); if(priceEl)priceEl.textContent=money(currentPrice);
  const priceInput=document.getElementById('settingPriceInput'); if(priceInput)priceInput.value=currentPrice??'';
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
async function loadSettings(){
  if(!supabaseReady())return;
  try{const {data,error}=await supabaseClient.rpc('get_invitation_price');if(!error&&Number(data)>0){currentPrice=Number(data);render()}}catch(e){console.error(e)}
}
async function savePrice(){
  const input=document.getElementById('settingPriceInput'); const value=Number(input?.value||0);
  if(!Number.isInteger(value)||value<1000){showAdminNotice('Harga tidak valid','Masukkan harga undangan dalam rupiah yang benar.');return}
  try{
    if(supabaseReady()){const {data,error}=await supabaseClient.rpc('set_invitation_price',{p_price:value});if(error)throw error;currentPrice=Number(data||value)}else currentPrice=value;
    document.getElementById('settingPriceValue').textContent=money(currentPrice);
    showAdminNotice('Harga berhasil diubah','Harga untuk pesanan baru sekarang '+money(currentPrice)+'. Pesanan lama tetap memakai harga saat dibuat.');
  }catch(e){showAdminNotice('Gagal menyimpan harga',e.message||'Terjadi kesalahan.')}
}
function bind(){
  document.querySelectorAll('[data-payment-detail]').forEach(b=>b.onclick=()=>openModal(b.dataset.paymentDetail));
  document.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.deleteOrder));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchSection(b.dataset.go));
}
function switchSection(name){document.querySelectorAll('.admin-section').forEach(x=>x.classList.remove('active'));document.getElementById('section-'+name)?.classList.add('active');document.querySelectorAll('.admin-nav').forEach(x=>x.classList.toggle('active',x.dataset.section===name));const titles={overview:'Dashboard',orders:'Daftar Pesanan',customers:'Customer',templates:'Template',settings:'Pengaturan',media:'Media'};document.getElementById('pageTitle').textContent=titles[name]||'Dashboard';document.getElementById('adminSidebar')?.classList.remove('open')}

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

(async()=>{
  if(!/\/(admin-dashboard(?:\.html)?)$/.test(location.pathname)) return;
  if(supabaseReady()){
    const {data}=await supabaseClient.auth.getUser();
    if(!data?.user){location.href='/admin';return;}
    const {data:isAdmin,error}=await supabaseClient.rpc('is_admin');
    if(error || !isAdmin){document.body.innerHTML='<main style="padding:40px;font-family:system-ui"><h1>Akses admin ditolak.</h1><p>Tambahkan akun Google ini ke public.admin_users di Supabase.</p><a href="/admin">Kembali</a></main>';return;}
  }
  await loadOrders();
  await loadSettings();
})();
