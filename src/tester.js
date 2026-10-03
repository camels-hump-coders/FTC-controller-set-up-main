// The browser's standard mapping is not the FTC USB driver mapping.
// Unknown mappings are deliberately shown as raw channels, without diagram guesses.
export function sampleGamepad(pad, controller) {
  const rawButtons = Array.from(pad.buttons, (button, i) => ({ label: `B${i}`, value: button.value, pressed: button.pressed }));
  const rawAxes = Array.from(pad.axes, (value, i) => ({ label: `Axis ${i}`, value }));
  if (pad.mapping !== 'standard') return { standard: false, inputs: [], rawButtons, rawAxes };
  return { standard: true, rawButtons, rawAxes, inputs: controller.inputs.map(input => ({
    id: input.id, label: input.label, type: input.type,
    value: input.type === 'axis' ? (pad.axes[input.browserAxis] ?? 0) : (pad.buttons[input.browserButton]?.value ?? 0),
    active: input.type === 'axis' ? Math.abs(pad.axes[input.browserAxis] ?? 0) > 0.1 : (pad.buttons[input.browserButton]?.value ?? 0) > 0.1,
  })) };
}
export class ControllerTester {
  constructor(onUpdate) { this.onUpdate = onUpdate; this.running = false; this.slot = null; this.frame = null; this.lastTime = 0; }
  start(getController) {
    this.stop();
    if (typeof navigator.getGamepads !== 'function') { this.onUpdate({ error: 'Gamepad API is unavailable in this browser. The interactive mapper still works without a controller.' }); return; }
    this.running = true;
    const tick = time => {
      if (!this.running) return;
      if (time - this.lastTime > 60) {
        this.lastTime = time;
        try {
          const pads = Array.from(navigator.getGamepads()).filter(p => p && p.connected);
          const selected = pads.find(p => p.index === this.slot) || pads[0];
          this.slot = selected?.index ?? null;
          this.onUpdate({ pads, selected, sample: selected ? sampleGamepad(selected, getController()) : null });
        } catch { this.onUpdate({ error: 'This browser blocked controller access. Try HTTPS in a browser that supports the Gamepad API. You can keep mapping manually.' }); this.running = false; return; }
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop() { this.running = false; if (this.frame !== null) cancelAnimationFrame(this.frame); }
}
