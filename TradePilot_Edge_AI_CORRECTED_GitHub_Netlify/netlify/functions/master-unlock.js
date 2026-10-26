const crypto=require("crypto");
const {env,authenticatedUser,json}=require("./auth-helper");
exports.handler=async(event)=>{
  if(event.httpMethod!=="POST") return json(405,{ok:false,error:"Method not allowed"});
  try{
    const user=await authenticatedUser(event);
    if(!user) return json(401,{ok:false,error:"Sign in with a confirmed email first"});
    const allowed=(process.env.MASTER_OWNER_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(!allowed.includes(user.email.toLowerCase())) return json(403,{ok:false,error:"Not an authorized owner"});
    const expected=process.env.MASTER_UNLOCK_CODE;
    if(!expected||expected.length<12) return json(503,{ok:false,error:"Configure MASTER_UNLOCK_CODE in Netlify"});
    const supplied=String(JSON.parse(event.body||"{}").code||"");
    const a=crypto.createHash("sha256").update(supplied).digest();
    const b=crypto.createHash("sha256").update(expected).digest();
    if(!crypto.timingSafeEqual(a,b)) return json(401,{ok:false,error:"Invalid master code"});
    const {url,serviceKey}=env();
    const res=await fetch(`${url}/rest/v1/user_access?on_conflict=email`,{
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},
      body:JSON.stringify({email:user.email.toLowerCase(),pro_active:true,ai_active:true,updated_at:new Date().toISOString()})
    });
    if(!res.ok) throw new Error("Owner access update failed");
    return json(200,{ok:true,unlocked:true});
  }catch(e){console.error(e);return json(503,{ok:false,error:"Owner unlock unavailable"});}
};
