import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import * as api from '../dist/esm/index.js';

const images = {
  before: { src: 'before.jpg', alt: 'Before' },
  after: { src: 'after.jpg', alt: 'After' },
};

async function setup(t, props = {}) {
  const dom = new JSDOM('<div id="mount"></div>');
  const saved = new Map();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const root = createRoot(document.getElementById('mount'));
  let unmounted = false;
  const unmount = async () => {
    if (!unmounted) {
      await act(() => root.unmount());
      unmounted = true;
    }
  };
  const render = async (extra = {}) =>
    act(() =>
      root.render(React.createElement(api.ComparisonSlider, { ...images, ...props, ...extra })),
    );
  const pointer = async (type, x, y = 0, id = 1) => {
    const event = new dom.window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, 'pointerId', { value: id });
    await act(() => document.querySelector('.lp-comparison').dispatchEvent(event));
  };
  const key = async (name) =>
    act(() =>
      document
        .querySelector('[role="slider"]')
        .dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true })),
    );
  t.after(async () => {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await render();
  const element = document.querySelector('.lp-comparison');
  element.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 100 });
  return { dom, element, render, pointer, key, unmount };
}

test('runtime module parity and server rendering without browser globals', () => {
  assert.deepEqual(
    Object.keys(createRequire(import.meta.url)('../dist/cjs/index.js')).sort(),
    Object.keys(api).sort(),
  );
  assert.ok(
    renderToString(React.createElement(api.ComparisonSlider, images)).includes('role="slider"'),
  );
});

test('helpers clamp bounds and handle invalid and zero geometry', () => {
  assert.equal(api.clampComparisonValue(-1), 0);
  assert.equal(api.clampComparisonValue(101), 100);
  assert.equal(api.clampComparisonValue(NaN), 50);
  assert.equal(api.positionToValue(110, 10, 200), 50);
  assert.equal(api.positionToValue(1000, 10, 200), 100);
  assert.equal(api.positionToValue(100, 0, 0), 50);
  assert.throws(
    () => renderToString(React.createElement(api.ComparisonSlider, { ...images, step: 0 })),
    RangeError,
  );
});

test('uncontrolled keyboard handles arrows, home/end and page increments accessibly', async (t) => {
  const commits = [];
  const { key } = await setup(t, {
    defaultValue: 20,
    step: 5,
    onValueCommit: (value) => commits.push(value),
  });
  await key('ArrowRight');
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '25');
  await key('End');
  await key('ArrowRight');
  await key('PageDown');
  await key('Home');
  assert.deepEqual(commits, [25, 100, 100, 50, 0]);
  assert.equal(document.querySelectorAll('img').length, 2);
  assert.equal(
    document.querySelector('[role="slider"]').getAttribute('aria-valuetext'),
    '0% after image',
  );
});

test('controlled values emit changes without changing displayed value until rerender', async (t) => {
  const changes = [];
  const { key, render } = await setup(t, {
    value: 40,
    onValueChange: (value) => changes.push(value),
  });
  await key('ArrowRight');
  assert.deepEqual(changes, [41]);
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '40');
  await render({ value: 41 });
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '41');
  await render({ value: 400 });
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '100');
});

test('pointer capture tracks one pointer, clamps dragging, commits, and releases', async (t) => {
  const commits = [];
  const { element, pointer } = await setup(t, { onValueCommit: (value) => commits.push(value) });
  const captures = new Set();
  element.setPointerCapture = (id) => captures.add(id);
  element.hasPointerCapture = (id) => captures.has(id);
  element.releasePointerCapture = (id) => captures.delete(id);
  await pointer('pointerdown', 60);
  assert.ok(captures.has(1));
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '25');
  await pointer('pointermove', 210, 0, 2);
  await pointer('pointercancel', 210, 0, 2);
  assert.ok(captures.has(1));
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '25');
  await pointer('pointermove', 900);
  await pointer('pointerup', 900);
  assert.deepEqual(commits, [100]);
  assert.equal(captures.size, 0);
});

test('vertical orientation uses Y geometry and up/down keys; disabled blocks inputs', async (t) => {
  const { pointer, key, render } = await setup(t, { orientation: 'vertical', defaultValue: 50 });
  await pointer('pointerdown', 0, 45);
  await pointer('pointerup', 0, 45);
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '25');
  await key('ArrowDown');
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '26');
  await key('ArrowUp');
  await render({ disabled: true });
  await key('End');
  await pointer('pointerdown', 0, 120);
  assert.equal(document.querySelector('[role="slider"]').getAttribute('aria-valuenow'), '25');
  assert.equal(document.querySelector('[role="slider"]').tabIndex, -1);
});

test('cancel and unmount release pointer capture without a commit', async (t) => {
  const commits = [];
  const { element, pointer, unmount } = await setup(t, {
    onValueCommit: (value) => commits.push(value),
  });
  let captured = false;
  let releases = 0;
  element.setPointerCapture = () => {
    captured = true;
  };
  element.hasPointerCapture = () => captured;
  element.releasePointerCapture = () => {
    captured = false;
    releases++;
  };
  await pointer('pointerdown', 80);
  await pointer('pointercancel', 80);
  await pointer('pointerdown', 90);
  await unmount();
  assert.equal(releases, 2);
  assert.deepEqual(commits, []);
});
