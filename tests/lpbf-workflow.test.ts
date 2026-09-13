import assert from "node:assert/strict";
import { test } from "node:test";
import { LPBF_WORKFLOW_STAGES, isLpbfWorkflowStage, useLpbfWorkflowStore } from "../src/store/useLpbfWorkflowStore";
import { useLpbfEngineeringStore, engineeringSignature, resumeEngineeringJob, startEngineeringJobPersistence, LPBF_ENGINEERING_JOB_STORAGE_KEY } from "../src/store/useLpbfEngineeringStore";
import { useMaterialSpecimenStore } from "../src/store/useMaterialSpecimenStore";
import { canonicalLpbfMaterialName, isSupportedSlicerMaterial } from "../src/utils/lpbfMaterialIdentity";
import { createLpbfQualificationReport, sharedSimulationInput } from "../src/utils/lpbfQualificationReport";
import { simulationApi, type SimulationJob, type SimulationResult } from "../src/services/lpbfSimulationService";

// Synthetic presentation fixture, never a physical validation dataset.
function completedJob(): SimulationJob {
  const input = sharedSimulationInput(useMaterialSpecimenStore.getState().activeSpecimen);
  const result: SimulationResult = {
    schemaVersion:1, requestedMode:"standard",effectiveMode:"standard",solver:{id:"synthetic-workflow-fixture",version:"1",openfoam:null},
    settings:input,confidence:"low",validationStatus:"unvalidated",productionReady:false,label:"Unvalidated thermal simulation",
    fallbackReason:null,metrics:{width_um:120,depth_um:45,length_um:200},material:{name:input.material,quality:"estimated",source:"Synthetic UI fixture; not measured evidence"},
    analyticalComparison:{},assumptions:["Fixture only"],regime:"screening",mainRisk:"unresolved",recommendation:"Measure",riskScope:"screening only",
  };
  return {id:"a".repeat(32),status:"completed",progress:1,log:"fixture",error:null,result};
}

test("eight workflow stages share the existing specimen vector without a machine-parameter copy",()=>{
  assert.equal(LPBF_WORKFLOW_STAGES.length,8);
  assert.equal(new Set(LPBF_WORKFLOW_STAGES.map(stage=>stage.id)).size,8);
  assert.equal(isLpbfWorkflowStage("qualification"),true);
  assert.equal(isLpbfWorkflowStage("invented"),false);
  useMaterialSpecimenStore.getState().loadPreset("inconel-718");
  useMaterialSpecimenStore.getState().updateLpbfProcess({laserPower_W:321,hatch_um:95});
  useLpbfWorkflowStore.getState().updateContext({buildId:"UI-fixture-build",powderLot:"UI-fixture-lot"});
  useLpbfEngineeringStore.setState({width:"125",source:"UI fixture source"});
  for (const stage of LPBF_WORKFLOW_STAGES) {
    useLpbfWorkflowStore.getState().setStage(stage.id);
    assert.equal(sharedSimulationInput(useMaterialSpecimenStore.getState().activeSpecimen).power_W,321);
    assert.equal(useLpbfEngineeringStore.getState().width,"125");
    assert.equal(useLpbfWorkflowStore.getState().context.buildId,"UI-fixture-build");
  }
  assert.equal("laserPower_W" in useLpbfWorkflowStore.getState(),false);
});

test("only recognized material identities normalize; unknown alloys cannot become a surrogate",()=>{
  assert.equal(canonicalLpbfMaterialName("Inconel 718 (AMS 5662 / UNS N07718)"),"Inconel 718");
  assert.equal(canonicalLpbfMaterialName("Ti-6Al-4V Grade 23 ELI (ASTM F3001)"),"Ti-6Al-4V");
  assert.equal(canonicalLpbfMaterialName("AISI 316L Stainless Steel (UNS S31603)"),"316L Stainless Steel");
  assert.equal(canonicalLpbfMaterialName("René custom alloy"),"René custom alloy");
  assert.equal(isSupportedSlicerMaterial("René custom alloy"),false);
});

test("qualification distinguishes current/executed inputs and never promotes numerical or calibration evidence",()=>{
  const specimen=useMaterialSpecimenStore.getState().activeSpecimen;
  const context=useLpbfWorkflowStore.getState().context;
  const job=completedJob();
  const engineering={...useLpbfEngineeringStore.getState(),job,submittedInput:job.result!.settings};
  engineering.resultSignature=engineeringSignature(sharedSimulationInput(specimen),engineering,specimen.lpbf.scanStrategy);
  const report=createLpbfQualificationReport(specimen,context,engineering,null);
  assert.equal(report.resultMatchesCurrentInputs,true);
  assert.equal(report.productionReady,false);
  assert.equal(report.qualificationStatus,"Unresolved");
  assert.equal(report.verification.experimentalValidation,"Unresolved");
  const changed={...specimen,lpbf:{...specimen.lpbf,laserPower_W:400}};
  const stale=createLpbfQualificationReport(changed,context,engineering,null);
  assert.equal(stale.resultMatchesCurrentInputs,false);
  assert.equal(stale.executedInput.power_W,321);
  assert.equal(stale.currentProcess.laserPower_W,400);
  assert.ok(stale.limitations.some(item=>item.includes("Current inputs differ")));
  const failed=createLpbfQualificationReport(specimen,context,{...engineering,job:{...job,status:"failed"}},null);
  assert.equal(failed.resultDescription,"No completed result");
  assert.equal(failed.resultMatchesCurrentInputs,null);
});

test("worker polling completes without a mounted view and cancelled jobs cannot be resurrected",async()=>{
  const previousGet=simulationApi.get;
  const job=completedJob();
  try {
    let requests=0;
    simulationApi.get=async()=>{requests++;return job;};
    useLpbfEngineeringStore.setState({job:{...job,status:"running",result:undefined},submittedSignature:"executed-ui-fixture",error:""});
    resumeEngineeringJob();
    resumeEngineeringJob();
    await new Promise(resolve=>setTimeout(resolve,650));
    assert.equal(requests,1);
    assert.equal(useLpbfEngineeringStore.getState().job?.status,"completed");
    assert.equal(useLpbfEngineeringStore.getState().resultSignature,"executed-ui-fixture");
    useLpbfEngineeringStore.setState({job:{...job,id:"b".repeat(32),status:"running",result:undefined}});
    simulationApi.get=async()=>{useLpbfEngineeringStore.setState({job:{...job,id:"b".repeat(32),status:"cancelled",result:undefined}});return {...job,id:"b".repeat(32)};};
    resumeEngineeringJob();
    await new Promise(resolve=>setTimeout(resolve,650));
    assert.equal(useLpbfEngineeringStore.getState().job?.status,"cancelled");
  } finally {simulationApi.get=previousGet;useLpbfEngineeringStore.setState({job:undefined});}
});

test("app startup restores report evidence without mounting thermal view and preserves current controls", async()=>{
  const previousGet=simulationApi.get;
  const initial=useLpbfEngineeringStore.getState();
  const job=completedJob();
  const submittedInput={...job.result!.settings,mesh_um:35};
  const values=new Map([[LPBF_ENGINEERING_JOB_STORAGE_KEY,JSON.stringify({id:job.id,signature:"original executed signature",input:submittedInput,cacheHit:true})]]);
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  let stop=()=>{};
  try {
    useLpbfEngineeringStore.setState({job:undefined,busy:false,settings:{...initial.settings,mesh_um:50},submittedInput:undefined,submittedSignature:"",resultSignature:""});
    simulationApi.get=async id=>{assert.equal(id,job.id);return job;};
    stop=startEngineeringJobPersistence(storage);
    await new Promise(resolve=>setTimeout(resolve,0));
    const restored=useLpbfEngineeringStore.getState();
    assert.equal(restored.job?.id,job.id);
    assert.equal(restored.job?.cacheHit,true);
    assert.deepEqual(restored.submittedInput,submittedInput);
    assert.equal(restored.settings.mesh_um,50);
    assert.equal(restored.resultSignature,"original executed signature");
    const report=createLpbfQualificationReport(useMaterialSpecimenStore.getState().activeSpecimen,useLpbfWorkflowStore.getState().context,restored,null);
    assert.equal(report.job?.id,job.id);
    assert.equal(report.executedInput.mesh_um,35);
    assert.equal(report.resultMatchesCurrentInputs,false);
    const newInput={...submittedInput,mesh_um:50};
    useLpbfEngineeringStore.setState({job:{...job,id:"c".repeat(32)},submittedInput:newInput,submittedSignature:"new signature"});
    const saved=JSON.parse(values.get(LPBF_ENGINEERING_JOB_STORAGE_KEY)!);
    assert.equal(saved.id,"c".repeat(32));
    assert.equal(saved.signature,"new signature");
    assert.deepEqual(saved.input,newInput);
  } finally {stop();simulationApi.get=previousGet;useLpbfEngineeringStore.setState(initial);}
});

test("late saved-job response cannot replace a newer submission or a restarted app lifecycle", async()=>{
  const previousGet=simulationApi.get;
  const initial=useLpbfEngineeringStore.getState();
  const job=completedJob();
  const storage={getItem:()=>JSON.stringify({id:job.id,signature:"saved"}),setItem:()=>{}};
  let resolve!:(job:SimulationJob)=>void;
  let stop=()=>{};
  try {
    useLpbfEngineeringStore.setState({job:undefined,busy:false});
    simulationApi.get=()=>new Promise(done=>{resolve=done;});
    stop=startEngineeringJobPersistence(storage);
    useLpbfEngineeringStore.setState({busy:true});
    useLpbfEngineeringStore.setState({busy:false});
    resolve(job);
    await new Promise(done=>setTimeout(done,0));
    assert.equal(useLpbfEngineeringStore.getState().job,undefined,"even a failed new submit supersedes restoration");
    stop();
    stop=startEngineeringJobPersistence(storage);
    stop();
    resolve(job);
    await new Promise(done=>setTimeout(done,0));
    assert.equal(useLpbfEngineeringStore.getState().job,undefined,"unmounted app cannot restore stale evidence");
  } finally {stop();simulationApi.get=previousGet;useLpbfEngineeringStore.setState(initial);}
});
