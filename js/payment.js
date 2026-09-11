(async function(){
  const form=document.getElementById('paymentForm'); if(!form)return;
  const price=await (window.BernaungPriceReady||Promise.resolve(window.BERNAUNG_PRICE));
  const amountInput=form.querySelector('[name="amount"]'); if(amountInput){amountInput.value=price??'';amountInput.min=price||'';amountInput.max=price||'';amountInput.readOnly=!price}
  document.querySelectorAll('[data-price]').forEach(el=>el.textContent=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price));
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const d=getData(),fd=new FormData(form); const buyer=String(fd.get('buyer')||'').trim(),method=String(fd.get('method')||'').trim(),amount=Number(fd.get('amount')||0),proof=fd.get('proof'),note=String(fd.get('note')||'').trim();
    if(!price){alert('Harga undangan belum tersedia. Silakan coba lagi beberapa saat.');return}
    if(amount!==price){alert('Nominal pembayaran harus '+new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price)+'.');return}
    if(!(proof instanceof File)||!proof.size){alert('Pilih bukti pembayaran terlebih dahulu.');return}
    const button=form.querySelector('button[type="submit"]'),original=button?.textContent;if(button){button.disabled=true;button.textContent='Mengirim…'}
    try{
      if(!supabaseReady()){Object.assign(d,{buyer,paymentName:buyer,paymentMethod:method,paymentAmount:amount,paymentNote:note,paymentFileName:proof.name,paymentStatus:'pending',orderId:d.orderId||'BRG-'+Math.floor(1000+Math.random()*9000),customerToken:d.customerToken||randomToken(),sentAt:new Date().toISOString()});saveData(d);location.href='/status?token='+encodeURIComponent(d.customerToken);return}
      const customerToken=randomToken(),safeName=proof.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${customerToken}/${Date.now()}-${safeName}`;
      const upload=await supabaseClient.storage.from('payment-proofs').upload(path,proof,{upsert:false,contentType:proof.type||undefined});if(upload.error)throw upload.error;
      const payload={customer_token:customerToken,status:'pending',price,groom:d.groom||null,bride:d.bride||null,groom_father:d.groomFather||null,groom_mother:d.groomMother||null,bride_father:d.brideFather||null,bride_mother:d.brideMother||null,event_type:d.eventType||null,event_date:d.date||null,event_time:d.time||null,venue:d.venue||null,address:d.address||null,maps_url:d.maps||null,whatsapp:d.whatsapp||null,music_url:d.music||null,gift:d.gift||null,love_story:d.loveStory||[],schedules:d.schedules||[],accounts:d.accounts||[],notes:d.notes||null,photos:d.photos||[],template_id:d.templateId||null,template_name:d.templateName||null,template_category:d.templateCategory||null,template_url:d.templateUrl||null,buyer_name:buyer,payment_method:method,payment_amount:amount,payment_proof_path:path,payment_note:note||null,payment_submitted_at:new Date().toISOString()};
      const {error}=await supabaseClient.from('orders').insert(payload);if(error)throw error;
      Object.assign(d,{customerToken,orderId:customerToken,paymentStatus:'pending',paymentName:buyer,paymentMethod:method,paymentFileName:proof.name,paymentNote:note});saveData(d);location.href='/status?token='+encodeURIComponent(customerToken);
    }catch(error){console.error(error);alert('Pembayaran belum berhasil dikirim. '+(error.message||'Coba lagi.'));if(button){button.disabled=false;button.textContent=original}}
  });
})();
