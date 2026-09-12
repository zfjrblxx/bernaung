const templates=[
{id:1,name:'Minimal 01',cat:'Minimal',tone:'minimal'},
{id:2,name:'Minimal 02',cat:'Minimal',tone:'clean'},
{id:3,name:'Adat Nusantara',cat:'Elegant',tone:'elegant',url:'templates/adat-nusantara.html'},
{id:4,name:'Elegant 02',cat:'Elegant',tone:'classic'},
{id:5,name:'Romantic 01',cat:'Romantic',tone:'romantic'},
{id:6,name:'Romantic 02',cat:'Romantic',tone:'soft'},
{id:7,name:'Modern 01',cat:'Modern',tone:'modern'},
{id:8,name:'Modern 02',cat:'Modern',tone:'bold'},
{id:9,name:'Artistic 01',cat:'Artistic',tone:'art'},
{id:10,name:'Artistic 02',cat:'Artistic',tone:'gallery'},
{id:11,name:'Laras Bumi',cat:'Nature',tone:'nature',url:'templates/nature-laras-bumi.html'},
{id:12,name:'Nature 02',cat:'Nature',tone:'garden'},
{id:13,name:'Playful Ceria',cat:'Playful',tone:'playful',url:'templates/playful-ceria.html'},
{id:14,name:'Islamic 01',cat:'Islamic',tone:'islamic'},
{id:15,name:'Islamic 02',cat:'Islamic',tone:'mosque'}
];
const cats=['Semua','Minimal','Elegant','Romantic','Modern','Artistic','Nature','Playful','Islamic'];
function getData(){try{return JSON.parse(localStorage.getItem('bernaungData')||'{}')}catch{return {}}}
function saveData(data){localStorage.setItem('bernaungData',JSON.stringify(data))}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function formatPrice(n){return n===null||n===undefined||n===''?'':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)}
window.BERNAUNG_PRICE=null;
window.BernaungPriceReady=(async()=>{let price=null;if(supabaseReady()){try{const {data,error}=await supabaseClient.rpc('get_invitation_price');if(!error&&Number(data)>0)price=Number(data)}catch(e){console.warn('Harga belum tersedia.',e)}}window.BERNAUNG_PRICE=price;document.querySelectorAll('[data-price]').forEach(el=>el.textContent=price?formatPrice(price):'');document.dispatchEvent(new CustomEvent('bernaung:price-ready',{detail:{price}}));return price})();
function renderCards(el,list=templates.slice(0,6)){if(!el)return;el.innerHTML=list.map(t=>`<article class="template-card"><div class="template-thumb ${t.url?'real-template-thumb':''}">${t.url?`<iframe src="${t.url}" title="Preview ${esc(t.name)}" loading="lazy"></iframe>`:`<div><span>${esc(t.cat.toUpperCase())}</span><strong>${esc(t.name)}</strong><span>BERNAUNG</span></div>`}</div><div class="template-info"><b>${esc(t.name)}</b><small data-price>${formatPrice(window.BERNAUNG_PRICE)}</small></div></article>`).join('');window.BernaungPriceReady?.then(p=>el.querySelectorAll('[data-price]').forEach(x=>x.textContent=formatPrice(p)))}
async function checkPublicMaintenance(){
  if(!supabaseReady()||document.body.classList.contains('admin-body'))return;
  try{
    const {data,error}=await supabaseClient.rpc('get_public_site_status');
    if(error||!data?.maintenance)return;
    document.documentElement.classList.add('maintenance-mode');
    document.body.innerHTML=`<main class="maintenance-page"><div class="maintenance-inner"><span class="eyebrow">BERNAUNG</span><h1>Website sedang dipelihara.</h1><p>${esc(data.message||'Bernaung sedang melakukan pemeliharaan. Silakan kembali beberapa saat lagi.')}</p></div></main>`;
  }catch(e){console.warn('Status maintenance tidak dapat dimuat.',e)}
}

document.addEventListener('DOMContentLoaded',()=>{
 checkPublicMaintenance();
 renderCards(document.getElementById('homeTemplates'));
 const menu=document.querySelector('.menu'),nav=document.querySelector('.nav nav');
 if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('mobile-open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'}));}
 const faq=document.getElementById('faqList');
 if(faq){const items=[
 ['Apa itu Bernaung?','Bernaung adalah layanan untuk membuat undangan pernikahan digital yang bisa dibagikan lewat link.'],
 ['Perlu membuat akun untuk memesan?','Tidak. Kamu tidak perlu membuat akun atau login untuk membuat undangan.'],
 ['Berapa harga undangan?','Harga undangan mengikuti harga terbaru yang diatur oleh Bernaung. Semua tema menggunakan harga yang sama.'],
 ['Bagaimana cara membuat undangan?','Isi data undangan, pilih tema, periksa kembali, lalu lanjutkan ke pembayaran.'],
 ['Bagaimana cara membayar?','Pembayaran dilakukan secara manual melalui rekening atau e-wallet Bernaung. Setelah transfer, kirim bukti pembayaran untuk diperiksa admin.'],
 ['Kapan undangan aktif?','Undangan aktif setelah bukti pembayaran diperiksa dan disetujui oleh admin.'],
 ['Apakah undangan bisa diedit?','Bisa. Setelah pembayaran disetujui, kamu mendapatkan akses Manage untuk mengubah isi undangan.'],
 ['Apa itu halaman Manage?','Manage adalah halaman khusus untuk mengatur isi undangan setelah pembayaran disetujui.'],
 ['Apa saja yang bisa diubah di Manage?','Kamu bisa mengubah data, foto, musik, informasi acara, rekening atau gift, dan beberapa bagian undangan lainnya.'],
 ['Apakah tamu bisa RSVP?','Bisa. Tamu dapat mengonfirmasi kehadiran langsung dari undangan.'],
 ['Apakah tamu bisa mengirim ucapan?','Bisa. Tamu dapat menulis ucapan langsung melalui undangan.'],
 ['Apa itu Link Tamu?','Link Tamu adalah link personal yang dibuat berdasarkan nama tamu, misalnya link khusus untuk Budi.'],
 ['Bisa membuat banyak Link Tamu sekaligus?','Bisa. Masukkan hingga 50 nama, satu nama per baris, lalu generate semua link sekaligus.'],
 ['Bisa export Link Tamu?','Bisa. Hasil link dapat disalin sekaligus atau diekspor menjadi file TXT.'],
 ['Apakah Google Maps tersedia?','Ya. Kamu bisa menambahkan link Google Maps pada detail acara agar tamu mudah menemukan lokasi.'],
 ['Apakah rekening atau gift wajib diisi?','Tidak. Bagian rekening atau gift bersifat opsional dan bisa dikosongkan.'],
 ['Apakah susunan acara wajib diisi?','Tidak. Susunan acara bersifat opsional. Jika tidak diisi, bagian tersebut tidak perlu ditampilkan.'],
 ['Apakah musik bisa ditambahkan?','Bisa. Musik dapat diatur melalui halaman Manage setelah undangan aktif.'],
 ['Apakah foto bisa ditambahkan setelah pembayaran?','Bisa. Foto dapat diatur melalui halaman Manage.'],
 ['Apakah tema bisa diganti?','Bisa. Setiap undangan memiliki maksimal dua kali kesempatan mengganti tema setelah aktif.'],
 ['Apakah semua tema harganya sama?','Ya. Semua tema yang tersedia menggunakan harga undangan yang sama.'],
 ['Bagaimana jika bukti pembayaran ditolak?','Admin akan memberikan alasan penolakan. Kamu dapat mengirim ulang bukti pembayaran yang sesuai.'],
 ['Apakah kode rahasia Manage ada di URL?','Tidak. Kode rahasia dipisahkan dari Link Manage dan tidak ditaruh di URL.'],
 ['Apakah Link Undangan bisa dibagikan ke WhatsApp?','Bisa. Link undangan dapat dibagikan kepada tamu melalui WhatsApp atau media lainnya.'],
 ['Apakah undangan langsung dihapus setelah acara?','Tidak. Undangan tidak langsung dihapus setelah acara selesai.'],
 ['Apa yang terjadi setelah acara selesai?','Bernaung dapat mengingatkan kamu untuk meninjau kembali undangan dan memutuskan apakah ingin tetap menyimpannya atau menutupnya.'],
 ['Kalau ada masalah, harus menghubungi siapa?','Kamu bisa menghubungi admin Bernaung melalui kontak yang tersedia di website.']
 ];let shown=7;const render=()=>{faq.innerHTML=items.slice(0,shown).map(x=>`<details><summary>${esc(x[0])}</summary><p>${esc(x[1])}</p></details>`).join('');const more=document.getElementById('faqLoadMore');if(more){more.textContent=shown<items.length?'Lihat selengkapnya →':'Tampilkan lebih sedikit ↑';more.hidden=false}};render();document.getElementById('faqLoadMore')?.addEventListener('click',()=>{shown=shown<items.length?Math.min(shown+7,items.length):7;render();if(shown===7)faq.closest('.faq-section')?.scrollIntoView({behavior:'smooth',block:'start'})})}
});
