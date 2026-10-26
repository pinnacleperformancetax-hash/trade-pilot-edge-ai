const {env,authenticatedUser,json}=require("./auth-helper");
exports.handler=async(event)=>{
  try{
    const user=await authenticatedUser(event);
    if(!user) return json(401,{pro:false,ai:false,error:"Sign in with a confirmed email."});
    const {url,serviceKey}=env();
    const res=await fetch(`${url}/rest/v1/user_access?email=eq.${encodeURIComponent(user.email.toLowerCase())}&select=pro_active,ai_active&limit=1`,{
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}
    });
    if(!res.ok) throw new Error("Supabase access lookup failed");
    const rows=await res.json(),row=rows[0];
    return json(200,{pro:!!row?.pro_active,ai:!!row?.ai_active});
  }catch(e){console.error(e);return json(503,{pro:false,ai:false,error:"Access service unavailable"});}
};
