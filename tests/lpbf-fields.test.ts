import assert from "node:assert/strict";
import {parseFieldSeries,decodeField} from "../src/components/3d-distortion-lab/ResolvedThermalViewer";
const valid={version:1,cells:2,spacing_m:2e-5,coordinates:"field-coordinates.bin",solidus_K:1500,liquidus_K:1600,frames:[{path:"field-frame-000.bin",time_s:0,surface_m:0,minimum_K:300,maximum_K:1500}]};
assert.equal(parseFieldSeries(valid).cells,2);
for(const patch of [{cells:600001},{spacing_m:NaN},{coordinates:"../secret"},{liquidus_K:1200},{frames:[]},{frames:[{...valid.frames[0],path:"../secret"}]}])assert.throws(()=>parseFieldSeries({...valid,...patch}));
assert.deepEqual([...decodeField(new Float32Array([300,1600]).buffer,2)],[300,1600]);
assert.throws(()=>decodeField(new Float32Array([300]).buffer,2));
assert.throws(()=>decodeField(new Float32Array([Infinity]).buffer,1));
console.log("Resolved field contract: passed");
