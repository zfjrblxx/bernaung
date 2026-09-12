const ALLOWED_CATEGORIES=['Minimal','Elegant','Romantic','Modern','Artistic','Nature','Playful','Islamic'];

const SYSTEM_PROMPT=`You are Bernaung's AI Theme Director. Your job is to propose ORIGINAL wedding invitation theme art direction, not generic AI template styling.

Fixed Bernaung rules:
- The invitation structure is fixed and must never be removed: cover with 1 random photo from the 6 gallery photos; header + horizontal countdown; QS Ar-Rum:21 + translation; bride/groom section; up to 2 events + Save Date; Temukan Kami Disini + embedded Maps + map navigation; Love Story; exactly 6 gallery photos excluding groom/bride photos; RSVP popup; Kado/accounts; Ucapan dan Doa/greetings; closing; credit; navigation menu; floating music control.
- All invitation data and functionality must match the existing Bernaung database/runtime. Never invent replacement field names or hardcode invitation data.
- Existing data concepts include groom, bride, groomNickname, brideNickname, groomFather, groomMother, brideFather, brideMother, groomInstagram, brideInstagram, schedules, photos, defaultPhotos, photoMode, coverPhotoIndex, loveStory, accounts, greetings, maps, venue, address, music and the existing RSVP flow.
- Gallery means exactly 6 gallery photos. Groom and bride portraits are separate and are not counted in those 6.
- Cover uses one photo selected from the gallery set, not a bride/groom portrait.
- The design must be original and must not resemble another Bernaung theme merely through recoloring or ornament swapping.
- Category is a customer-facing category, not the theme name.

Return ONLY valid JSON with this shape:
{"suggestions":[{"name":"...","concept":"...","artDirection":"...","palette":"...","typography":"...","signatureVisual":"...","layoutDirection":"...","photoDirection":"...","motionDirection":"..."},{...},{...}]}
Exactly 3 suggestions. Keep each field concise but specific. Make the three concepts materially different from each other.`;

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}

function extractText(content){
  if(typeof content==='string') return content;
  if(Array.isArray(content)) return content.map(x=>typeof x==='string'?x:(x?.text||'')).join('');
  if(content && typeof content==='object') return content.text||content.value||'';
  return '';
}

function parseJson(text){
  const cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(cleaned);}catch{}
  const start=cleaned.indexOf('{');
  const end=cleaned.lastIndexOf('}');
  if(start<0||end<=start) return null;
  try{return JSON.parse(cleaned.slice(start,end+1));}catch{return null;}
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  if(!process.env.GERAIKITA_API_KEY) return json(res,503,{error:'GERAIKITA_API_KEY belum dikonfigurasi di environment Vercel.'});
  if(!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return json(res,503,{error:'SUPABASE_URL atau SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi di environment Vercel.'});

  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const category=String(body.category||'').trim();
    const themeName=String(body.themeName||'').trim();
    if(!ALLOWED_CATEGORIES.includes(category)) return json(res,400,{error:'Kategori tidak valid.'});

    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
    if(!token) return json(res,401,{error:'Admin session diperlukan. Silakan login melalui Admin terlebih dahulu.'});

    const supabaseBase=process.env.SUPABASE_URL.replace(/\/$/,'');
    const check=await fetch(`${supabaseBase}/rest/v1/rpc/is_admin`,{
      method:'POST',
      headers:{
        apikey:process.env.SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${token}`,
        'Content-Type':'application/json'
      },
      body:'{}'
    });
    const checkText=await check.text();
    let isAdmin=false;
    try{isAdmin=JSON.parse(checkText)===true;}catch{}
    if(!check.ok) return json(res,502,{error:`Supabase admin verification gagal (${check.status}).`});
    if(isAdmin!==true) return json(res,403,{error:'Akses Theme Director hanya untuk admin.'});

    const userPrompt=`Kategori: ${category}\nNama tema yang diinginkan: ${themeName||'(belum ditentukan; buat nama yang kuat)'}\nBuat tiga konsep yang berbeda, premium, commercially usable, dan tidak generik.`;
    const model=process.env.GERAIKITA_MODEL||'claude-sonnet-5';

    // GeraiKita OpenAI-compatible endpoint. Keep the payload intentionally close
    // to the documented curl shape so provider-side validation stays predictable.
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    let response;
    try{
      response=await fetch('https://ai.geraikita.com/v1/chat/completions',{
        method:'POST',
        headers:{
          Authorization:`Bearer ${process.env.GERAIKITA_API_KEY}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          model,
          messages:[
            {role:'system',content:SYSTEM_PROMPT},
            {role:'user',content:userPrompt}
          ]
        }),
        signal:controller.signal
      });
    }finally{clearTimeout(timeout);}

    const raw=await response.text();
    let data={};
    try{data=JSON.parse(raw||'{}');}catch{}
    if(!response.ok){
      const providerMessage=extractText(data?.error?.message)||extractText(data?.message)||raw.slice(0,500);
      return json(res,502,{error:`GeraiKita API gagal (${response.status}). ${providerMessage||'Provider tidak memberikan detail error.'}`});
    }

    const text=extractText(data?.choices?.[0]?.message?.content)||extractText(data?.choices?.[0]?.text);
    const parsed=parseJson(text);
    if(!parsed) return json(res,502,{error:'GeraiKita berhasil merespons, tetapi format JSON dari Claude tidak bisa diproses.'});
    if(!Array.isArray(parsed.suggestions)||parsed.suggestions.length!==3) return json(res,502,{error:'Claude tidak mengembalikan tepat 3 konsep tema.'});

    return json(res,200,{suggestions:parsed.suggestions.slice(0,3),model:data.model||model});
  }catch(e){
    const message=e?.name==='AbortError'?'GeraiKita API timeout setelah 30 detik.':(e?.message||'Theme Director gagal diproses.');
    return json(res,502,{error:message});
  }
};
