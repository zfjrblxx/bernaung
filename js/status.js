(async function(){
  const box = document.getElementById('statusBox');
  if(!box) return;

  const params = new URLSearchParams(location.search);
  const token = params.get('token') || getData().customerToken || '';
  let timer = null;
  let lastStatus = null;
  let adminWhatsapp = '';
  if(supabaseReady()){try{const {data}=await supabaseClient.rpc('get_checkout_settings');adminWhatsapp=String(data?.admin_whatsapp||'')}catch(e){}}
  const waUrl=()=>adminWhatsapp?'https://wa.me/'+adminWhatsapp.replace(/\D/g,''):'https://wa.me/';

  function escHtml(v){ return esc(v); }
  function abs(path){ return path ? new URL(path.replace(/^\//,''), location.origin + '/').href : ''; }

  function renderPending(d){
    box.innerHTML = `<div class="success-icon">⌛</div>
      <span class="eyebrow">PEMBAYARAN TERKIRIM</span>
      <h1>Menunggu pemeriksaan admin.</h1>
      <p class="muted">Bukti pembayaran sudah dikirim. Admin akan memeriksa pembayaran sebelum undangan diterbitkan.</p>
      <div class="notice"><b>Status: Menunggu Admin ACC</b><br>Halaman ini akan memeriksa status secara otomatis.</div>
      <div class="notice status-warning-note"><b>Jangan refresh atau menutup halaman ini.</b><br>Jika mengalami masalah, <a href="${waUrl()}?text=${encodeURIComponent('Halo Admin Bernaung, saya mengalami masalah saat pembayaran.')}" target="_blank" rel="noopener">hubungi admin →</a></div>
      <div class="success-actions" style="margin-top:18px"><a class="btn btn-light" href="/">Kembali ke Beranda</a></div>`;
  }

  function renderRejected(d){
    box.innerHTML = `<div class="success-icon">!</div>
      <span class="eyebrow">PEMBAYARAN PERLU DIPERBAIKI</span>
      <h1>Pembayaran belum disetujui.</h1>
      <p class="muted">Admin menolak bukti pembayaran. Periksa alasan di bawah lalu kirim ulang pembayaran.</p>
      <div class="notice"><b>Alasan admin</b><br>${escHtml(d.payment_reject_reason || 'Admin belum memberikan alasan.')}</div>
      <div class="success-actions" style="margin-top:18px"><a class="btn btn-dark" href="/pembayaran">Kirim ulang</a><a class="btn btn-light" href="${waUrl()}" target="_blank">Hubungi admin</a></div>`;
  }

  function renderApproved(d){
    const invite = d.invite_url || '';
    const manage = d.manage_url || '';
    box.innerHTML = `<div class="success-icon">✓</div>
      <span class="eyebrow">PEMBAYARAN DISETUJUI</span>
      <h1>Undanganmu sudah siap.</h1>
      <p class="muted">Pembayaran sudah disetujui. Simpan tiga akses ini untuk digunakan nanti.</p>
      <div class="access-card">
        <div class="access-item"><span>Link undangan</span><strong>${escHtml(abs(invite))}</strong></div>
        <div class="access-item"><span>Link Manage</span><strong>${escHtml(abs(manage))}</strong></div>
        <div class="access-item"><span>Kode rahasia</span><strong>${escHtml(d.secret_code || '-')}</strong></div>
      </div>
      <div class="success-actions"><a class="btn btn-dark" href="${escHtml(invite)}">Buka undangan</a><a class="btn btn-light" href="${escHtml(manage)}">Kelola undangan</a></div>
      <div class="notice">Kode rahasia hanya untuk pemilik undangan. Jangan membagikannya kepada tamu.</div>`;
  }

  async function fetchStatus(){
    if(!token){ renderPending({}); return; }
    if(!supabaseReady()){
      const local = getData();
      if(local.paymentStatus === 'approved') renderApproved({secret_code:local.secretCode,invite_url:local.inviteUrl,manage_url:local.manageUrl});
      else if(local.paymentStatus === 'rejected') renderRejected({payment_reject_reason:local.paymentRejectReason});
      else renderPending(local);
      return;
    }

    const {data,error} = await supabaseClient.rpc('get_order_status',{p_customer_token:token});
    if(error){ console.error(error); renderPending({}); return; }
    if(!data){ renderPending({}); return; }

    const status = data.status || 'pending';
    if(status !== lastStatus){
      lastStatus = status;
      if(status === 'approved') renderApproved(data);
      else if(status === 'rejected') renderRejected(data);
      else renderPending(data);
    }

    if(status === 'approved' || status === 'rejected'){
      clearInterval(timer);
    }
  }

  await fetchStatus();
  timer = setInterval(fetchStatus, 3000);
})();
