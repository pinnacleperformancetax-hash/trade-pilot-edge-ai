let supabaseClient=null;
let currentUser=null;
let tier="free";
let checkingAccess=false;
let autoCheckTimer=null;

const SUPABASE_URL="https://ouilcegadmbduvvureat.supabase.co";
let SUPABASE_ANON_KEY="";
const PRO_LINK="https://buy.stripe.com/eVq14h3tF0sR6Hg3IPaEE02";
const AI_LINK="https://buy.stripe.com/14A3cpe8j1wVc1A5QXaEE04";
const SITE_URL="https://tradepilotedgeai.com";


function el(id){return document.getElementById(id);}
function normalizeEmail(email){return (email||"").trim().toLowerCase();}
function isMasterEmail(email){return false;} // Owner access is verified by the server.
function getTypedEmail(){return normalizeEmail(el("email")?.value || localStorage.getItem("tradepilot_pending_email") || currentUser?.email || "");}
function setMessage(msg){const box=el("loginMessage");if(box)box.textContent=msg||"";const lock=el("lockedMessage");if(lock&&msg)lock.textContent=msg;}
function notify(msg){setMessage(msg);alert(msg);}

async function initSupabase(){
  try {
    const response=await fetch("/.netlify/functions/public-config",{cache:"no-store"});
    const config=await response.json();
    if(!response.ok || !config.supabasePublishableKey) throw new Error(config.error || "Missing SUPABASE_PUBLISHABLE_KEY in Netlify.");
    SUPABASE_ANON_KEY=config.supabasePublishableKey;
  } catch(error){setMessage("Supabase configuration: "+error.message);return false;}
  if(!window.supabase){setMessage("Supabase library did not load. Refresh page.");return false;}
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"tradepilot-full-final-v500"}});
  return true;
}

function hideAll(){el("accessPanel")?.classList.add("hidden");el("lockedPanel")?.classList.add("hidden");el("dashboard")?.classList.add("hidden");}
function showAccess(){hideAll();el("accessPanel")?.classList.remove("hidden");}
function showLocked(){hideAll();el("lockedPanel")?.classList.remove("hidden");if(currentUser)el("lockedEmail").textContent=currentUser.email||"";}
function showDashboard(){hideAll();el("dashboard")?.classList.remove("hidden");if(currentUser)el("userEmailLine").textContent=currentUser.email||"";updateTierUI();}

function updateTierUI(){
  document.body.classList.remove("free-mode","pro-mode","ai-mode");
  document.body.classList.add(tier+"-mode");
  if(el("dashEyebrow")) el("dashEyebrow").textContent=tier==="ai"?"AI DASHBOARD":tier==="pro"?"PRO DASHBOARD":"FREE PREVIEW";
  if(el("paidBadge")) el("paidBadge").textContent=tier==="ai"?"AI Active":tier==="pro"?"Pro Active":"Free Preview";
  if(el("statusText")) el("statusText").textContent=tier==="ai"?"AI Unlocked":tier==="pro"?"Pro Unlocked":"Free";
  if(el("modeText")) el("modeText").textContent=tier==="free"?"Preview":"Smart";
}

async function checkAccess(){
  if(checkingAccess) return tier;
  checkingAccess=true;
  try {
    if(!currentUser){tier="free";return tier;}
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session?.access_token){tier="free";return tier;}
    const res=await fetch("/.netlify/functions/check-access",{
      headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error || "Access check failed");
    tier=data.ai?"ai":data.pro?"pro":"free";
    return tier;
  } catch(e){tier="free";return tier;}
  finally{checkingAccess=false;}
}

async function refreshSession(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.auth.getSession();
  if(error){showAccess();setMessage(error.message);return;}
  currentUser=data.session?.user||null;

  if(!currentUser){
    const pendingEmail=localStorage.getItem("tradepilot_pending_email");
    if(pendingEmail){
      await checkAccess();
      if(tier==="pro"||tier==="ai") {
        showAccess();
        setMessage("Payment confirmed. Login with "+pendingEmail+" to open your dashboard.");
        return;
      }
    }
    showAccess();
    return;
  }

  await checkAccess();
  if(tier==="free"){showLocked();setMessage("Logged in. Payment required for Pro/AI dashboard, or use Free Preview.");}
  else{showDashboard();setMessage("Access verified.");}
}

function stopAutoCheck(){if(autoCheckTimer)clearInterval(autoCheckTimer);autoCheckTimer=null;}

async function instantUnlockLoop(){
  stopAutoCheck();
  let attempts=0;
  const pendingPlan=localStorage.getItem("tradepilot_pending_plan")||"selected plan";
  setMessage("Checking payment status automatically for "+pendingPlan+"...");
  autoCheckTimer=setInterval(async()=>{
    attempts++;
    const pendingEmail=localStorage.getItem("tradepilot_pending_email") || currentUser?.email || "";
    await checkAccess();
    if(tier==="pro" || tier==="ai"){
      stopAutoCheck();
      localStorage.removeItem("tradepilot_pending_unlock");
      localStorage.removeItem("tradepilot_pending_plan");
      setMessage(currentUser ? "Payment confirmed. Access unlocked." : "Payment confirmed. Login to open your dashboard.");
      if(currentUser) showDashboard(); else showAccess();
    }
    if(attempts>=40){
      stopAutoCheck();
      setMessage("Still waiting for payment confirmation. Use Refresh Access or check webhook delivery.");
    }
  },2500);
}

function shouldInstantCheck(){
  const pending=localStorage.getItem("tradepilot_pending_unlock")==="1";
  const url=window.location.href.toLowerCase();
  return pending || url.includes("success") || url.includes("session_id") || url.includes("paid");
}

function openFreePreview(){
  tier="free";
  localStorage.removeItem("tradepilot_pending_unlock");
  localStorage.removeItem("tradepilot_pending_plan");
  showDashboard();
  setMessage("Free preview opened.");
}

async function handleCreateAccount(){
  const email=el("email").value.trim();
  const password=el("password").value.trim();
  if(!email||!password)return notify("Enter email and password.");
  if(password.length<6)return notify("Password must be at least 6 characters.");
  setMessage("Creating account...");
  const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL}});
  if(error)return notify(error.message);
  if(data.session){currentUser=data.session.user;await refreshSession();}
  else notify("Account created. Check your email if confirmation is required, then log in.");
}

async function handleLogin(){
  const email=el("email").value.trim();
  const password=el("password").value.trim();
  if(!email||!password)return notify("Enter email and password.");
  setMessage("Logging in...");
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error)return notify("Login failed: "+error.message);
  currentUser=data.user||data.session?.user||null;
  await refreshSession();
}

async function handleMagicLink(){
  const email=el("email").value.trim();
  if(!email)return notify("Enter email first.");
  const {error}=await supabaseClient.auth.signInWithOtp({email,options:{emailRedirectTo:SITE_URL}});
  if(error)return notify(error.message);
  notify("Email login link sent.");
}

async function handleResetPassword(){
  const email=el("email").value.trim();
  if(!email)return notify("Enter email first.");
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:SITE_URL});
  if(error)return notify(error.message);
  notify("Password reset email sent.");
}

async function handleLogout(){
  stopAutoCheck();
  try{await supabaseClient.auth.signOut({scope:"global"});}catch(e){}
  currentUser=null;tier="free";showAccess();window.location.href=window.location.origin;
}

function pay(link, planName="pro"){
  const typedEmail=getTypedEmail();
  const sep=link.includes("?")?"&":"?";
  localStorage.setItem("tradepilot_pending_unlock","1");
  localStorage.setItem("tradepilot_pending_plan",planName);
  if(typedEmail) localStorage.setItem("tradepilot_pending_email",typedEmail);
  const params = typedEmail ? "prefilled_email="+encodeURIComponent(typedEmail)+"&client_reference_id="+encodeURIComponent(typedEmail) : "";
  window.location.href = params ? link+sep+params : link;
}

function switchToFree(){openFreePreview();}
function switchToProCheckout(){pay(PRO_LINK,"pro");}
function switchToAiCheckout(){pay(AI_LINK,"ai");}

function addTicker(){const input=el("tickerInput");const ticker=input.value.trim().toUpperCase();if(!ticker)return;const saved=JSON.parse(localStorage.getItem("tradepilot_watchlist")||"[]");if(!saved.includes(ticker))saved.push(ticker);localStorage.setItem("tradepilot_watchlist",JSON.stringify(saved));input.value="";renderWatchlist();}
function renderWatchlist(){const box=el("watchlist");if(!box)return;const saved=JSON.parse(localStorage.getItem("tradepilot_watchlist")||'["SPY"]');box.innerHTML=saved.map(t=>`<div>${t}</div>`).join("")||"<div>No tickers yet.</div>";}
function currentScore(){const checks=["spyOk","nasdaqOk","trendOk","volumeOk","entryOk","riskOk"].map(id=>el(id)?.checked);const score=checks.filter(Boolean).length;return{score,confidence:Math.round((score/6)*100)};}
function evaluate(){const {score,confidence}=currentScore();let result="NO TRADE ❌",note="Risk too high. Stay out.";if(score>=5){result="GO TRADE ✅";note="Setup confirmed. Keep risk controlled.";}else if(score>=3){result="WAIT ⚠️";note="Setup incomplete. Wait for confirmation.";}el("signalBox").textContent=`${result} — ${confidence}% confidence. ${note}`;}
function aiExplain(){if(tier!=="ai")return notify("AI upgrade required.");const {score,confidence}=currentScore();const ticker=el("stockSelect").value;let msg=score>=5?`AI Readout for ${ticker}: Conditions are aligned. Confidence is ${confidence}%. Use controlled position size and honor your stop.`:score>=3?`AI Readout for ${ticker}: Setup is mixed. Confidence is ${confidence}%. Wait for one more confirmation before entering.`:`AI Readout for ${ticker}: Conditions are weak. Confidence is ${confidence}%. Best action is no trade right now.`;el("aiSummary").textContent=msg;}
function saveSetup(){if(tier==="free")return notify("Pro required to save setup.");const data={stock:el("stockSelect").value,spyOk:el("spyOk").checked,nasdaqOk:el("nasdaqOk").checked,trendOk:el("trendOk").checked,volumeOk:el("volumeOk").checked,entryOk:el("entryOk").checked,riskOk:el("riskOk").checked};localStorage.setItem("tradepilot_setup",JSON.stringify(data));notify("Setup saved.");}
function loadSetup(){if(tier==="free")return notify("Pro required to load setup.");const data=JSON.parse(localStorage.getItem("tradepilot_setup")||"{}");if(data.stock)el("stockSelect").value=data.stock;["spyOk","nasdaqOk","trendOk","volumeOk","entryOk","riskOk"].forEach(id=>{if(typeof data[id]==="boolean")el(id).checked=data[id];});notify("Setup loaded.");}
function saveJournal(){if(tier==="free")return notify("Pro required to save journal.");const note=el("journalNote").value.trim();if(!note)return;const entries=JSON.parse(localStorage.getItem("tradepilot_journal")||"[]");entries.unshift({note,date:new Date().toLocaleString(),result:el("signalBox").textContent});localStorage.setItem("tradepilot_journal",JSON.stringify(entries));el("journalNote").value="";renderJournal();}
function renderJournal(){const box=el("journalList");if(!box)return;const entries=JSON.parse(localStorage.getItem("tradepilot_journal")||"[]");box.innerHTML=entries.slice(0,5).map(e=>`<div><strong>${e.date}</strong><br>${e.note}<br><small>${e.result||""}</small></div>`).join("");}


async function handleMasterUnlock(){
  const email = el("email")?.value.trim();
  const code = el("masterCode")?.value.trim();

  if(!email) return notify("Enter your owner email first.");
  if(!code) return notify("Enter the master code.");

  setMessage("Checking master code...");

  try{
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session?.access_token) return notify("Sign in to your verified owner account first.");
    const res = await fetch("/.netlify/functions/master-unlock", {
      method: "POST",
      headers: {"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
      body: JSON.stringify({code})
    });

    const data = await res.json();

    if(!res.ok || !data.ok){
      return notify(data.error || "Master unlock failed.");
    }

    await checkAccess();
    if(tier!=="ai") return notify("Access was not granted.");

    if(currentUser && normalizeEmail(currentUser.email) === normalizeEmail(email)){
      showDashboard();
      setMessage("Master code accepted. Owner AI access unlocked.");
    } else {
      setMessage("Master code accepted. Now login with this email to open the owner dashboard.");
      alert("Master code accepted. Login with this email to open the owner dashboard.");
    }
  }catch(e){
    notify("Master unlock error. Check Netlify function deployment.");
  }
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const banner = el("installBanner");
  if (banner) banner.style.display = "none";
});

async function handleInstallHelp(){
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  notify("iPhone/iPad: Safari → Share → Add to Home Screen. Android/Chrome: menu → Install app or Add to Home screen.");
}

function registerTradePilotServiceWorker(){
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

function attachEvents(){
  el("closeInstall")?.addEventListener("click",()=>el("installBanner").style.display="none");
  el("installHelp")?.addEventListener("click",handleInstallHelp);
  el("createAccountBtn")?.addEventListener("click",handleCreateAccount);
  el("loginBtn")?.addEventListener("click",handleLogin);
  el("magicLinkBtn")?.addEventListener("click",handleMagicLink);
  el("resetPasswordBtn")?.addEventListener("click",handleResetPassword);
  el("masterUnlockBtn")?.addEventListener("click",handleMasterUnlock);
  el("freePreviewBtn")?.addEventListener("click",openFreePreview);
  el("freePreviewBtn2")?.addEventListener("click",openFreePreview);
  el("lockedFreeBtn")?.addEventListener("click",openFreePreview);
  el("logoutBtn")?.addEventListener("click",handleLogout);
  el("lockedLogoutBtn")?.addEventListener("click",handleLogout);
  el("unlockProAccess")?.addEventListener("click",()=>pay(PRO_LINK,"pro"));
  el("lockedPayBtn")?.addEventListener("click",()=>pay(PRO_LINK,"pro"));
  el("upgradeProTop")?.addEventListener("click",()=>pay(PRO_LINK,"pro"));
  el("unlockAiAccess")?.addEventListener("click",()=>pay(AI_LINK,"ai"));
  el("lockedAiBtn")?.addEventListener("click",()=>pay(AI_LINK,"ai"));
  el("upgradeAiTop")?.addEventListener("click",()=>pay(AI_LINK,"ai"));
  el("aiUpgradeBtn")?.addEventListener("click",()=>pay(AI_LINK,"ai"));
  el("switchFreeTop")?.addEventListener("click",switchToFree);
  el("refreshAccessBtn")?.addEventListener("click",refreshSession);
  el("addTicker")?.addEventListener("click",addTicker);
  el("evaluateBtn")?.addEventListener("click",evaluate);
  el("aiExplainBtn")?.addEventListener("click",aiExplain);
  el("saveSetup")?.addEventListener("click",saveSetup);
  el("loadSetup")?.addEventListener("click",loadSetup);
  el("saveJournal")?.addEventListener("click",saveJournal);
}

document.addEventListener("DOMContentLoaded",async()=>{
  registerTradePilotServiceWorker();
  attachEvents();
  if(await initSupabase()){
    supabaseClient.auth.onAuthStateChange(async(e,s)=>{currentUser=s?.user||null;if(currentUser)await refreshSession();else await refreshSession();});
    await refreshSession();
    if(shouldInstantCheck()){instantUnlockLoop();}
  }
  renderWatchlist();
  renderJournal();
});
