(async function(){
 const d=getData(),s=document.getElementById('summary');if(!s)return;
 const price=await (window.BernaungPriceReady||Promise.resolve(window.BERNAUNG_PRICE));
 const rows=[['Mempelai',`${d.groom||'-'} & ${d.bride||'-'}`],['Orang tua',`${d.groomFather||'-'} / ${d.groomMother||'-'} · ${d.brideFather||'-'} / ${d.brideMother||'-'}`],['Acara',d.eventType||'-'],['Tanggal',d.date||'-'],['Waktu',d.time||'-'],['Tempat',d.venue||'-'],['Google Maps',d.maps||'-'],['WhatsApp',d.whatsapp||'-'],['Template',d.templateName||'Belum dipilih'],['Galeri',`${d.photosCount||0} foto`],['Rekening / Gift',d.gift||'Tidak diisi']];
 s.innerHTML=rows.map(r=>`<div class="summary-row"><b>${r[0]}</b><strong>${r[1]}</strong></div>`).join('')+`<div class="summary-total"><span>Total</span><strong>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(price||0)}</strong></div>`;
})();
