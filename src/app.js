import { icon, hydrateIcons, escapeHtml as esc } from './icons.js';
import { CONTROLLERS, controllerById, inputById, inputReference } from './controllers.js';
import { ACTIONS, STORAGE_KEY, LIBRARY_KEY, loadWorkspace, validateState, blankState, starterState, activeAssignments, findAssignment, assignmentName, validHardwareName, uid } from './state.js';
import { renderController } from './graphics.js';
import { renderPhotoController } from './photo-graphics.js';
import { generateJava } from './codegen.js';
import { ControllerTester } from './tester.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { storage = { getItem() { return null; }, setItem() { throw new Error('Storage unavailable'); } }; }
const loaded = loadWorkspace(storage);
let state = loaded.state;
let code = '', toastTimer, testing = false, draft, draftOriginalId = null;
let viewMode = 'photo', viewer = null, viewerPromise = null;
try { viewMode = storage.getItem('ftc-mapper.view') || 'photo'; } catch { /* use reference photo */ }
if (!['photo','diagram','3d'].includes(viewMode)) viewMode = 'photo';
let storageBlocked = Boolean(loaded.error);
const controller = () => controllerById(state.controllerByGamepad[state.activeGamepad]);
const currentInput = () => inputById(controller().id, state.selectedInput);
const currentMappings = () => activeAssignments(state).filter(a => a.gamepad === state.activeGamepad);
const labelGamepad = pad => pad === 'gamepad1' ? 'Gamepad 1' : 'Gamepad 2';

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500); }
function persist() {
  if (storageBlocked) { $('#save-status').innerHTML = `${icon('info')} Export to keep changes`; return; }
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); $('#save-status').innerHTML = '<span class="status-dot"></span> Saved on this device'; }
  catch { $('#save-status').innerHTML = `${icon('info')} Export to keep changes`; }
}
function newDraft() {
  const existing = findAssignment(state);
  draftOriginalId = existing?.id || null;
  const input = currentInput();
  draft = existing ? { ...existing } : { id: uid(), controllerId: controller().id, gamepad: state.activeGamepad, inputId: input.id, action: input.type === 'axis' ? 'Raise arm' : 'Run intake', customName: '', behavior: input.type === 'axis' ? 'analog' : input.type === 'trigger' ? 'trigger' : 'button', hardwareId: '', value: 1, offValue: 0, threshold: 0.2, deadzone: 0.05, invert: input.id.endsWith('_y') };
}
function refresh({ editor = true, save = true } = {}) {
  $('#configuration-name').textContent = state.name;
  $('#controller-select').innerHTML = CONTROLLERS.map(c => `<option value="${c.id}" ${c.id === controller().id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  document.querySelectorAll('[data-gamepad]').forEach(button => { const active = button.dataset.gamepad === state.activeGamepad; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-mode]').forEach(button => { const active = button.dataset.mode === state.mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  renderVisualization();
  $('#controller-note').textContent = controller().note;
  $('#all-inputs').innerHTML = controller().inputs.map(input => `<button class="input-chip ${findAssignment(state, input.id) ? 'mapped' : ''} ${input.id === state.selectedInput ? 'selected' : ''}" data-select-input="${input.id}">${esc(input.label)} ${findAssignment(state, input.id) ? icon('check') : ''}</button>`).join('');
  if (editor) { newDraft(); renderEditor(); }
  renderMappings(); renderHardware();
  code = generateJava(state); renderCode();
  if (save) persist();
}
function renderCode() {
  $('#generated-code').innerHTML = code.split('\n').map((line, i) => `<span class="code-line"><span class="line-number" aria-hidden="true">${i + 1}</span><span>${highlight(line)}</span></span>`).join('');
}
function renderVisualization() {
  const model = controller();
  const effectiveView = viewMode === 'photo' && !model.photo ? 'diagram' : viewMode;
  document.querySelectorAll('[data-view]').forEach(button => { const active=button.dataset.view===effectiveView;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.disabled=button.dataset.view==='photo'&&!model.photo; });
  $('#view-description').textContent=effectiveView==='photo'?'CALIBRATED TO YOUR REFERENCE':effectiveView==='3d'?'EXPLORE EVERY ANGLE':'EVERY INPUT, EXPLAINED';
  $('.diagram-stage').classList.toggle('photo-stage',effectiveView==='photo');
  $('#controller-diagram').hidden=effectiveView==='3d';$('#three-container').hidden=effectiveView!=='3d';
  if(effectiveView!=='3d') { viewer?.setActive(false);$('#controller-diagram').innerHTML=effectiveView==='photo'?renderPhotoController(model,currentMappings(),state.selectedInput):renderController(model,currentMappings(),state.selectedInput); }
  else {
    $('.three-reference').hidden=!model.photo;
    if(model.photo)$('#three-reference-image').src=model.photo.src;
    $('.three-model-note').textContent=model.family==='quadstick'?'Profile-dependent physical model. Use All inputs below to map emulated Xbox outputs.':'Illustrative 3D geometry based on the front reference. Side and rear details are approximated.';
    if(model.family==='quadstick') { $('#all-inputs').hidden=false;$('#all-inputs-toggle').setAttribute('aria-expanded','true'); }
    if(viewer) { viewer.setController(model,currentMappings(),state.selectedInput);viewer.setActive(true);$('#auto-rotate').setAttribute('aria-pressed',String(viewer.autoRotate)); }
    else if(!viewerPromise) {
      $('#three-loading').hidden=false;
      viewerPromise=import('./viewer3d.js').then(({ControllerViewer3D})=>{
        viewer=new ControllerViewer3D($('#three-host'),id=>chooseInput(id,matchMedia('(max-width: 760px)').matches),show3DError);
        $('#three-loading').hidden=true;renderVisualization();
      }).catch(()=>{ $('#three-loading').hidden=true;show3DError('3D needs WebGL 2, which is unavailable in this browser. Photo and Diagram views remain fully interactive.'); });
    }
  }
}
function show3DError(message){$('#three-error').textContent=message;$('#three-error').hidden=false;$('.three-tools').hidden=true;}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{viewMode=button.dataset.view;try{storage.setItem('ftc-mapper.view',viewMode);}catch{/* keep in memory */}renderVisualization();}));
$('#rotate-left').addEventListener('click',()=>viewer?.rotate(.4));
$('#rotate-right').addEventListener('click',()=>viewer?.rotate(-.4));
$('#zoom-in').addEventListener('click',()=>viewer?.zoom(.85));
$('#zoom-out').addEventListener('click',()=>viewer?.zoom(1.15));
$('#reset-3d').addEventListener('click',()=>{viewer?.reset();$('#auto-rotate').setAttribute('aria-pressed','false');});
$('#auto-rotate').addEventListener('click',()=>{if(!viewer)return;viewer.setAutoRotate(!viewer.autoRotate);$('#auto-rotate').setAttribute('aria-pressed',String(viewer.autoRotate));});
function highlight(line) {
  if (line.trimStart().startsWith('//')) return `<span class="syntax-comment">${esc(line)}</span>`;
  return line.split(/("(?:\\.|[^"\\])*"|\b(?:package|import|public|private|class|extends|void|boolean|false|true|if|else|while|try|finally|double)\b|@\w+|\b\d+(?:\.\d+)?\b)/g).map(token => /^"/.test(token) ? `<span class="syntax-string">${esc(token)}</span>` : /^(?:package|import|public|private|class|extends|void|boolean|false|true|if|else|while|try|finally|double)$/.test(token) ? `<span class="syntax-keyword">${token}</span>` : /^@/.test(token) ? `<span class="syntax-annotation">${esc(token)}</span>` : /^\d/.test(token) ? `<span class="syntax-number">${token}</span>` : esc(token)).join('');
}

function renderEditor() {
  const input = currentInput(), ref = inputReference(input), h = state.hardware.find(h => h.id === draft.hardwareId), servo = h?.type === 'Servo';
  const boolean = input.type === 'boolean';
  const supported = state.hardware.filter(h => boolean || h.type !== 'Servo');
  const behaviors = boolean ? [['button', 'While pressed'], ['toggle', 'Toggle on / off']] : [[input.type === 'axis' ? 'analog' : 'trigger', input.type === 'axis' ? 'Analog axis' : 'Proportional trigger']];
  $('#assignment-editor').innerHTML = `<div class="selected-input"><span class="input-symbol ${input.id === 'right_bumper' ? 'wide' : ''}">${esc(input.short)}</span><div><h3>${esc(input.label)}</h3><span class="type-tag">${input.type === 'axis' ? 'ANALOG AXIS' : input.type === 'trigger' ? 'ANALOG TRIGGER' : 'BUTTON INPUT'}</span></div><span class="selected-dot"></span></div>
    <form id="assignment-form">
      <label class="field-label" for="assignment-gamepad">Assigned gamepad</label><div class="gamepad-choice"><select id="assignment-gamepad" name="gamepad"><option value="gamepad1" ${draft.gamepad === 'gamepad1' ? 'selected' : ''}>Gamepad 1 · Driver</option><option value="gamepad2" ${draft.gamepad === 'gamepad2' ? 'selected' : ''}>Gamepad 2 · Operator</option></select></div>
      <div class="sdk-line"><span class="sdk-label">SDK</span><code id="editor-sdk">${draft.gamepad}.${input.sdk}</code><span class="sdk-type">${ref.type}</span></div>
      <div class="form-row"><label>Robot action<select name="action" id="action-select">${ACTIONS.map(action => `<option ${action === draft.action ? 'selected' : ''}>${esc(action)}</option>`).join('')}</select></label><label>Behavior<select name="behavior" id="behavior-select">${behaviors.map(([value, label]) => `<option value="${value}" ${draft.behavior === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
      <label>Custom label <span class="optional-text">optional</span><input name="customName" maxlength="60" placeholder="e.g. Intake" value="${esc(draft.customName)}" /></label>
      <div class="form-row"><label>Robot hardware<select name="hardwareId" id="assignment-hardware"><option value="">Code placeholder</option>${supported.map(h => `<option value="${esc(h.id)}" ${draft.hardwareId === h.id ? 'selected' : ''}>${esc(h.name)} · ${h.type}</option>`).join('')}</select></label><label>${servo ? 'Position' : input.type === 'boolean' ? 'Power' : 'Power scale'}<input name="value" type="number" min="${servo ? 0 : -1}" max="1" step="0.05" value="${draft.value}" required /></label></div>
      ${draft.behavior === 'toggle' ? `<div class="form-row"><label>Off ${servo ? 'position' : 'power'}<input name="offValue" type="number" min="${servo ? 0 : -1}" max="1" step="0.05" value="${draft.offValue}" required /></label><p class="microcopy">A toggle remembers on/off state. Each new press changes it once.</p></div>` : ''}
      ${input.type === 'trigger' ? `<label>Activation threshold <span class="optional-text">0–1</span><input name="threshold" type="number" min="0" max="1" step="0.05" value="${draft.threshold}" required /></label>` : ''}
      ${input.type === 'axis' ? `<div class="form-row axis-options"><label>Deadzone<input name="deadzone" type="number" min="0" max="0.95" step="0.01" value="${draft.deadzone}" required /></label><label class="checkbox-label"><input name="invert" type="checkbox" ${draft.invert ? 'checked' : ''} /> Invert axis</label></div>` : ''}
      <div class="reference-note">${icon('lightbulb')}<p>${input.type !== 'boolean' ? `<strong class="reference-range">Range: ${ref.range}</strong> ` : ''}${esc(ref.description)}${input.note ? ` ${esc(input.note)}` : ''}${!draft.hardwareId ? ' Select hardware to generate a working mechanism command; a placeholder only reports telemetry.' : ''}</p></div>
      <p id="assignment-error" class="form-error" role="alert"></p>
      <div class="editor-actions"><button class="button primary" type="submit">${icon('check')} ${draftOriginalId ? 'Update assignment' : 'Add assignment'}</button>${draftOriginalId ? `<button type="button" class="icon-button button" id="remove-current" aria-label="Remove assignment" title="Remove assignment">${icon('trash')}</button><button type="button" class="icon-button button" id="prioritize-current" aria-label="Make highest priority" title="Make highest priority">${icon('arrow-up')}</button>` : ''}</div>
      <p class="editor-footnote">${draftOriginalId ? 'Changes apply when you update this assignment.' : 'Click an input. Give it a job. Make it yours.'}</p>
    </form>`;
}
function readDraft() {
  const form = $('#assignment-form'), data = new FormData(form);
  const next = { ...draft };
  for (const key of ['gamepad', 'action', 'behavior', 'customName', 'hardwareId']) next[key] = String(data.get(key));
  for (const key of ['value', 'offValue', 'threshold', 'deadzone']) if (data.has(key)) next[key] = data.get(key) === '' ? NaN : Number(data.get(key));
  if (currentInput().type === 'axis') next.invert = data.has('invert');
  return next;
}
function chooseInput(inputId, focus = false) {
  state.selectedInput = inputId; refresh();
  if (focus) { $('.assignment-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); $('#assignment-gamepad').focus({ preventScroll: true }); }
}
function renderMappings() {
  const assignments = activeAssignments(state);
  $('#assignment-count').textContent = assignments.length;
  $('#mapping-empty').hidden = assignments.length !== 0;
  $('#assignment-table').innerHTML = assignments.map(a => {
    const input = inputById(a.controllerId, a.inputId);
    return `<tr><td><button class="mapping-input" data-edit="${esc(a.id)}"><span class="table-input-icon">${esc(input.short)}</span><span><strong>${esc(input.label)}</strong><code>${a.gamepad}.${input.sdk}</code></span></button></td><td><span class="gamepad-badge ${a.gamepad === 'gamepad2' ? 'operator' : ''}">GP ${a.gamepad.slice(-1)}</span></td><td><span class="action-label ${a.behavior === 'toggle' ? 'purple' : a.behavior === 'analog' ? 'blue' : a.value < 0 ? 'amber' : ''}"><span></span>${esc(assignmentName(a))}</span><small class="action-detail">${a.behavior === 'toggle' ? 'Toggle' : a.behavior === 'analog' ? 'Analog' : a.behavior === 'trigger' ? 'Trigger' : 'While pressed'} · ${esc(state.hardware.find(h => h.id === a.hardwareId)?.name || 'placeholder')}</small></td><td><div class="row-actions"><button class="icon-button" data-edit="${esc(a.id)}" aria-label="Edit ${esc(assignmentName(a))}">${icon('edit')}</button><button class="icon-button delete-button" data-delete="${esc(a.id)}" aria-label="Delete ${esc(assignmentName(a))}">${icon('trash')}</button></div></td></tr>`;
  }).join('');
}
function renderHardware() {
  $('#hardware-count').textContent = `${state.hardware.length} devices`;
  $('#hardware-list').innerHTML = state.hardware.map(h => `<div class="hardware-row"><span class="hardware-type-icon">${icon('cpu')}</span><div><strong>${esc(h.name)}</strong><span>${h.type}</span></div><span class="hardware-used">${state.assignments.filter(a => a.hardwareId === h.id).length} mappings</span><button class="icon-button" data-edit-hardware="${esc(h.id)}" aria-label="Edit ${esc(h.name)}">${icon('edit')}</button><button class="icon-button" data-remove-hardware="${esc(h.id)}" aria-label="Remove ${esc(h.name)}">${icon('trash')}</button></div>`).join('') || '<p class="empty-hardware">Add a motor or servo to connect your mappings to real hardware.</p>';
}
function saveAssignment(event) {
  event.preventDefault();
  const next = readDraft(); next.customName = next.customName.trim();
  // Changing the destination gamepad uses that gamepad's selected physical model.
  next.controllerId = state.controllerByGamepad[next.gamepad];
  if (!inputById(next.controllerId, next.inputId)) { $('#assignment-error').textContent = 'This input is not available on the other gamepad’s selected controller.'; return; }
  const duplicate = state.assignments.find(a => a.id !== draftOriginalId && a.gamepad === next.gamepad && a.controllerId === next.controllerId && a.inputId === next.inputId);
  if (duplicate) { $('#assignment-error').textContent = 'That gamepad input already has an assignment. Edit or remove it in the mapping table first.'; return; }
  const nextState = structuredClone(state);
  const index = nextState.assignments.findIndex(a => a.id === draftOriginalId);
  if (index >= 0) nextState.assignments[index] = next; else nextState.assignments.push(next);
  nextState.activeGamepad = next.gamepad;
  try { state = validateState(nextState); refresh(); toast(`${assignmentName(next)} mapped to ${labelGamepad(next.gamepad)}.`); }
  catch (error) { $('#assignment-error').textContent = error.message; }
}
function deleteAssignment(id) { const removed = state.assignments.find(a => a.id === id); state.assignments = state.assignments.filter(a => a.id !== id); refresh(); toast(`${assignmentName(removed)} removed.`); }

$('#controller-select').addEventListener('change', event => { state.controllerByGamepad[state.activeGamepad] = event.target.value; if (!currentInput()) state.selectedInput = 'right_bumper'; refresh(); toast('Controller changed. Each model keeps its own assignments.'); });
document.querySelectorAll('[data-gamepad]').forEach(button => button.addEventListener('click', () => { state.activeGamepad = button.dataset.gamepad; if (!currentInput()) state.selectedInput = 'right_bumper'; refresh(); }));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; refresh({ editor: false }); }));
$('#controller-diagram').addEventListener('click', event => { const input = event.target.closest('[data-input]'); if (input) chooseInput(input.dataset.input, matchMedia('(max-width: 760px)').matches); });
$('#controller-diagram').addEventListener('keydown', event => { const input = event.target.closest('[data-input]'); if (input && ['Enter', ' '].includes(event.key)) { event.preventDefault(); chooseInput(input.dataset.input, true); } });
$('#all-inputs').addEventListener('click', event => { const button = event.target.closest('[data-select-input]'); if (button) chooseInput(button.dataset.selectInput, true); });
$('#all-inputs-toggle').addEventListener('click', () => { const show = $('#all-inputs').hidden; $('#all-inputs').hidden = !show; $('#all-inputs-toggle').setAttribute('aria-expanded', String(show)); });
$('#assignment-editor').addEventListener('submit', saveAssignment);
$('#assignment-editor').addEventListener('change', event => {
  if (event.target.name === 'gamepad') { draft = readDraft(); $('#editor-sdk').textContent = `${draft.gamepad}.${currentInput().sdk}`; }
  if (['behavior', 'hardwareId', 'action'].includes(event.target.name)) {
    draft = readDraft();
    if (event.target.name === 'action') {
      const preferred = /claw/i.test(draft.action) ? state.hardware.find(h => h.type === 'Servo') : /arm|hang|reset/i.test(draft.action) ? state.hardware.find(h => h.name.toLowerCase().includes('arm') && h.type !== 'Servo') : state.hardware.find(h => h.name.toLowerCase().includes('intake') && h.type !== 'Servo');
      if (preferred && (currentInput().type === 'boolean' || preferred.type !== 'Servo')) draft.hardwareId = preferred.id;
      draft.value = draft.action === 'Open claw' ? 0.8 : draft.action === 'Close claw' ? 0.2 : ['Reverse intake', 'Lower arm'].includes(draft.action) ? -1 : 1;
    }
    if (state.hardware.find(h => h.id === draft.hardwareId)?.type === 'Servo') { draft.value = Math.max(0, draft.value); draft.offValue = Math.max(0, draft.offValue); }
    renderEditor();
    $(`[name="${event.target.name}"]`)?.focus();
  }
});
$('#assignment-editor').addEventListener('click', event => {
  if (event.target.closest('#remove-current')) deleteAssignment(draftOriginalId);
  if (event.target.closest('#prioritize-current')) { const current = state.assignments.find(a => a.id === draftOriginalId); state.assignments = [current, ...state.assignments.filter(a => a.id !== current.id)]; refresh(); toast('Moved to highest priority.'); }
});
$('#assignment-table').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (edit) { const a = state.assignments.find(a => a.id === edit.dataset.edit); state.activeGamepad = a.gamepad; chooseInput(a.inputId, true); }
  if (remove) deleteAssignment(remove.dataset.delete);
});
$('#add-mapping').addEventListener('click', () => { const next = controller().inputs.find(input => !findAssignment(state, input.id)); chooseInput(next?.id || state.selectedInput, true); });
$('#hardware-toggle').addEventListener('click', () => { const show = $('#hardware-content').hidden; $('#hardware-content').hidden = !show; $('#hardware-toggle').setAttribute('aria-expanded', String(show)); });
$('#hardware-form').addEventListener('submit', event => {
  event.preventDefault(); const form = new FormData(event.target), name = String(form.get('name')).trim();
  if (!validHardwareName(name) || state.hardware.some(h => h.name === name)) { $('#hardware-error').textContent = 'Use a unique Java name: letters, digits, and underscores. Avoid Java keywords, SDK fields, and the mapper_ prefix.'; return; }
  if (state.hardware.length >= 30) { $('#hardware-error').textContent = 'This configuration has reached the 30-device limit.'; return; }
  state.hardware.push({ id: uid(), name, type: String(form.get('type')) }); $('#hardware-error').textContent = ''; event.target.reset(); refresh(); toast(`${name} added to robot hardware.`);
});
$('#hardware-list').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-hardware]'), edit = event.target.closest('[data-edit-hardware]');
  if (remove) {
    const h = state.hardware.find(h => h.id === remove.dataset.removeHardware), used = state.assignments.some(a => a.hardwareId === h.id);
    if (used) { $('#hardware-error').textContent = `${h.name} is used by a mapping. Change or delete its mappings before removing this hardware (including saved mappings for other controller models).`; return; }
    state.hardware = state.hardware.filter(item => item.id !== h.id); $('#hardware-error').textContent = ''; refresh(); toast(`${h.name} removed.`);
  }
  if (edit) editHardware(edit.dataset.editHardware);
});
function editHardware(id) {
  const h = state.hardware.find(h => h.id === id);
  openModal('Edit robot hardware', `<form id="edit-hardware-form"><label>Configuration name<input name="name" value="${esc(h.name)}" required maxlength="40" /></label><label>Hardware type<select name="type">${['DcMotor', 'Servo', 'CRServo'].map(type => `<option ${type === h.type ? 'selected' : ''}>${type}</option>`).join('')}</select></label><p class="microcopy">Renaming updates every mapping. Type changes must be compatible with existing actions.</p><p id="edit-hardware-error" class="form-error" role="alert"></p><button class="button primary">Save hardware</button></form>`);
  $('#edit-hardware-form').addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.target), next = structuredClone(state), hardware = next.hardware.find(h => h.id === id); hardware.name = String(data.get('name')).trim(); hardware.type = String(data.get('type'));
    try { state = validateState(next); closeModal(); refresh(); toast('Hardware updated.'); } catch (error) { $('#edit-hardware-error').textContent = error.message; }
  });
}

function download(text, filename, type) { const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('#export-json').addEventListener('click', () => { download(JSON.stringify(state, null, 2), `${state.name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase() || 'ftc-mapping'}.json`, 'application/json'); toast('Configuration exported.'); });
$('#download-java').addEventListener('click', () => { download(code, 'MappedTeleOp.java', 'text/x-java-source'); toast('MappedTeleOp.java downloaded.'); });
$('#copy-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(code); toast('Java code copied to clipboard.'); }
  catch {
    openModal('Copy generated Java', `<p>Clipboard access is unavailable. Select and copy the code below.</p><textarea id="copy-fallback" class="copy-fallback" readonly aria-label="Java code to copy">${esc(code)}</textarea>`); $('#copy-fallback').select();
  }
});
$('#import-json').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error('Use a configuration smaller than 1 MB.');
    const imported = validateState(JSON.parse(await file.text()));
    // Keep a recovery copy of the current workspace before replacing it.
    archiveCurrent('Before import'); state = imported; storageBlocked = false; refresh(); toast('Configuration imported. Previous workspace is in Configurations.');
  } catch (error) { toast(`Import failed: ${error.message}`); }
  event.target.value = '';
});
function readLibrary() { const raw = storage.getItem(LIBRARY_KEY); if (!raw) return []; const data = JSON.parse(raw); if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.state)) throw new Error('Saved library is unreadable. Export your current workspace to keep it.'); return data; }
function archiveCurrent(prefix) { const library = readLibrary(); library.push({ id: uid(), name: `${prefix}: ${state.name}`, savedAt: new Date().toISOString(), state: structuredClone(state) }); storage.setItem(LIBRARY_KEY, JSON.stringify(library)); }
function openModal(title, html) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); }
function closeModal() { $('#modal').close(); }
$('#close-modal').addEventListener('click', closeModal);
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const box = $('#modal').getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeModal(); } });
function showConfigurations() {
  let library;
  try { library = readLibrary(); } catch (error) { toast(error.message); return; }
  openModal('Your configurations', `<p class="muted">Saved on this browser and device. Export JSON to share with your team or move to another device.</p><form id="save-config-form"><label>Configuration name<input name="name" required maxlength="80" value="${esc(state.name)}" /></label><button class="button primary" type="submit">${icon('folder')} Save a snapshot</button></form><div class="saved-list">${library.length ? library.map(item => `<div class="saved-item"><div><strong>${esc(item.name)}</strong><small>${esc(new Date(item.savedAt).toLocaleString())}</small></div><button class="button" data-load-config="${esc(item.id)}">Load</button><button class="icon-button" data-delete-config="${esc(item.id)}" aria-label="Delete saved ${esc(item.name)}">${icon('trash')}</button></div>`).join('') : '<p>No snapshots yet. Your current workspace is saved automatically.</p>'}</div><div class="button-row"><button class="button" id="new-config">${icon('plus')} Blank workspace</button><button class="text-button" id="starter-config">Load starter example</button></div><p id="config-error" class="form-error" role="alert"></p>`);
  $('#save-config-form').addEventListener('submit', event => {
    event.preventDefault();
    try { const name = String(new FormData(event.target).get('name')).trim(); if (!name) throw new Error('Give the configuration a name.'); const saved = validateState({ ...state, name }); const library = readLibrary(); library.push({ id: uid(), name, savedAt: new Date().toISOString(), state: saved }); storage.setItem(LIBRARY_KEY, JSON.stringify(library)); state = saved; storageBlocked = false; persist(); showConfigurations(); toast('Configuration snapshot saved.'); }
    catch (error) { $('#config-error').textContent = `Could not save: ${error.message}. You can export JSON instead.`; }
  });
  $('#new-config').addEventListener('click', () => replaceWorkspace(blankState(), 'Before new workspace'));
  $('#starter-config').addEventListener('click', () => replaceWorkspace(starterState(), 'Before starter example'));
  $('#modal-body').onclick = event => {
    const load = event.target.closest('[data-load-config]'), remove = event.target.closest('[data-delete-config]');
    if (load) { try { const item = readLibrary().find(item => item.id === load.dataset.loadConfig); replaceWorkspace(validateState(item.state), 'Before loading'); } catch (error) { $('#config-error').textContent = error.message; } }
    if (remove) { try { storage.setItem(LIBRARY_KEY, JSON.stringify(readLibrary().filter(item => item.id !== remove.dataset.deleteConfig))); showConfigurations(); } catch { $('#config-error').textContent = 'Browser storage could not be updated.'; } }
  };
}
function replaceWorkspace(next, recoveryName) { try { archiveCurrent(recoveryName); state = next; storageBlocked = false; closeModal(); refresh(); toast('Workspace loaded. Previous workspace saved in Configurations.'); } catch (error) { $('#config-error').textContent = `Could not keep a recovery copy: ${error.message}`; } }
$('#configurations').addEventListener('click', showConfigurations);
function showHelp() {
  openModal('From input to action', `<div class="help-steps"><div><span>01</span><section><h3>Pick your controller</h3><p>Choose Gamepad 1 or 2 and its physical model. Each gamepad can use a different controller. Assignments stay with that model when you switch.</p></section></div><div><span>02</span><section><h3>Give an input a job</h3><p>Click a control, choose an action and hardware, then save the assignment. The X/Y chips below a stick map its axes; L3/R3 map the stick click. “Open claw” and “Reset arm” are labels: choose the actual position or power your mechanism needs. Reset arm does not automatically home or reset an encoder.</p></section></div><div><span>03</span><section><h3>Make the code yours</h3><p>Copy or download MappedTeleOp.java into TeamCode. Match hardware names to the robot configuration, then review power, direction, servo positions, and limits. A placeholder generates telemetry and a TODO until you add hardware.</p></section></div></div><div class="help-callout"><strong>Know your input</strong><p><b>Buttons:</b> true while pressed. <b>Sticks:</b> −1 to 1, with negative Y when pushed forward. <b>Triggers:</b> 0 to 1. <b>Toggles:</b> store state so one press changes on/off once.</p><p>When mappings share hardware, the first active row wins. Select a mapping and use the up arrow to move it to the top. If no input is active, motors stop; servos hold position. A toggle’s off value is used as the fallback (the first toggle wins if there are several).</p></div><p>Gamepad 1 is usually the driver and Gamepad 2 the operator; these roles are entirely your choice. Guide/Home and browser mappings may differ from the Driver Station. QuadStick gestures depend on the device’s profile.</p><div class="help-links"><a target="_blank" rel="noopener noreferrer" href="https://javadoc.io/doc/org.firstinspires.ftc/RobotCore/latest/com/qualcomm/robotcore/hardware/Gamepad.html">FTC SDK Gamepad reference ${icon('arrow-up-right')}</a><a target="_blank" rel="noopener noreferrer" href="https://ftc-docs.firstinspires.org/en/latest/robot_building/best_practices/robot-best-practices.html#gamepad-best-practices">FIRST controller guidance ${icon('arrow-up-right')}</a><a target="_blank" rel="noopener noreferrer" href="https://www.quadstick.com/documentation">QuadStick profile documentation ${icon('arrow-up-right')}</a></div>`);
}
$('#quick-start').addEventListener('click', showHelp); $('#learn-basics').addEventListener('click', showHelp);

const tester = new ControllerTester(updateTester);
$('#test-toggle').addEventListener('click', () => {
  testing = !testing; $('#test-toggle').setAttribute('aria-pressed', String(testing)); $('#test-toggle').classList.toggle('testing', testing); $('#tester-panel').hidden = !testing;
  if (testing) tester.start(controller); else { tester.stop(); document.querySelectorAll('.is-live').forEach(el => el.classList.remove('is-live')); viewer?.setLive([]); $('#diagram-caption').textContent = 'CLICK AN INPUT TO MAP IT'; }
});
$('#physical-gamepad').addEventListener('change', event => { tester.slot = Number(event.target.value); });
function updateTester({ error, pads = [], selected, sample }) {
  const select = $('#physical-gamepad');
  const options = pads.map(pad => `<option value="${pad.index}">${esc(pad.id)} (browser slot ${pad.index})</option>`).join('');
  if (select.dataset.options !== options) { select.innerHTML = options; select.dataset.options = options; }
  if (selected) select.value = selected.index;
  select.hidden = !pads.length;
  document.querySelectorAll('.is-live').forEach(el => el.classList.remove('is-live'));
  viewer?.setLive(sample?.standard ? sample.inputs.filter(input=>input.active).map(input=>input.id) : []);
  $('#diagram-caption').textContent = selected ? 'LIVE CONTROLLER INPUT' : 'CLICK AN INPUT TO MAP IT';
  if (error || !selected) { $('#tester-status').textContent = error || 'Connect a controller, then press a button to make it visible to your browser. No controller is needed to create mappings.'; $('#tester-values').innerHTML = ''; return; }
  $('#tester-status').textContent = sample.standard ? 'Connected · Browser standard mapping. Confirm the same inputs on your FTC Driver Station.' : 'Connected · Nonstandard mapping. Showing raw channels; virtual highlights are disabled to avoid guessing the FTC mapping.';
  if (sample.standard) {
    sample.inputs.forEach(input => { if (input.active) document.querySelector(`[data-input="${input.id}"]`)?.classList.add('is-live'); });
    $('#tester-values').innerHTML = sample.inputs.filter(input => input.type !== 'boolean' || input.active).map(input => `<div class="tester-value ${input.active ? 'active' : ''}"><span>${esc(input.label)}</span><code>${input.type === 'boolean' ? 'PRESSED' : input.value.toFixed(2)}</code></div>`).join('') + (!sample.inputs.some(i => i.type === 'boolean' && i.active) ? '<div class="tester-value"><span>Buttons / D-pad</span><code>RELEASED</code></div>' : '');
  } else $('#tester-values').innerHTML = [...sample.rawButtons, ...sample.rawAxes].map(input => `<div class="tester-value"><span>${input.label}</span><code>${input.value.toFixed(2)}</code></div>`).join('');
}
window.addEventListener('pagehide', () => {tester.stop();viewer?.setActive(false);});
window.addEventListener('pageshow', () => { if (testing) tester.start(controller);if(viewMode==='3d')viewer?.setActive(true); });

function setTheme(theme) { document.documentElement.dataset.theme = theme; $('#theme-toggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon'); $('#theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`); }
let theme; try { theme = storage.getItem('ftc-mapper.theme'); } catch { /* use system theme */ }
setTheme(theme === 'dark' || theme === 'light' ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('#theme-toggle').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(next); try { storage.setItem('ftc-mapper.theme', next); } catch { /* in-memory theme still works */ } });
hydrateIcons(); refresh({ save: !loaded.error });
if (loaded.error) { persist(); toast(loaded.error); }
