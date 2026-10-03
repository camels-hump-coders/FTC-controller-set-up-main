import { escapeHtml } from './icons.js';
import { assignmentName } from './state.js';

export function renderController(controller, assignments, selectedId) {
  const quad = controller.family === 'quadstick', xbox = controller.family === 'xbox', ps = controller.family === 'playstation';
  const body = xbox
    ? 'M181 118 C140 117 121 148 110 196 L74 315 C58 378 102 404 139 365 L208 300 Q235 291 258 306 L290 318 Q360 338 430 318 L462 306 Q485 291 512 300 L581 365 C618 404 662 378 646 315 L610 196 C599 148 580 117 539 118 Q360 140 181 118Z'
    : 'M183 119 C140 115 113 148 104 197 L76 329 C65 381 112 405 146 367 L213 299 Q244 289 268 307 C316 342 404 342 452 307 Q476 289 507 299 L574 367 C608 405 655 381 644 329 L616 197 C607 148 580 115 537 119 Q491 132 463 131 L257 131 Q229 132 183 119Z';
  const map = new Map(assignments.map(a => [a.inputId, a]));
  return `<svg class="controller-svg ${controller.family}" viewBox="0 0 720 426" xmlns="http://www.w3.org/2000/svg" aria-label="Interactive ${escapeHtml(controller.name)} diagram" role="group">
    <defs>
      <linearGradient id="body-fill" x1="0" y1="0" x2="0.4" y2="1"><stop stop-color="${controller.body}"/><stop offset=".6" stop-color="${xbox ? '#343737' : ps ? '#252a33' : '#1d304f'}"/><stop offset="1" stop-color="${xbox ? '#171c1b' : '#151e2c'}"/></linearGradient>
      <linearGradient id="rubber-fill" x2=".3" y2="1"><stop stop-color="#383d45"/><stop offset="1" stop-color="#11161e"/></linearGradient>
      <radialGradient id="stick-fill" cx=".4" cy=".3"><stop stop-color="#353c46"/><stop offset=".85" stop-color="#1d232b"/><stop offset="1" stop-color="#11161e"/></radialGradient>
      <filter id="body-shadow" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="13" stdDeviation="11" flood-color="#172522" flood-opacity=".2"/></filter>
      <filter id="button-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-opacity=".35"/></filter>
      <pattern id="grip-texture" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#fff" opacity=".06"/></pattern>
    </defs>
    ${quad ? quadBody() : `<path d="M360 0V72q0 22 0 58" fill="none" stroke="${xbox ? '#9eaaa4' : '#303b45'}" stroke-width="9"/><path d="M358 0v122" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>
      <path d="${body}" fill="url(#body-fill)" stroke="${xbox ? '#909b91' : '#101a2a'}" stroke-width="2" filter="url(#body-shadow)"/>
      <path d="M108 202q17 16 28 43l42 47-41 62c-22 33-52 16-44-20Z" fill="url(#rubber-fill)" opacity=".95"/><path d="M612 202q-17 16-28 43l-42 47 41 62c22 33 52 16 44-20Z" fill="url(#rubber-fill)" opacity=".95"/>
      <path d="M108 202q17 16 28 43l42 47-41 62c-22 33-52 16-44-20Z M612 202q-17 16-28 43l-42 47 41 62c22 33 52 16 44-20Z" fill="url(#grip-texture)"/>
      <path d="M156 141q26-15 56-5l63 10h170l63-10q30-10 56 5" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="2"/>
      ${ps ? '<rect x="322" y="136" width="76" height="57" rx="7" fill="#171d25" stroke="#4b515c"/><circle cx="351" cy="212" r="2" fill="#68717d"/><circle cx="360" cy="212" r="2" fill="#68717d"/><circle cx="369" cy="212" r="2" fill="#68717d"/>' : `<text x="360" y="239" text-anchor="middle" class="controller-brand">${controller.brand}</text>${!xbox ? '<rect x="345" y="260" width="30" height="13" rx="6" fill="#182338" stroke="#42526a"/><circle cx="335" cy="266" r="2" fill="#82bc53"/><text x="360" y="286" text-anchor="middle" class="model-label">MODE</text>' : ''}`}
      <text x="360" y="308" text-anchor="middle" class="model-label">${controller.model}</text>
      <circle cx="${xbox ? 275 : 187}" cy="${xbox ? 278 : 195}" r="52" fill="${xbox ? '#181d1b' : '#111c2d'}" stroke="#ffffff" stroke-opacity=".07"/>
      <circle cx="${xbox ? 192 : 270}" cy="${xbox ? 190 : 278}" r="48" fill="#131d2b" stroke="#778298" stroke-opacity=".22" stroke-width="3"/><circle cx="450" cy="278" r="48" fill="#131d2b" stroke="#778298" stroke-opacity=".22" stroke-width="3"/>
    `}
    ${controller.inputs.map(input => control(input, map.get(input.id), input.id === selectedId, quad)).join('')}
    ${!quad ? `<text x="${xbox ? 192 : 270}" y="${xbox ? 286 : 377}" text-anchor="middle" class="axis-caption">LEFT STICK</text><text x="450" y="377" text-anchor="middle" class="axis-caption">RIGHT STICK</text>` : ''}
  </svg>`;
}

function control(input, assignment, selected, quad) {
  const { x, y, shape } = input;
  const assigned = Boolean(assignment);
  const label = `${input.label}${assignment ? ` — ${assignmentName(assignment)}` : ' — unassigned'}`;
  let element;
  if (shape === 'stick') element = '<circle r="37" fill="url(#stick-fill)" stroke="#414854" stroke-width="2"/><circle r="29" fill="none" stroke="#525964" stroke-opacity=".35" stroke-width="1"/><path d="M-7 0H7M0-7V7" stroke="#84909f" stroke-width="1"/>';
  else if (shape === 'shoulder') element = '<rect x="-53" y="-14" width="106" height="28" rx="10" fill="url(#rubber-fill)" stroke="#515d6e"/>';
  else if (shape === 'trigger') element = '<path d="M-33 17V-7q0-16 16-16h34q16 0 16 16v24Z" fill="url(#rubber-fill)" stroke="#515d6e"/>';
  else if (shape === 'dpad') element = '<rect x="-15" y="-15" width="30" height="30" rx="5" fill="url(#rubber-fill)" stroke="#47505f"/>';
  else if (shape === 'axis') element = '<rect x="-21" y="-13" width="42" height="26" rx="7" class="axis-key"/>';
  else if (shape === 'small') element = '<rect x="-23" y="-11" width="46" height="22" rx="10" fill="url(#rubber-fill)" stroke="#616b7b"/>';
  else if (shape === 'touchpad') element = '<rect x="-34" y="-23" width="68" height="46" rx="5" fill="#282f39" stroke="#535c67"/>';
  else if (shape === 'output') element = '<rect x="-43" y="-18" width="86" height="36" rx="8" class="output-key"/>';
  else element = `<circle r="${shape === 'guide' ? 19 : 20}" fill="url(#rubber-fill)" stroke="${input.color || '#74808e'}" stroke-opacity=".6" stroke-width="1.5"/>`;
  let halo = shape === 'shoulder' ? '<rect x="-57" y="-18" width="114" height="36" rx="13"/>' : ['axis','output','small','touchpad','trigger'].includes(shape) ? `<rect x="${shape === 'output' ? -46 : shape === 'trigger' ? -37 : shape === 'touchpad' ? -38 : -25}" y="${shape === 'trigger' ? -27 : shape === 'touchpad' ? -27 : shape === 'output' ? -21 : -16}" width="${shape === 'output' ? 92 : shape === 'trigger' ? 74 : shape === 'touchpad' ? 76 : 50}" height="${shape === 'trigger' ? 48 : shape === 'touchpad' ? 54 : shape === 'output' ? 42 : 32}" rx="9"/>` : `<circle r="${shape === 'stick' ? 41 : shape === 'dpad' ? 22 : shape === 'guide' ? 23 : 24}"/>`;
  return `<g transform="translate(${x} ${y})" class="controller-input ${assigned ? 'is-assigned' : ''} ${selected ? 'is-selected' : ''} ${shape || 'face'}" data-input="${input.id}" tabindex="0" role="button" aria-label="${escapeHtml(label)}" aria-pressed="${selected}"><title>${escapeHtml(label)} · ${input.sdk}</title><rect class="hit-area" x="${shape === 'shoulder' ? -59 : shape === 'output' ? -47 : -23}" y="-23" width="${shape === 'shoulder' ? 118 : shape === 'output' ? 94 : 46}" height="46" fill="transparent"/>${element}<g class="input-halo">${halo}</g>${shape === 'stick' ? `<text y="22" text-anchor="middle" class="stick-label">${input.short}</text>` : `<text y="${shape === 'trigger' ? 2 : 5}" text-anchor="middle" fill="${input.color || '#e1e6ef'}" class="input-text">${input.short}</text>`}${assigned && ['shoulder', undefined, 'output'].includes(shape) ? `<g class="assignment-tag" transform="translate(${shape === 'shoulder' ? (x < 360 ? -116 : 116) : shape === 'output' ? 0 : x > 550 ? 68 : x < 515 ? -70 : 0} ${shape === 'shoulder' ? 0 : shape === 'output' ? 25 : input.id === 'a' ? 39 : input.id === 'y' ? -37 : 0})"><rect x="-44" y="-10" width="88" height="20" rx="5"/><text y="3.5" text-anchor="middle">${escapeHtml(assignmentName(assignment).slice(0, 13))}</text></g>` : ''}</g>`;
}
function quadBody() {
  return `<g filter="url(#body-shadow)"><rect x="247" y="35" width="226" height="135" rx="35" fill="url(#body-fill)" stroke="#57616b" stroke-width="2"/><path d="M330 157v43h60v-43" fill="#212a32" stroke="#5b6570"/><rect x="289" y="192" width="142" height="31" rx="14" fill="#323c44" stroke="#727f87"/><circle cx="318" cy="207" r="7" fill="#11181d"/><circle cx="360" cy="207" r="7" fill="#11181d"/><circle cx="402" cy="207" r="7" fill="#11181d"/><text x="360" y="101" text-anchor="middle" fill="#fff" font-size="21" font-weight="700">QuadStick</text><g fill="#4da8b8"><circle cx="322" cy="130" r="4"/><circle cx="341" cy="130" r="4"/><circle cx="360" cy="130" r="4"/><circle cx="379" cy="130" r="4"/><circle cx="398" cy="130" r="4"/></g></g><path d="M235 208h-39m229 0h57" stroke="#9ba9a3"/><text x="185" y="205" text-anchor="end" class="axis-caption">SIP / PUFF</text><text x="490" y="205" class="axis-caption">MOUTH JOYSTICK + LIP</text><text x="360" y="25" text-anchor="middle" class="axis-caption">PROFILE-DEPENDENT PHYSICAL INPUTS</text><text x="360" y="246" text-anchor="middle" class="axis-caption">CLICK AN EMULATED XBOX OUTPUT TO MAP IT</text>`;
}
