import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLLERS, inputById, inputReference } from '../src/controllers.js';
import { starterState, blankState, validateState, activeAssignments, loadWorkspace, validHardwareName } from '../src/state.js';
import { generateJava } from '../src/codegen.js';
import { sampleGamepad } from '../src/tester.js';
import { photoLayout } from '../src/appearance.js';

function assignment(inputId, changes = {}) {
  const input = inputById('logitech-f310', inputId);
  return { id: 'test-' + inputId, controllerId: 'logitech-f310', gamepad: 'gamepad1', inputId, action: 'Custom action', customName: '', behavior: input.type === 'axis' ? 'analog' : input.type === 'trigger' ? 'trigger' : 'button', hardwareId: 'intake', value: 1, offValue: 0, threshold: 0.2, deadzone: 0.05, invert: false, ...changes };
}
test('every controller has unique, typed SDK inputs and independently positioned axes', () => {
  assert.equal(CONTROLLERS.length, 5);
  for (const c of CONTROLLERS) {
    assert.equal(new Set(c.inputs.map(i => i.id)).size, c.inputs.length);
    assert.equal(c.inputs.filter(i => i.type === 'axis').length, 4);
    assert.equal(c.inputs.filter(i => i.type === 'trigger').length, 2);
    for (const input of c.inputs) { assert.match(input.sdk, /^[a-z_]+$/); assert.equal(inputReference(input).type, input.type === 'boolean' ? 'boolean' : 'float'); }
  }
});
test('each reference photo has calibrated hotspots for all of its SDK inputs', () => {
  assert.equal(CONTROLLERS.filter(c => c.photo).length, 4);
  for (const c of CONTROLLERS.filter(c => c.photo)) {
    const layout = photoLayout(c);
    for (const input of c.inputs) {
      assert.ok(layout.centers[input.id], `${c.name}: missing ${input.id}`);
      assert.ok(layout.centers[input.id].x > 0 && layout.centers[input.id].x < 720);
      assert.ok(layout.centers[input.id].y > 0 && layout.centers[input.id].y < layout.viewHeight);
    }
  }
  assert.equal(photoLayout(CONTROLLERS.find(c => c.id === 'quadstick')), null);
});
test('starter configuration round-trips and uses one priority chain per mechanism', () => {
  const state = starterState(); assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))), state);
  const code = generateJava(state);
  assert.match(code, /if \(gamepad2.right_bumper\) \{\n\s*this.intake.setPower\(1.0\);[\s\S]*?\} else if \(gamepad2.left_bumper\) \{/);
  assert.doesNotMatch(code, /else \{\s*this.claw.setPosition/);
  assert.match(code, /finally \{[\s\S]*this.intake.setPower\(0.0\)/);
  assert.match(code, /hardwareMap.get\(DcMotor.class, "intake"\)/);
});
test('axes are numeric, inverted when requested, and respect their deadzone', () => {
  const state = starterState(); state.assignments = [assignment('left_stick_y', { invert: true, value: 0.8 })];
  const code = generateJava(state);
  assert.match(code, /Math.abs\(gamepad1.left_stick_y\) > 0.05/);
  assert.match(code, /setPower\(-gamepad1.left_stick_y \* 0.8\)/);
  assert.doesNotMatch(code, /if \(gamepad1.left_stick_y\)/);
});
test('trigger power remains proportional above a configurable threshold', () => {
  const state = starterState(); state.assignments = [assignment('right_trigger', { threshold: 0.35 })];
  const code = generateJava(state);
  assert.match(code, /if \(gamepad1.right_trigger > 0.35\)/);
  assert.match(code, /setPower\(gamepad1.right_trigger \* 1.0\)/);
});
test('toggle state is persistent and has unique rising-edge memory for each gamepad', () => {
  const state = starterState(); state.assignments = [assignment('a', { behavior: 'toggle' }), assignment('a', { id: 'second', gamepad: 'gamepad2', behavior: 'toggle', hardwareId: 'claw', value: 0.8, offValue: 0.2 })];
  const code = generateJava(state);
  assert.match(code, /private boolean mapper_last0/); assert.match(code, /private boolean mapper_last1/);
  assert.match(code, /gamepad1.a && !mapper_last0/); assert.match(code, /gamepad2.a && !mapper_last1/);
  assert.match(code, /mapper_last1 = gamepad2.a/); assert.match(code, /this.claw.setPosition\(0.2\)/);
});
test('advanced mode places reusable updateControls outside runOpMode', () => {
  const state = starterState(); state.mode = 'advanced';
  const code = generateJava(state);
  assert.match(code, /while \(opModeIsActive\(\)\) \{\n\s*updateControls\(\);/);
  assert.match(code, /private void updateControls\(\) \{/);
});
test('switching models keeps old assignments but excludes them from current code', () => {
  const state = starterState(); state.controllerByGamepad.gamepad2 = 'dualshock-4';
  assert.equal(activeAssignments(state).length, 0); assert.equal(state.assignments.length, 4);
  assert.doesNotMatch(generateJava(state), /if \(gamepad2.a\)/);
  state.controllerByGamepad.gamepad2 = 'logitech-f310'; assert.equal(activeAssignments(state).length, 4);
});
test('a hardware-free mapping produces telemetry and an explicit TODO', () => {
  const state = blankState(); state.assignments = [assignment('a', { hardwareId: '', customName: 'Launch "ready"' })];
  const code = generateJava(state);
  assert.match(code, /TODO: Launch/); assert.match(code, /telemetry.addLine\("Launch \\"ready\\""\)/);
  assert.doesNotMatch(code, /setPower/);
});
test('invalid imports cannot introduce code, NaN, duplicate inputs, or wrong input types', () => {
  for (const alter of [
    s => { s.hardware[0].name = 'intake); evil('; },
    s => { s.hardware[0].name = 'gamepad1'; },
    s => { s.hardware[0].name = 'mapper_on0'; },
    s => { s.hardware[0].name = 'class'; },
    s => { s.assignments[0].value = NaN; },
    s => { s.assignments[0].threshold = -0.1; },
    s => { s.assignments[0].value = -0.5; },
    s => { s.assignments[0].customName = 'Hello\nmalicious'; },
    s => { s.assignments[0].hardwareId = 'missing'; },
    s => { s.assignments.push({ ...s.assignments[0], id: 'duplicate' }); },
    s => { s.assignments = [assignment('left_stick_y', { behavior: 'button' })]; },
    s => { s.assignments = [assignment('left_stick_x', { hardwareId: 'claw' })]; },
    s => { s.controllerByGamepad.gamepad1 = '__proto__'; },
  ]) { const state = starterState(); alter(state); assert.throws(() => validateState(state)); }
  assert.equal(validHardwareName('leftDrive'), true); assert.equal(validHardwareName('intake-1'), false);
});
test('corrupt saved data falls back without writing to browser storage', () => {
  const result = loadWorkspace({ getItem() { return '{broken'; }, setItem() { assert.fail('Must not overwrite corrupt storage'); } });
  assert.ok(result.error); assert.equal(result.state.name, 'Starter configuration');
});
test('standard browser input highlights only correct controls; unknown mapping stays raw', () => {
  const pad = { mapping: 'standard', axes: [0, -0.8, 0.5, 0], buttons: Array.from({ length: 18 }, () => ({ value: 0, pressed: false })) };
  pad.buttons[5] = { value: 1, pressed: true }; pad.buttons[7] = { value: 0.4, pressed: false }; pad.buttons[12] = { value: 1, pressed: true };
  const sample = sampleGamepad(pad, CONTROLLERS[0]);
  assert.equal(sample.inputs.find(i => i.id === 'right_bumper').active, true);
  assert.equal(sample.inputs.find(i => i.id === 'left_bumper').active, false);
  assert.equal(sample.inputs.find(i => i.id === 'left_stick_y').value, -0.8);
  assert.equal(sample.inputs.find(i => i.id === 'right_trigger').value, 0.4);
  assert.equal(sample.inputs.find(i => i.id === 'dpad_up').active, true);
  pad.mapping = ''; const raw = sampleGamepad(pad, CONTROLLERS[0]); assert.equal(raw.standard, false); assert.equal(raw.inputs.length, 0); assert.equal(raw.rawAxes.length, 4);
});
