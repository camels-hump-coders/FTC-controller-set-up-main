import { CONTROLLERS, controllerById, inputById } from './controllers.js';

export const STORAGE_KEY = 'ftc-mapper.workspace.v1';
export const LIBRARY_KEY = 'ftc-mapper.configurations.v1';
export const ACTIONS = ['Open claw', 'Close claw', 'Run intake', 'Reverse intake', 'Raise arm', 'Lower arm', 'Hang', 'Reset arm', 'Launch', 'Drive', 'Custom action'];
const reserved = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _ record var yield sealed permits non-sealed gamepad1 gamepad2 hardwareMap telemetry time').split(' '));
export function validHardwareName(name) { return typeof name === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/.test(name) && !reserved.has(name) && !name.startsWith('mapper_'); }
export function blankState() {
  return { schemaVersion: 1, name: 'Untitled configuration', activeGamepad: 'gamepad2', selectedInput: 'right_bumper', mode: 'beginner', controllerByGamepad: { gamepad1: 'logitech-f310', gamepad2: 'logitech-f310' }, hardware: [], assignments: [] };
}
export function starterState() {
  const state = blankState();
  state.name = 'Starter configuration';
  state.hardware = [{ id: 'intake', name: 'intake', type: 'DcMotor' }, { id: 'arm', name: 'arm', type: 'DcMotor' }, { id: 'claw', name: 'claw', type: 'Servo' }];
  state.assignments = [
    { inputId: 'a', action: 'Open claw', hardwareId: 'claw', value: 0.8 },
    { inputId: 'b', action: 'Close claw', hardwareId: 'claw', value: 0.2 },
    { inputId: 'right_bumper', action: 'Run intake', hardwareId: 'intake', value: 1 },
    { inputId: 'left_bumper', action: 'Reverse intake', hardwareId: 'intake', value: -1 },
  ].map((a, i) => ({ id: `starter-${i}`, controllerId: 'logitech-f310', gamepad: 'gamepad2', behavior: 'button', customName: '', offValue: 0, threshold: 0.2, deadzone: 0.05, invert: false, ...a }));
  return state;
}
export function activeAssignments(state) { return state.assignments.filter(a => a.controllerId === state.controllerByGamepad[a.gamepad]); }
export function findAssignment(state, inputId = state.selectedInput, gamepad = state.activeGamepad) { return state.assignments.find(a => a.gamepad === gamepad && a.controllerId === state.controllerByGamepad[gamepad] && a.inputId === inputId); }
export const assignmentName = a => a.customName || a.action;
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fail = message => { throw new Error(message); };
export function validateState(data) {
  if (!data || typeof data !== 'object' || data.schemaVersion !== 1) fail('This is not a supported FTC Mapper configuration (version 1).');
  if (typeof data.name !== 'string' || data.name.length > 80 || /[\r\n]/.test(data.name)) fail('Configuration name must be at most 80 characters.');
  if (!['gamepad1', 'gamepad2'].includes(data.activeGamepad) || !['beginner', 'advanced'].includes(data.mode)) fail('Invalid gamepad or code mode.');
  for (const gamepad of ['gamepad1', 'gamepad2']) if (!controllerById(data.controllerByGamepad?.[gamepad])) fail('Unknown controller model.');
  if (!inputById(data.controllerByGamepad[data.activeGamepad], data.selectedInput)) fail('Unknown selected input.');
  if (!Array.isArray(data.hardware) || data.hardware.length > 30 || !Array.isArray(data.assignments) || data.assignments.length > 250) fail('Invalid hardware or assignment list.');
  const hardwareIds = new Set(), hardwareNames = new Set(), ids = new Set(), inputs = new Set();
  const hardware = data.hardware.map(h => {
    if (!h || typeof h.id !== 'string' || !h.id || h.id.length > 100 || hardwareIds.has(h.id) || !validHardwareName(h.name) || hardwareNames.has(h.name) || !['DcMotor', 'Servo', 'CRServo'].includes(h.type)) fail('Hardware needs unique Java-safe names and IDs, and a valid type. Avoid Java keywords, SDK fields, and the mapper_ prefix.');
    hardwareIds.add(h.id); hardwareNames.add(h.name);
    return { id: h.id, name: h.name, type: h.type };
  });
  const assignments = data.assignments.map(a => {
    if (!a || typeof a.id !== 'string' || !a.id || a.id.length > 100 || ids.has(a.id)) fail('Assignment IDs must be unique.');
    ids.add(a.id);
    const input = inputById(a.controllerId, a.inputId), key = `${a.gamepad}:${a.controllerId}:${a.inputId}`;
    if (!input || !['gamepad1', 'gamepad2'].includes(a.gamepad) || inputs.has(key)) fail('Unknown or duplicate controller input.');
    inputs.add(key);
    if (!ACTIONS.includes(a.action) || typeof a.customName !== 'string' || a.customName.length > 60 || /[\r\n\u2028\u2029]/.test(a.customName)) fail('Invalid action name.');
    if (!['button', 'toggle', 'analog', 'trigger'].includes(a.behavior) || (input.type === 'axis' && a.behavior !== 'analog') || (input.type === 'trigger' && a.behavior !== 'trigger') || (input.type === 'boolean' && !['button', 'toggle'].includes(a.behavior))) fail('Action behavior does not match the input type.');
    const h = hardware.find(h => h.id === a.hardwareId);
    if (a.hardwareId !== '' && !h) fail('An assignment references missing hardware.');
    if (h?.type === 'Servo' && ['analog', 'trigger'].includes(a.behavior)) fail('Analog and trigger actions require a motor or CRServo.');
    for (const key of ['value', 'offValue', 'threshold', 'deadzone']) if (typeof a[key] !== 'number' || !Number.isFinite(a[key])) fail('Action values must be finite numbers.');
    if (Math.abs(a.value) > 1 || Math.abs(a.offValue) > 1 || a.threshold < 0 || a.threshold > 1 || a.deadzone < 0 || a.deadzone >= 1 || typeof a.invert !== 'boolean' || (h?.type === 'Servo' && (a.value < 0 || a.offValue < 0))) fail('Action values are outside their supported range.');
    return { id: a.id, controllerId: a.controllerId, gamepad: a.gamepad, inputId: a.inputId, action: a.action, customName: a.customName, behavior: a.behavior, hardwareId: a.hardwareId, value: a.value, offValue: a.offValue, threshold: a.threshold, deadzone: a.deadzone, invert: a.invert };
  });
  return { schemaVersion: 1, name: data.name, activeGamepad: data.activeGamepad, selectedInput: data.selectedInput, mode: data.mode, controllerByGamepad: { gamepad1: data.controllerByGamepad.gamepad1, gamepad2: data.controllerByGamepad.gamepad2 }, hardware, assignments };
}
export function loadWorkspace(storage) {
  try { const saved = storage.getItem(STORAGE_KEY); return { state: saved ? validateState(JSON.parse(saved)) : starterState(), error: null }; }
  catch { return { state: starterState(), error: 'Saved workspace could not be read. A starter configuration is open; the saved copy has not been overwritten.' }; }
}
