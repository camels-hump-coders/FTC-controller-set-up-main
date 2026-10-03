import { activeAssignments, assignmentName, validateState } from './state.js';
import { inputById } from './controllers.js';

const decimal = number => Number.isInteger(number) ? `${number}.0` : String(number);
const comment = text => String(text).replace(/[\r\n\u2028\u2029]/g, ' ').replace(/\\/g, '/');
const javaString = text => JSON.stringify(String(text)).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function generateJava(rawState) {
  const state = validateState(rawState);
  const assignments = activeAssignments(state);
  const beginner = state.mode === 'beginner';
  const indexed = assignments.map((a, i) => ({ ...a, index: i, input: inputById(a.controllerId, a.inputId) }));
  const toggles = indexed.filter(a => a.behavior === 'toggle');
  const motors = state.hardware.filter(h => h.type !== 'Servo');
  const lines = [], add = (line = '') => lines.push(line);
  const sdk = a => `${a.gamepad}.${a.input.sdk}`;
  const condition = a => a.behavior === 'toggle' ? `mapper_on${a.index}` : a.behavior === 'analog' ? `Math.abs(${sdk(a)}) > ${decimal(a.deadzone)}` : a.behavior === 'trigger' ? `${sdk(a)} > ${decimal(a.threshold)}` : sdk(a);
  const output = a => ['analog', 'trigger'].includes(a.behavior) ? `${a.invert ? '-' : ''}${sdk(a)} * ${decimal(a.value)}` : decimal(a.value);

  add('package org.firstinspires.ftc.teamcode;'); add();
  add('import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;');
  add('import com.qualcomm.robotcore.eventloop.opmode.TeleOp;');
  for (const type of [...new Set(state.hardware.map(h => h.type))].sort()) add(`import com.qualcomm.robotcore.hardware.${type};`);
  add();
  add(`// ${comment(state.name)} | Generated with FTC Controller Mapper`);
  add('// Verify controller mappings, hardware names, directions, and mechanical limits.');
  add('// This starting point does not implement arm limits, encoders, or a full drivetrain.');
  add('@TeleOp(name = "Mapped TeleOp", group = "Controller Mapper")');
  add('public class MappedTeleOp extends LinearOpMode {');
  for (const h of state.hardware) add(`    private ${h.type} ${h.name};`);
  if (toggles.length) {
    if (beginner) add('    // Remember toggle state and the previous button value between loop iterations.');
    for (const a of toggles) { add(`    private boolean mapper_on${a.index} = false;`); add(`    private boolean mapper_last${a.index} = false;`); }
  }
  add(); add('    @Override'); add('    public void runOpMode() {');
  if (beginner && state.hardware.length) add('        // Names must match the robot configuration exactly (including case).');
  for (const h of state.hardware) add(`        this.${h.name} = hardwareMap.get(${h.type}.class, ${javaString(h.name)});`);
  for (const h of motors) add(`        this.${h.name}.setPower(0.0);`);
  if (state.hardware.length) add();
  add('        telemetry.addLine("Mapped controls ready. Press PLAY to start.");');
  add('        telemetry.update();');
  if (beginner) add('        // Wait for the driver to press PLAY on the Driver Station.');
  add('        waitForStart();'); add();
  add('        try {'); add('            while (opModeIsActive()) {');
  if (beginner) for (const line of controls()) add(`                ${line}`.trimEnd());
  else add('                updateControls();');
  add('                telemetry.update();'); add('                idle();');
  add('            }'); add('        } finally {');
  if (beginner) add('            // Stop powered mechanisms when the OpMode exits, even after an error.');
  if (motors.length) for (const h of motors) add(`            this.${h.name}.setPower(0.0);`);
  else add('            // Positional servos keep their last commanded position.');
  add('        }'); add('    }');
  if (!beginner) { add(); add('    private void updateControls() {'); for (const line of controls()) add(`        ${line}`.trimEnd()); add('    }'); }
  add('}');
  return lines.join('\n') + '\n';

  function controls() {
    const body = [];
    for (const a of toggles) {
      if (beginner) body.push(`// ${comment(assignmentName(a))}: change state once per press (rising edge).`);
      body.push(`if (${sdk(a)} && !mapper_last${a.index}) {`, `    mapper_on${a.index} = !mapper_on${a.index};`, '}', `mapper_last${a.index} = ${sdk(a)};`, '');
    }
    for (const h of state.hardware) {
      const mappings = indexed.filter(a => a.hardwareId === h.id);
      if (!mappings.length) continue;
      body.push(`// ${comment(h.name)} control${mappings.length > 1 ? ' — first active mapping wins.' : ''}`);
      if (beginner && mappings.length > 1) body.push('// One if/else chain prevents an idle button from overwriting another input.');
      const method = h.type === 'Servo' ? 'setPosition' : 'setPower';
      mappings.forEach((a, i) => {
        body.push(`// ${comment(assignmentName(a))} | ${a.gamepad === 'gamepad1' ? 'Gamepad 1' : 'Gamepad 2'} ${comment(a.input.label)}`);
        if (beginner && a.behavior === 'analog') body.push('// Stick values range from -1.0 to 1.0; ignore small movements near center.');
        if (beginner && a.behavior === 'trigger') body.push('// Triggers range from 0.0 to 1.0; apply proportional power above the threshold.');
        body.push(`${i === 0 ? 'if' : '} else if'} (${condition(a)}) {`, `    this.${h.name}.${method}(${output(a)});`);
      });
      const fallback = mappings.find(a => a.behavior === 'toggle');
      if (h.type !== 'Servo' || fallback) body.push('} else {', `    this.${h.name}.${method}(${fallback ? decimal(fallback.offValue) : '0.0'});`, '}');
      else { body.push('}'); if (beginner) body.push('// No button pressed: hold the last servo position.'); }
      body.push('');
    }
    for (const a of indexed.filter(a => !a.hardwareId)) {
      body.push(`// TODO: ${comment(assignmentName(a))}. Select hardware in the mapper or add your logic here.`);
      if (a.behavior === 'analog' || a.behavior === 'trigger') body.push(`telemetry.addData(${javaString(assignmentName(a))}, ${sdk(a)});`);
      else body.push(`if (${condition(a)}) {`, `    telemetry.addLine(${javaString(assignmentName(a))});`, '}');
      body.push('');
    }
    if (!indexed.length) body.push('// Click a controller input in FTC Controller Mapper to add an action.', 'telemetry.addLine("No actions mapped yet.");');
    return body;
  }
}
