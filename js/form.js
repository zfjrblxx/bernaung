(function(){
  const form=document.getElementById('inviteForm');
  if(!form) return;

  const tabs=[...document.querySelectorAll('#categoryTabs button[data-step]')];
  const panels=[...document.querySelectorAll('.form-panel[data-panel]')];
  const prev=document.getElementById('prevStep');
  const next=document.getElementById('nextStep');
  const progress=document.getElementById('formProgress');
  const scheduleList=document.getElementById('scheduleList');
  const accountList=document.getElementById('accountList');
  const review=document.getElementById('reviewData');
  const tabsNav=document.getElementById('categoryTabs');

  let step=1;
  let schedules=[];
  let accounts=[];

  function esc(v){
    return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function readSaved(){
    try{return typeof getData==='function'?getData():JSON.parse(localStorage.getItem('bernaungData')||'{}')}catch{return {}}
  }

  function saveCurrent(){
    const data={...readSaved()};
    new FormData(form).forEach((value,key)=>{
      if(typeof value==='string') data[key]=value;
    });
    data.schedules=schedules;
    data.accounts=accounts;
    data.photos=[];
    data.photosCount=0;
    if(typeof saveData==='function') saveData(data);
    else localStorage.setItem('bernaungData',JSON.stringify(data));
    return data;
  }

  function restore(){
    const old=readSaved();
    Object.entries(old).forEach(([key,value])=>{
      const el=form.elements[key];
      if(el && typeof value==='string') el.value=value;
    });
    schedules=Array.isArray(old.schedules)?old.schedules.map(x=>({title:x.title||'',time:x.time||''})):[];
    accounts=Array.isArray(old.accounts)?old.accounts.map(x=>({provider:x.provider||'',number:x.number||'',name:x.name||''})):[{provider:'',number:'',name:''}];
    if(!accounts.length) accounts=[{provider:'',number:'',name:''}];
    renderSchedules();
    renderAccounts();
  }

  // One source of truth for the wizard state. This updates BOTH the visible
  // panel and the active category, so they can never get out of sync.
  function syncUI(){
    panels.forEach(panel=>{
      const active=Number(panel.dataset.panel)===step;
      panel.classList.toggle('active',active);
      panel.hidden=!active;
      panel.style.display=active?'block':'none';
    });

    tabs.forEach(tab=>{
      const active=Number(tab.dataset.step)===step;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-current',active?'step':'false');
    });

    if(progress) progress.style.width=(step*10)+'%';
    if(prev) prev.disabled=step===1;
    if(next) next.textContent=step===10?'Lanjut ke tema →':'Lanjut →';
  }

  function setStep(n, options={}){
    step=Math.max(1,Math.min(10,Number(n)||1));
    syncUI();

    if(step===10) renderReview();

    if(options.scroll!==false){
      // Keep the current category visible without moving the page to a wrong
      // panel. The content itself is scrolled into view after the state sync.
      const panel=panels.find(p=>Number(p.dataset.panel)===step);
      if(panel){
        const navHeight=tabsNav?.getBoundingClientRect().height||0;
        const target=panel.getBoundingClientRect().top+window.scrollY-navHeight-18;
        window.scrollTo({top:Math.max(0,target),behavior:'smooth'});
      }
      const activeTab=tabs.find(t=>Number(t.dataset.step)===step);
      activeTab?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    }
  }

  function validateStep(){
    const panel=panels.find(p=>Number(p.dataset.panel)===step);
    if(!panel) return true;
    for(const field of panel.querySelectorAll('input,select,textarea')){
      if(field.required && !field.checkValidity()){
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  function renderSchedules(){
    if(!scheduleList) return;
    scheduleList.innerHTML=schedules.map((item,i)=>`<div class="repeat-row">
      <div class="repeat-row-head"><strong>Acara ${i+1}</strong>${schedules.length>1?`<button type="button" class="remove-row" data-remove-schedule="${i}">Hapus</button>`:''}</div>
      <div class="form-grid">
        <label>Nama acara<input data-schedule-title="${i}" value="${esc(item.title)}" placeholder="Contoh: Akad Nikah"></label>
        <label>Waktu<input data-schedule-time="${i}" value="${esc(item.time)}" placeholder="08.00 WIB"></label>
      </div>
    </div>`).join('');
    scheduleList.querySelectorAll('[data-schedule-title]').forEach(el=>el.addEventListener('input',()=>{schedules[Number(el.dataset.scheduleTitle)].title=el.value;saveCurrent()}));
    scheduleList.querySelectorAll('[data-schedule-time]').forEach(el=>el.addEventListener('input',()=>{schedules[Number(el.dataset.scheduleTime)].time=el.value;saveCurrent()}));
    scheduleList.querySelectorAll('[data-remove-schedule]').forEach(el=>el.addEventListener('click',()=>{schedules.splice(Number(el.dataset.removeSchedule),1);renderSchedules();saveCurrent()}));
  }

  function renderAccounts(){
    if(!accountList) return;
    accountList.innerHTML=accounts.map((item,i)=>`<div class="repeat-row">
      <div class="repeat-row-head"><strong>Rekening ${i+1}</strong>${accounts.length>1?`<button type="button" class="remove-row" data-remove-account="${i}">Hapus</button>`:''}</div>
      <div class="form-grid">
        <label>Bank / E-Wallet<input data-account-provider="${i}" value="${esc(item.provider)}" placeholder="BCA / Mandiri / DANA"></label>
        <label>Nomor rekening / tujuan<input data-account-number="${i}" value="${esc(item.number)}" placeholder="Nomor rekening / tujuan"></label>
        <label class="full">Atas nama<input data-account-name="${i}" value="${esc(item.name)}" placeholder="Nama pemilik rekening"></label>
      </div>
    </div>`).join('');
    accountList.querySelectorAll('[data-account-provider]').forEach(el=>el.addEventListener('input',()=>{accounts[Number(el.dataset.accountProvider)].provider=el.value;saveCurrent()}));
    accountList.querySelectorAll('[data-account-number]').forEach(el=>el.addEventListener('input',()=>{accounts[Number(el.dataset.accountNumber)].number=el.value;saveCurrent()}));
    accountList.querySelectorAll('[data-account-name]').forEach(el=>el.addEventListener('input',()=>{accounts[Number(el.dataset.accountName)].name=el.value;saveCurrent()}));
    accountList.querySelectorAll('[data-remove-account]').forEach(el=>el.addEventListener('click',()=>{accounts.splice(Number(el.dataset.removeAccount),1);if(!accounts.length)accounts=[{provider:'',number:'',name:''}];renderAccounts();saveCurrent()}));
  }

  function renderReview(){
    if(!review) return;
    const data=saveCurrent();
    const rows=[
      ['Mempelai',[data.groom,data.bride].filter(Boolean).join(' & ')||'Belum diisi'],
      ['Orang tua',[data.groomFather,data.groomMother,data.brideFather,data.brideMother].filter(Boolean).join(' · ')||'Belum diisi'],
      ['Acara',data.eventType||'Belum diisi'],['Tanggal',data.date||'Belum diisi'],['Waktu',data.time||'Belum diisi'],
      ['Tempat',data.venue||'Belum diisi'],['Google Maps',data.maps||'Belum diisi'],
      ['Love Story',(data.story1Text||data.story2Text)?'Diisi':'Akan menggunakan teks default'],
      ['Susunan Acara',schedules.filter(x=>x.title||x.time).length?`${schedules.filter(x=>x.title||x.time).length} acara`:'Tidak diisi'],
      ['Rekening / Gift',accounts.filter(x=>x.provider||x.number||x.name).length?`${accounts.filter(x=>x.provider||x.number||x.name).length} rekening`:'Tidak diisi'],
      ['Kontak',data.whatsapp||'Belum diisi'],['Foto','Akan ditambahkan melalui Manage'],['Musik','Akan diatur melalui Manage']
    ];
    review.innerHTML=rows.map(row=>`<div class="review-row"><span>${esc(row[0])}</span><strong>${esc(row[1])}</strong></div>`).join('');
  }

  tabsNav?.addEventListener('click',e=>{
    const button=e.target.closest('button[data-step]');
    if(!button || !tabsNav.contains(button)) return;
    e.preventDefault();
    saveCurrent();
    setStep(Number(button.dataset.step));
  });

  next?.addEventListener('click',e=>{
    e.preventDefault();
    if(!validateStep()) return;
    saveCurrent();
    if(step<10){
      setStep(step+1);
    }else{
      window.location.href='/pilih-template';
    }
  });

  prev?.addEventListener('click',e=>{
    e.preventDefault();
    if(step>1) setStep(step-1);
  });

  document.getElementById('addSchedule')?.addEventListener('click',()=>{
    schedules.push({title:'',time:''});
    renderSchedules(); saveCurrent();
    scheduleList?.lastElementChild?.querySelector('input')?.focus();
  });

  document.getElementById('addAccount')?.addEventListener('click',()=>{
    accounts.push({provider:'',number:'',name:''});
    renderAccounts(); saveCurrent();
    accountList?.lastElementChild?.querySelector('input')?.focus();
  });

  form.addEventListener('input',()=>saveCurrent());

  restore();
  setStep(1,{scroll:false});
})();
