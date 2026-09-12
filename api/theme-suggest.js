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

function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
  if(!process.env.OPENAI_API_KEY) return json(res,503,{error:'OPENAI_API_KEY belum dikonfigurasi di environment Vercel.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const category=String(body.category||'').trim();
    const themeName=String(body.themeName||'').trim();
    if(!ALLOWED_CATEGORIES.includes(category)) return json(res,400,{error:'Kategori tidak valid.'});
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!token) return json(res,401,{error:'Admin session diperlukan.'});
    if(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY){
      const check=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/is_admin',{method:'POST',headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
      const isAdmin=check.ok ? await check.json() : false;
      if(isAdmin!==true) return json(res,403,{error:'Akses Theme Director hanya untuk admin.'});
    }
    const userPrompt=`Kategori: ${category}\nNama tema yang diinginkan: ${themeName||'(belum ditentukan; buat nama yang kuat)'}\nBuat tiga konsep yang berbeda, premium, commercially usable, dan tidak generik.`;
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',instructions:SYSTEM_PROMPT,input:userPrompt,temperature:0.9,max_output_tokens:1800,store:false})});
    const data=await response.json();
    if(!response.ok) return json(res,response.status,{error:data?.error?.message||'OpenAI request gagal.'});
    const text=data?.output_text||'';
    const match=text.match(/\{[\s\S]*\}/);
    if(!match) return json(res,502,{error:'AI mengembalikan format yang tidak bisa diproses.'});
    const parsed=JSON.parse(match[0]);
    if(!Array.isArray(parsed.suggestions)||parsed.suggestions.length!==3) return json(res,502,{error:'AI tidak mengembalikan 3 konsep.'});
    return json(res,200,{suggestions:parsed.suggestions.slice(0,3),model:data.model||process.env.OPENAI_MODEL||'gpt-5.6-luna'});
  }catch(e){return json(res,500,{error:e?.message||'Theme Director gagal diproses.'});}
};
