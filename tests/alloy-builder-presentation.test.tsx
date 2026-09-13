import React from "react";
import assert from "node:assert/strict";
import {test} from "node:test";
import {renderToStaticMarkup} from "react-dom/server";
import {AlloyBuilder} from "../src/components/AlloyBuilder";
import {useMaterialStore} from "../src/store/useMaterialStore";
import {useMaterialSpecimenStore} from "../src/store/useMaterialSpecimenStore";
import {startMaterialContextBridge} from "../src/services/materialContextBridge";

test("builder renders the selected steel family and distinguishes screening estimate from active process",()=>{
  useMaterialSpecimenStore.getState().loadPreset("ss-316l");
  useMaterialSpecimenStore.getState().updateLpbfProcess({laserPower_W:40,scanSpeed_mms:850});
  const stop=startMaterialContextBridge();
  const builderInitial=useMaterialStore.getInitialState();
  const sharedInitial=useMaterialSpecimenStore.getInitialState();
  const builderOriginal=builderInitial.activeMaterialSpecimen;
  const sharedOriginal=sharedInitial.activeSpecimen;
  // Server rendering reads Zustand's initial snapshots; expose the explicit fixture snapshots.
  builderInitial.activeMaterialSpecimen=useMaterialStore.getState().activeMaterialSpecimen;
  sharedInitial.activeSpecimen=useMaterialSpecimenStore.getState().activeSpecimen;
  try {
    const html=renderToStaticMarkup(<AlloyBuilder/>);
    assert.match(html,/<option value="Steels &amp; Irons" selected="">Steels &amp; Irons<\/option>/);
    assert.doesNotMatch(html,/<option value="Nickel Superalloy" selected/);
    assert.match(html,/<option value="Unspecified" selected="">Unspecified<\/option>/);
    assert.match(html,/LPBF Starting Estimate \(Screening\)/);
    assert.match(html,/>200<\/span>/);
    assert.match(html,/Current shared process: 40 W @ 850 mm\/s/);
    assert.match(html,/Composition-based estimate; unvalidated/);
    useMaterialSpecimenStore.getState().updateLpbfProcess({laserPower_W:41});
    sharedInitial.activeSpecimen=useMaterialSpecimenStore.getState().activeSpecimen;
    assert.match(renderToStaticMarkup(<AlloyBuilder/>),/Current shared process: 41 W @ 850 mm\/s/);
    useMaterialStore.getState().updateMetadata({category:"User supplied category"});
    builderInitial.activeMaterialSpecimen=useMaterialStore.getState().activeMaterialSpecimen;
    assert.match(renderToStaticMarkup(<AlloyBuilder/>),/<option value="User supplied category" selected="">User supplied category<\/option>/);
  } finally {
    stop();
    builderInitial.activeMaterialSpecimen=builderOriginal;
    sharedInitial.activeSpecimen=sharedOriginal;
  }
});
