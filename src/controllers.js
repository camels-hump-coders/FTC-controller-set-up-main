import { APPEARANCES } from './appearance.js';
// One canonical SDK input vocabulary; controller data supplies physical labels and layout.
const button = (id, label, short, x, y, browserButton, extra = {}) => ({ id, sdk: id, label, short, x, y, type: 'boolean', browserButton, ...extra });
const axis = (side, direction, x, y, browserAxis) => ({ id: `${side}_stick_${direction}`, sdk: `${side}_stick_${direction}`, label: `${side === 'left' ? 'Left' : 'Right'} stick ${direction.toUpperCase()}`, short: direction.toUpperCase(), x, y, type: 'axis', browserAxis, shape: 'axis' });
function standardInputs(ps = false, xbox = false) {
  const lx = xbox ? 192 : 270, ly = xbox ? 190 : 278, dx = xbox ? 275 : 187, dy = xbox ? 278 : 195;
  return [
    button('a', ps ? 'Cross (×)' : 'A button', ps ? '×' : 'A', 536, 239, 0, { color: ps ? '#9aacd6' : '#4dbb87' }),
    button('b', ps ? 'Circle (○)' : 'B button', ps ? '○' : 'B', 577, 197, 1, { color: ps ? '#e1929e' : '#e26a74' }),
    button('x', ps ? 'Square (□)' : 'X button', ps ? '□' : 'X', 495, 197, 2, { color: ps ? '#d3a1c6' : '#5da5ee' }),
    button('y', ps ? 'Triangle (△)' : 'Y button', ps ? '△' : 'Y', 536, 155, 3, { color: ps ? '#69beb4' : '#e2c864' }),
    button('left_bumper', 'Left bumper', ps ? 'L1' : 'LB', 197, 102, 4, { shape: 'shoulder' }),
    button('right_bumper', 'Right bumper', ps ? 'R1' : 'RB', 523, 102, 5, { shape: 'shoulder' }),
    { id: 'left_trigger', sdk: 'left_trigger', label: 'Left trigger', short: ps ? 'L2' : 'LT', x: 197, y: 61, type: 'trigger', browserButton: 6, shape: 'trigger' },
    { id: 'right_trigger', sdk: 'right_trigger', label: 'Right trigger', short: ps ? 'R2' : 'RT', x: 523, y: 61, type: 'trigger', browserButton: 7, shape: 'trigger' },
    button('back', ps ? 'Share' : 'Back', ps ? 'SHARE' : 'BACK', ps ? 302 : 307, ps ? 147 : 184, 8, { shape: 'small' }),
    button('start', ps ? 'Options' : 'Start', ps ? 'OPTIONS' : 'START', ps ? 419 : 413, ps ? 147 : 184, 9, { shape: 'small' }),
    button('left_stick_button', 'Left stick click', 'L3', lx, ly, 10, { shape: 'stick' }),
    button('right_stick_button', 'Right stick click', 'R3', 450, 278, 11, { shape: 'stick' }),
    button('dpad_up', 'D-pad up', '↑', dx, dy - 29, 12, { shape: 'dpad' }),
    button('dpad_down', 'D-pad down', '↓', dx, dy + 29, 13, { shape: 'dpad' }),
    button('dpad_left', 'D-pad left', '←', dx - 29, dy, 14, { shape: 'dpad' }),
    button('dpad_right', 'D-pad right', '→', dx + 29, dy, 15, { shape: 'dpad' }),
    button('guide', ps ? 'PS / Home' : xbox ? 'Xbox / Guide' : 'Logitech / Guide', ps ? 'PS' : xbox ? 'X' : 'G', 360, ps ? 244 : 181, 16, { shape: 'guide', note: 'The system may intercept this button. Confirm it is reported by your Driver Station before relying on it.' }),
    axis('left', 'x', lx - 25, ly + 64, 0), axis('left', 'y', lx + 25, ly + 64, 1),
    axis('right', 'x', 425, 342, 2), axis('right', 'y', 475, 342, 3),
  ];
}
const psInputs = standardInputs(true);
export const CONTROLLERS = [
  { id: 'logitech-f310', name: 'Logitech F310', family: 'logitech', brand: 'logitech', model: 'F310', body: '#273e64', inputs: standardInputs(), note: 'Use XInput (X) mode. MODE can swap the D-pad and left stick; verify inputs on your Driver Station.' },
  { id: 'xbox-360', name: 'Xbox 360 Controller', family: 'xbox', brand: 'XBOX 360', model: 'WIRED CONTROLLER', body: '#d4d7d4', inputs: standardInputs(false, true), note: 'Asymmetric stick layout. Verify the physical controller’s mapping on your FTC Driver Station.' },
  { id: 'dualshock-4', name: 'Sony DualShock 4', family: 'playstation', brand: 'SONY', model: 'DUALSHOCK 4', body: '#363944', inputs: [...psInputs, button('touchpad', 'Touchpad click', 'TOUCHPAD', 360, 165, 17, { shape: 'touchpad', note: 'Maps the touchpad click, not touch coordinates. Browser reporting varies.' })], note: 'Cross → a, Circle → b, Square → x, Triangle → y. Share → back and Options → start. Verify on the Driver Station.' },
  { id: 'etpark-ps4', name: 'Etpark Wired Controller for PS4', family: 'playstation', brand: 'ETPARK', model: 'WIRED CONTROLLER', body: '#282e37', inputs: standardInputs(true), note: 'PS4-style button aliases apply. Etpark revisions differ; verify support on your Driver Station. Touch sensing is not assumed.' },
  { id: 'quadstick', name: 'QuadStick Game Controller', family: 'quadstick', brand: 'QuadStick', model: 'XBOX 360 EMULATION', body: '#30363b', inputs: standardInputs(false, true).map((input, i) => ({ ...input, x: 45 + (i % 7) * 104, y: 267 + Math.floor(i / 7) * 51, shape: 'output', short: input.type === 'axis' ? input.id.replace('_stick_', ' ').replace('left', 'L').replace('right', 'R').toUpperCase() : input.short })), note: 'Use Xbox 360 emulation. Below are emulated outputs, not fixed physical buttons. Configure sip/puff, lip, and joystick gestures in your QuadStick profile first.' },
].map(definition => ({ ...definition, ...APPEARANCES[definition.id] }));
export const controllerById = id => CONTROLLERS.find(c => c.id === id);
export const inputById = (controllerId, inputId) => controllerById(controllerId)?.inputs.find(input => input.id === inputId);
export function inputReference(input) {
  if (input.type === 'axis') return { type: 'float', range: '−1.0 to 1.0', description: `Continuous ${input.id.endsWith('_y') ? 'vertical' : 'horizontal'} movement; 0 at rest. ${input.id.endsWith('_y') ? 'Pushing forward is negative. Invert Y for forward-positive power.' : 'Left is negative; right is positive.'}` };
  if (input.type === 'trigger') return { type: 'float', range: '0.0 to 1.0', description: '0 when released; 1 when fully pressed. A threshold ignores light accidental presses.' };
  return { type: 'boolean', range: 'true / false', description: `true while ${input.label.toLowerCase()} is pressed; false when released.` };
}
