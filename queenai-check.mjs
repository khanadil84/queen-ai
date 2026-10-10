
const $ = id => document.getElementById(id);
let events=[], completed=0, busy=false, engine=null, chat=null, lastGemmaAnalysis="", lastSimulatedDecision=null;
const stages=["Detect","Analyze","Decide","Respond","Verify","Recover"];
const AUDIT_KEY = "queenai.audit.v1";
try {
 const saved = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
 if (Array.isArray(saved)) events = saved.slice(0,500);
} catch { events = []; }

function renderEvents(){
 $("events").innerHTML=events.slice(0,80).map(e=>`<div class="event"><time>${esc(e.time)}</time><span class="bullet" style="background:${e.type==="error"?"var(--red)":e.type==="success"?"var(--green)":"var(--cyan)"}"></span><div><strong>${esc(e.title)}</strong><p>${esc(e.detail)}</p></div></div>`).join("");
 $("eventCount").textContent=`${events.length} EVENTS`;
}
function log(title,detail,type="info"){
 const time=new Date().toLocaleTimeString();
 events.unshift({time,title,detail,type,createdAt:new Date().toISOString()});
 events=events.slice(0,500);
 try { localStorage.setItem(AUDIT_KEY,JSON.stringify(events)); }
 catch(error) { console.warn("Queen AI audit persistence unavailable:",error); }
 renderEvents();
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function pipeline(active,done=-1){
 $("pipeline").innerHTML=stages.map((s,i)=>`<div class="stage ${i<done?"done":i===active?"active":""}"><b>${String(i+1).padStart(2,"0")}</b>${s}</div>`).join("");
 $("stageTag").textContent=active<0?"6 STAGES":`STAGE ${active+1}/6`;
}
function chooseSimulatedDecision(analysis,severity){
 const text=String(analysis||"").toLowerCase();
 const uncertain=!String(analysis||"").trim()||/uncertain|unknown|insufficient evidence|cannot determine|not confirmed|missing evidence|failed|error/.test(text);
 const highRisk=severity==="Critical"||/intrusion|unauthorized access|unsafe|dangerous|irreversible/.test(text);
 return {
  status:highRisk||uncertain?"HUMAN REVIEW REQUIRED":"PROPOSED — SIMULATION ONLY",
  reviewRequired:highRisk||uncertain,
  action:"No-op / observe and verify",
  rationale:uncertain?"Evidence is incomplete or uncertain; avoid escalation without human review.":highRisk?"Potentially high-risk incident; require human approval before any real action.":"A bounded observation-and-verification proposal is appropriate for this simulation.",
  simulationOnly:true
 };
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function runMission(){
 if(busy)return;
 busy=true;$("runBtn").disabled=true;$("incidentBtn").disabled=true;
 const asset=$("asset").value.trim()||"unknown-asset", severity=$("severity").value, scenario=$("scenario").selectedOptions[0].text;
 const id="QAI-"+Date.now().toString(36).toUpperCase(); lastSimulatedDecision=null; lastGemmaAnalysis="";
 const details={network:"Connectivity and service health degradation detected.",intrusion:"Suspicious access pattern flagged for containment review.",sensor:"Sensor reading is outside the configured safe operating range."}[$("scenario").value];
 $("systemState").textContent="MISSION ACTIVE";$("metricStatus").textContent="ACTIVE";$("metricSeverity").textContent=severity.toUpperCase();$("metricSeverity").className="value "+(severity==="Critical"?"red":"amber");$("metricRecovery").textContent="NO";
 $("missionTitle").textContent=`${id} · ${scenario}`;$("missionBadge").textContent="RUNNING";$("missionDescription").textContent=`Asset: ${asset}. ${details}`;
 $("progressBar").style.width="0%";log("Mission accepted",`${id}: ${scenario} on ${asset}; declared severity ${severity}.`);
 try{
  for(let i=0;i<stages.length;i++){
   pipeline(i,i);$("progressBar").style.width=`${Math.round(i/6*100)}%`;
   log(stages[i],[
    `Signal registered for ${asset}.`,
    `Triage classified the scenario as ${severity.toLowerCase()}; simulated signal: ${details}`,
    "Decision pending — simulation only.",
    "Simulated containment and service-recovery request; no external action performed.",
    "Checked simulated post-response health and policy conditions.",
    "Recovery criteria passed in the simulated environment; record mission outcome."
   ][i]);
   if(i===1){
    if(chat){
     const prompt = `You are Queen AI, a cautious incident-triage assistant.
Analyze this SIMULATED incident.
Scenario: ${scenario}
Affected asset: ${asset}
Declared severity: ${severity}
Observed signal: ${details}

Return:
1. Initial assessment
2. Important uncertainties
3. One bounded, reversible response proposal for simulation
4. Verification criteria
5. Safety cautions

Do not claim that real systems were inspected or changed. Do not provide shell commands. Treat severity as provisional and explain what evidence is missing.`;
     let analysis = "";
     log("Gemma 4 analysis started", `Requesting local triage for ${id}.`);
     try {
      for await (const chunk of chat.sendMessageStreaming(prompt)) {
       const part = chunk.content?.[0]?.text;
       if(part) analysis += part;
       $("modelOutput").textContent = analysis || "Gemma 4 is analyzing...";
      }
      if(!analysis.trim()) throw new Error("The model returned an empty response.");
      $("missionDescription").textContent =
       `${id} · Full Gemma 4 triage is available in the model output panel. SIMULATION ONLY; no real system was changed.`;
      lastGemmaAnalysis = analysis;
       $("modelOutput").textContent = analysis;
       log("Gemma 4 triage attached", analysis.slice(0,900), "success");
     } catch(error) {
      log("Gemma 4 analysis failed", String(error), "error");
      $("missionDescription").textContent =
       `${id} · AI analysis failed. The remaining mission stages are simulation only.`;
     }
    } else {
     log("Gemma 4 unavailable", "Model not loaded; mission continues in simulation-only mode.");
    }
   }
   await wait(550);
  }
  $("progressBar").style.width="100%";$("missionBadge").textContent="SIMULATION COMPLETE";$("missionDescription").textContent=`${id} simulation completed for ${asset}. ${lastGemmaAnalysis ? "Gemma 4 triage was generated; review the model output panel." : "No Gemma 4 findings were attached."} Simulated recovery criteria passed; real system recovery was NOT verified. No real system was changed.`;
  $("metricStatus").textContent="COMPLETE";$("metricRecovery").textContent="SIMULATED";$("metricRecovery").className="value amber";$("systemState").textContent="SYSTEM READY";
  completed++;$("metricCompleted").textContent=completed;log("Mission simulation completed",`${id}: simulated pipeline finished. Real recovery was not verified.`,"success");
 }catch(e){log("Mission error",String(e),"error");$("metricStatus").textContent="ERROR";$("systemState").textContent="ATTENTION";}
 finally{pipeline(-1,6);busy=false;$("runBtn").disabled=false;$("incidentBtn").disabled=false;}
}
$("runBtn").addEventListener("click",runMission);$("incidentBtn").addEventListener("click",runMission);
$("resetBtn").addEventListener("click",()=>{if(busy)return;pipeline(-1);$("metricStatus").textContent="READY";$("metricSeverity").textContent="NONE";$("metricSeverity").className="value amber";$("metricRecovery").textContent="NO";$("systemState").textContent="SYSTEM STANDBY";$("missionTitle").textContent="No active mission";$("missionBadge").textContent="IDLE";$("missionDescription").textContent="Run a simulation to start the autonomous response pipeline."; $("progressBar").style.width="0%";log("Demo reset","Dashboard returned to standby. Previous session events remain in the audit log.");});
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({product:"Queen AI",exportedAt:new Date().toISOString(),mode:"simulation",events},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="queen-ai-audit.json";a.click();URL.revokeObjectURL(a.href);log("Audit exported","Downloaded current session event log.");});
$("loadModel").addEventListener("click",async()=>{
 const file=$("modelFile").files[0];if(!file){$("modelOutput").textContent="Select gemma-4-E2B-it-web.litertlm first.";return;}
 $("loadModel").disabled=true;$("modelStatus").textContent="LOADING";$("modelOutput").textContent="Initializing local model. This may take several minutes.";
 try{
  const {Engine}=await import("https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm");
  engine=await Engine.create({model:file,mainExecutorSettings:{maxNumTokens:384}});
  chat=await engine.createConversation();$("modelStatus").textContent="LOADED";$("testModel").disabled=false;$("modelPrompt").disabled=false;
  $("modelOutput").textContent="Gemma 4 loaded locally. Ready for a test prompt.";log("Local model ready","Gemma 4 initialized in this browser.","success");
 }catch(e){$("modelStatus").textContent="ERROR";$("modelOutput").textContent=String(e?.stack||e);$("loadModel").disabled=false;log("Model load failed",String(e),"error");}
});
$("testModel").addEventListener("click",async()=>{
 if(!chat)return;$("testModel").disabled=true;$("modelOutput").textContent="Generating response locally...";
 try{let answer="";for await(const chunk of chat.sendMessageStreaming($("modelPrompt").value)){const t=chunk.content?.[0]?.text;if(t)answer+=t;$("modelOutput").textContent=answer||"Generating...";}
 log("Gemma 4 inference completed",answer.slice(0,500),"success");}
 catch(e){$("modelOutput").textContent="Inference error: "+String(e);log("Inference failed",String(e),"error");}
 finally{$("testModel").disabled=false;}
});
log("Queen AI initialized","Local dashboard ready. Mission actions are simulated.");

