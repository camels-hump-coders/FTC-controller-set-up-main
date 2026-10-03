# FTC Controller Mapper

A responsive browser workspace for mapping FTC controller inputs to robot actions and generating a Java `LinearOpMode`. Includes calibrated controller photos, diagrams, and interactive 360° solid 3D models. Runs directly on GitHub Pages: no build step, backend, account, or package installation required. Three.js is bundled locally for the optional 3D view.

## Run locally

With Node.js 22 or newer:

```sh
npm start
```

Open **http://127.0.0.1:4173**. No `npm install` is needed. Any static web server works. Use HTTP rather than opening `index.html` as a `file://` URL because the app uses JavaScript modules.

```sh
npm test
```

Tests cover controller definitions, validation, numeric axes/triggers, toggles, shared-hardware priority, configuration round-trips, storage recovery, and Gamepad API normalization.

Browser verification includes all five controllers; assignment and hardware edits; snapshot save/load and reload persistence; JSON import/export and invalid-import recovery; Java download and clipboard copy; simulated standard/nonstandard Gamepad readings; 3D picking and back-face occlusion; mouse, keyboard, and touch rotation; pinch gestures; and WebGL fallback. Responsive checks cover widths of 320, 390, 768, 1024, and 1440 pixels in Chromium. Actual controller hardware, iOS Safari, and compilation against the Android FTC SDK were not available for verification.

## Publish on GitHub Pages

1. Commit these files and push them to your GitHub repository.
2. In **Settings → Pages**, select **Deploy from a branch**.
3. Select **main** and **/ (root)**, then save.
4. Open the Pages URL shown by GitHub after deployment completes.

Application paths are relative, so repository subpaths (`username.github.io/repository/`) and custom domains work. `.nojekyll` keeps deployment static. HTTPS supports browser clipboard and Gamepad APIs. Google Fonts is optional: font fallbacks keep the interface usable when font requests are blocked.

## Use the mapper

The first visit opens a **Starter configuration** with sample intake and claw mappings. Review sample values before using them on a robot. **Configurations → Blank workspace** creates a clean workspace and keeps a recovery snapshot.

1. Choose **Gamepad 1** or **Gamepad 2**, then its physical model. Each gamepad can use a different controller; mappings are retained separately for each model.
2. Click a diagram control, or expand **All inputs** for large, labeled buttons. The stick's **X / Y** chips select analog axes; **L3 / R3** select stick clicks.
3. Choose an action, optional custom label, behavior, hardware, and power or position. Press **Add/Update assignment**. Code updates immediately after a mapping is applied.
4. Expand **Robot hardware** to add, rename, change, or remove `DcMotor`, `Servo`, and `CRServo` devices. Names are case-sensitive and must match the robot configuration. The tool accepts Java identifiers and rejects keywords and reserved SDK fields.
5. Edit or delete mappings in the table. To change priority, edit a mapping and use **Make highest priority** (the up arrow).
6. Choose **Beginner** for inline explanations or **Advanced** for a reusable `updateControls()` method. Copy or download `MappedTeleOp.java`.

Place the generated file in your FTC project's `TeamCode` package, `org.firstinspires.ftc.teamcode`. It includes imports, hardware initialization, `waitForStart()`, the active OpMode loop, and motor shutdown in `finally`.

### Photo, Diagram, and 3D views

- **Photo** uses the supplied F310, Xbox 360, DualShock 4, and Etpark photos with individually calibrated, clickable input hotspots. Rear bumpers/triggers are explicitly shown above the front photo. QuadStick has no supplied photo and uses its diagram instead.
- **Diagram** offers labeled SVG controls and assignment callouts.
- **3D** provides real, volumetric meshes with modeled shells, grips, sticks, buttons, shoulders, and rear details. Drag with a mouse or one finger to orbit 360°; pinch or scroll to zoom. Buttons provide rotation, zoom, automatic rotation, and reset. Arrow keys rotate a focused canvas, +/− zoom, and Home resets. Click a visible control to configure it; dragging does not select controls through the shell. Use **All inputs** for keyboard-accessible selection.

The 3D geometry is illustrative and based on front-view references, not a photogrammetry scan or dimensionally accurate CAD model. Unseen rear/side details are approximations. QuadStick's physical model is separate from its profile-dependent emulated outputs; select those from **All inputs**.

3D requires WebGL 2. If the device cannot provide it, the app explains the limitation and keeps Photo/Diagram mapping available. Three.js loads only when 3D is requested, stays local to the site, and releases old model resources when switching controllers. Rendering pauses when the view is hidden or off-screen. Rotation does not start automatically, respecting reduced-motion preferences.

### Code behavior

- **Buttons and D-pad:** boolean conditions; motors return to zero when released.
- **Toggle:** one change per rising edge, with persistent state and previous-input tracking.
- **Analog axes:** numeric power, configurable scale, inversion, and deadzone. Sticks range from approximately −1 to 1; forward Y is negative.
- **Triggers:** proportional numeric power above a configurable 0–1 threshold.
- **Positional servos:** `setPosition`, bounded to 0–1. Button actions hold the last position on release; toggles use on/off positions.
- **Shared hardware:** one `if / else if / else` chain per mechanism, in table order, prevents conflicting idle writes. First active mapping wins. When none is active, motors stop and servos hold, except toggles supply an off value. If several toggles share hardware, the first toggle supplies that fallback.
- **No hardware selected:** a clearly marked TODO and telemetry, not an invented hardware command.
- **Action names describe intent:** “Reset arm,” “Hang,” etc. do not implement homing, encoder resets, limit switches, or mechanism-specific sequences. Configure command values and add those behaviors in your robot project.

The generated code is a starting point. Check hardware names, motor direction, servo endpoints, mechanism limits, and controller mappings before running. The tests verify generation logic; they do not compile against the FTC Android SDK or test a physical robot.

### Save and share

The workspace auto-saves to `localStorage`. **Configurations** saves, loads, and deletes named snapshots. Loading a configuration, starting blank, or importing JSON keeps a recovery snapshot. **Export JSON / Import JSON** moves configurations between devices without an account.

Clearing browser site data removes local saves. Export JSON for a portable backup. If storage is unavailable or full, the status shows **Export to keep changes**; mapping and downloads remain usable. Workspace replacement stops if a recovery snapshot cannot be kept. Invalid imports are rejected without changing the current workspace.

### Supported controllers

| Controller | Notes |
| --- | --- |
| Logitech F310 | XInput mode; MODE may swap the D-pad and left stick. |
| Xbox 360 | Asymmetric sticks; verify the actual Driver Station mapping. |
| Sony DualShock 4 | Cross → `a`, Circle → `b`, Square → `x`, Triangle → `y`, Share → `back`, Options → `start`, PS → `guide`. Touchpad click is separate. |
| Etpark Wired Controller for PS4 | PS4-style labels. Revisions differ; touch sensing is not assumed. |
| QuadStick | Xbox 360 emulation. The graphic distinguishes physical inputs from clickable emulated outputs. Sip/puff, lip, and joystick gestures must be configured in the QuadStick profile; the tool does not assume fixed physical mappings. |

Guide/Home can be intercepted by the operating system. Verify inputs on your Driver Station. Supported drivers and competition rules are separate questions; consult current FIRST guidance.

### Live testing

**Test controller** uses `navigator.getGamepads()` while enabled. Connect a controller and press a button; browsers may not expose devices until interaction. Select a detected device if several are connected.

Standard browser mappings highlight buttons, D-pad, triggers, and axes. Nonstandard devices display raw channels without guessing FTC mappings. Browser slots are independent of FTC `gamepad1`/`gamepad2`. Unavailable or blocked APIs show an explanation; manual mapping always works without a controller. The tester never communicates with a robot.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/controllers.js` | Controller definitions, physical labels, SDK fields, input types, positions, browser indices, explanations. |
| `src/graphics.js` | Accessible SVG controller graphics, selected/mapped states, labels. |
| `src/appearance.js` | Supplied photo URLs, per-photo landmark calibration, reference-based colors. |
| `src/photo-graphics.js` | Interactive photo overlays. |
| `src/models.js` | Reference-based 3D geometry and resource cleanup. |
| `src/viewer3d.js` | WebGL rendering, orbit controls, occlusion-aware selection, touch/keyboard support. |
| `src/state.js` | Workspace schema, validation, defaults, assignment selection, persistence loading. |
| `src/codegen.js` | Pure Java generator with typed inputs and deterministic mechanism priority. |
| `src/tester.js` | Gamepad sampling, normalization, animation lifecycle. |
| `src/app.js` | UI components, editing, hardware, storage, copy/download, theme. |
| `src/styles.css` | Responsive light/dark design, focus states, reduced-motion support. |
| `scripts/serve.mjs` | Dependency-free local server; not needed on GitHub Pages. |

To add a controller, add a definition to `CONTROLLERS` in `src/controllers.js`, using canonical SDK fields and typed inputs. Reuse a graphic family and supply positions, or add a family in `src/graphics.js`. Browser indices must describe the browser's **standard** mapping, not raw USB indices. UI, validation, and generation discover new definitions automatically.

Add optional reference images and landmarks in `src/appearance.js`. Add a 3D family in `src/models.js` when the controller has a new physical form. The files in `vendor/three/` are the unmodified Three.js 0.180.0 module/core builds and matching OrbitControls, distributed under the included MIT license. Preserve the image filenames (including spaces and capitalization), or update their URLs in `appearance.js`.

## Sources

- [FTC SDK Gamepad API](https://javadoc.io/doc/org.firstinspires.ftc/RobotCore/latest/com/qualcomm/robotcore/hardware/Gamepad.html)
- [FIRST gamepad best practices and supported drivers](https://ftc-docs.firstinspires.org/en/latest/robot_building/best_practices/robot-best-practices.html#gamepad-best-practices)
- [FTC SDK button alias implementation](https://github.com/OpenFTC/OpenRC-Turbo/blob/master/RobotCore/src/main/java/com/qualcomm/robotcore/hardware/Gamepad.java)
- [QuadStick documentation](https://www.quadstick.com/documentation)

Independent educational tool; not an official FIRST product.
