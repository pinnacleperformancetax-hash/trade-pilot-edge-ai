const URL = "https://ouilcegadmbduvvureat.supabase.co";
function env() {
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return {url:process.env.SUPABASE_URL||URL,serviceKey};
}
async function authenticatedUser(event){
  const bearer=event.headers?.authorization||event.headers?.Authorization||"";
  const token=bearer.match(/^Bearer (.+)$/i)?.[1];
  if(!token) return null;
  const {url,serviceKey}=env();
  const res=await fetch(`${url}/auth/v1/user`,{headers:{apikey:serviceKey,Authorization:`Bearer ${token}`}});
  if(!res.ok) return null;
  const user=await res.json();
  if(!user?.id||!user?.email||!user?.email_confirmed_at) return null;
  return user;
}
function json(status,data){return {statusCode:status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(data)};}
module.exports={env,authenticatedUser,json};
