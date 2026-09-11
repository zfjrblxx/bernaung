(async function(){
  const d=getData();
  const token=d.customerToken||'';
  if(supabaseReady() && token){
    const {data,error}=await supabaseClient.rpc('get_order_status',{p_customer_token:token});
    if(!error && data?.status==='approved'){
      d.secretCode=data.secret_code||d.secretCode;
      d.manageUrl=data.manage_url||d.manageUrl;
      d.inviteUrl=data.invite_url||d.inviteUrl;
      saveData(d);
    }
  }
  if(!d.secretCode)d.secretCode=randomSecret();
  if(!d.manageId)d.manageId=randomManageId();
  d.manageUrl=d.manageUrl||'/m/'+d.manageId;
  d.inviteUrl=d.inviteUrl||d.templateUrl||'undangan.html';
  saveData(d);
  document.getElementById('accessCard').innerHTML=`<div class="access-item"><span>Link undangan</span><strong>${esc(new URL(d.inviteUrl.replace(/^\//,''),location.origin+'/').href)}</strong></div><div class="access-item"><span>Link Manage</span><strong>${esc(new URL(d.manageUrl.replace(/^\//,''),location.origin+'/').href)}</strong></div><div class="access-item"><span>Kode rahasia</span><strong>${esc(d.secretCode)}</strong></div>`;
  document.getElementById('openInvite').href=d.inviteUrl;
  document.getElementById('openManage').href=d.manageUrl;
})();
