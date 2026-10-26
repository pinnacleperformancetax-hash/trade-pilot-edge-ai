exports.handler = async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) return {statusCode:503,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify({error:"Set SUPABASE_PUBLISHABLE_KEY in Netlify environment variables."})};
  return {statusCode:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify({supabasePublishableKey:key})};
};
