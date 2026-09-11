const d=getData();
const t=templates.find(x=>x.id==d.templateId)||templates[2];
const selected=document.getElementById('selectedTemplate');
const frame=document.getElementById('invitePreviewFrame');
const fallback=document.getElementById('inviteFallback');
const names=[d.groom,d.bride].filter(Boolean).join(' & ');

selected.textContent=t.name;

if(t.url){
  const guest=new URLSearchParams(window.location.search).get('to') || 'Budi';
  frame.src=t.url+'?to='+encodeURIComponent(guest)+'&preview=1';
  frame.classList.remove('hidden');
  fallback.classList.add('hidden');
}else{
  frame.classList.add('hidden');
  fallback.classList.remove('hidden');
  document.getElementById('previewNames').textContent=names||'Fajar & Aulia';
  if(d.date){
    const dt=new Date(d.date+'T00:00:00');
    document.getElementById('previewDate').textContent=dt.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}).replaceAll('/','.');
  }
}
