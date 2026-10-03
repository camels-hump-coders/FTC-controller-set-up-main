import { escapeHtml as esc } from './icons.js';
import { assignmentName } from './state.js';
import { photoLayout } from './appearance.js';

export function renderPhotoController(controller, assignments, selectedId) {
  const layout = photoLayout(controller), photo = controller.photo;
  if (!layout) return '';
  const byInput = new Map(assignments.map(a => [a.inputId, a]));
  return `<svg class="controller-svg photo-svg" viewBox="0 0 720 ${layout.viewHeight}" role="group" aria-label="Interactive reference photo of ${esc(controller.name)}" xmlns="http://www.w3.org/2000/svg">
    <svg x="${layout.left}" y="${layout.top}" width="${layout.width}" height="${layout.height}" viewBox="${photo.crop.join(' ')}"><image href="${esc(photo.src)}" x="0" y="0" width="${photo.width}" height="${photo.height}"/></svg>
    <text x="360" y="41" text-anchor="middle" class="photo-note">REAR CONTROLS</text>
    ${layout.axisGroups.map(group => `<g class="photo-axis-group" aria-hidden="true" transform="translate(${group.x} ${group.y})"><rect x="-69" y="-38" width="138" height="61" rx="10"/><text y="-22" text-anchor="middle">${group.side.toUpperCase()} STICK AXES</text></g>`).join('')}
    ${controller.inputs.map(input => {
      const pos = layout.centers[input.id]; if (!pos) return '';
      const mapped = byInput.get(input.id), shoulder = ['trigger','shoulder'].includes(input.shape), axis = input.type === 'axis';
      const small = ['back','start','guide'].includes(input.id), stick = input.shape === 'stick', touch = input.id === 'touchpad';
      const radius = photo.radii?.[input.id] ? photo.radii[input.id] * layout.scale : stick ? 30 : input.shape === 'dpad' ? 15 : small ? 13 : 20;
      const shape = shoulder ? '<rect x="-47" y="-15" width="94" height="30" rx="8"/>' : axis ? '<rect x="-22" y="-14" width="44" height="28" rx="7"/>' : touch ? '<rect x="-79" y="-36" width="158" height="72" rx="7"/>' : `<circle r="${radius}"/>`;
      let tag = '';
      if (mapped && (shoulder || ['a','b','x','y'].includes(input.id))) {
        const offsetX = photo.labelOffsets?.[input.id]?.[0] ?? (shoulder ? (pos.x < 360 ? -112 : 112) : input.id === 'b' ? 83 : input.id === 'x' ? -83 : 0);
        const offsetY = photo.labelOffsets?.[input.id]?.[1] ?? (shoulder ? 0 : input.id === 'a' ? 34 : input.id === 'y' ? -34 : 0);
        tag = `<g class="assignment-tag" transform="translate(${offsetX} ${offsetY})"><rect x="-46" y="-10" width="92" height="20" rx="5"/><text y="3" text-anchor="middle">${esc(assignmentName(mapped).slice(0, 14))}</text></g>`;
      }
      return `<g class="controller-input photo-input ${shoulder || axis ? 'photo-key' : 'photo-hotspot'} ${mapped ? 'is-assigned' : ''} ${input.id === selectedId ? 'is-selected' : ''}" transform="translate(${pos.x} ${pos.y})" data-input="${input.id}" tabindex="0" role="button" aria-label="${esc(input.label)} — ${mapped ? esc(assignmentName(mapped)) : 'unassigned'}" aria-pressed="${input.id === selectedId}"><title>${esc(input.label)} · ${input.sdk}${mapped ? ` · ${esc(assignmentName(mapped))}` : ''}</title><g class="photo-control-surface">${shape}</g><g class="input-halo">${shape}</g>${shoulder || axis ? `<text class="photo-key-label" y="4" text-anchor="middle">${esc(input.short)}</text>` : ''}${tag}</g>`;
    }).join('')}
    <text x="360" y="${layout.viewHeight-6}" text-anchor="middle" class="photo-note">CLICK THE PHOTO · X / Y CHIPS MAP THE STICK AXES</text>
  </svg>`;
}
