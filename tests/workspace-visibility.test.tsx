import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceVisibility, useWorkspaceVisible } from '../src/components/WorkspaceVisibility';
import { ResponsiveContainer } from '../src/components/VisibleResponsiveContainer';

function VisibilityProbe() {
  return <output>{useWorkspaceVisible() ? 'visible' : 'hidden'}</output>;
}

test('nested stage visibility cannot reactivate a hidden workspace', () => {
  for (const parent of [false, true]) for (const stage of [false, true]) {
    const html = renderToStaticMarkup(<WorkspaceVisibility visible={parent}>
      <WorkspaceVisibility visible={stage}><VisibilityProbe /></WorkspaceVisibility>
    </WorkspaceVisibility>);
    assert.equal(html, `<output>${parent && stage ? 'visible' : 'hidden'}</output>`);
  }
  assert.equal(renderToStaticMarkup(<VisibilityProbe />), '<output>visible</output>');
});

test('hidden chart bodies are not rendered while surrounding form content remains', () => {
  function ForbiddenChart() { throw new Error('A hidden chart must not mount'); return null; }
  const html = renderToStaticMarkup(<WorkspaceVisibility visible={false}>
    <input name="draft" defaultValue="unsaved research notes" />
    <WorkspaceVisibility visible={true}>
      <ResponsiveContainer width={400} height={200}><ForbiddenChart /></ResponsiveContainer>
    </WorkspaceVisibility>
  </WorkspaceVisibility>);
  assert.match(html, /unsaved research notes/);
  assert.doesNotMatch(html, /recharts-responsive-container/);
});

test('visible charts retain Recharts dimensions and children', () => {
  const html = renderToStaticMarkup(<WorkspaceVisibility visible={true}>
    <ResponsiveContainer width="100%" height={220} minWidth={20} id="visible-test">
      <span>chart content</span>
    </ResponsiveContainer>
  </WorkspaceVisibility>);
  assert.match(html, /id="visible-test"/);
  assert.match(html, /height:220px/);
  assert.match(html, /min-width:20px/);
  // A known dimension also exercises the actual chart child, independent of DOM measurement.
  assert.match(renderToStaticMarkup(<ResponsiveContainer width={400} height={200}><span>chart content</span></ResponsiveContainer>), /chart content/);
});
