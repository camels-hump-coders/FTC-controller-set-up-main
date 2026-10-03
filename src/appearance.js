// Physical front-view landmarks measured from the user-supplied reference photos.
// Coordinates are in original image pixels; every photo has its own calibration.
const photo = (filename, width, height, crop, centers, options = {}) => ({ src: new URL(`../${filename}`, import.meta.url).href, width, height, crop, centers, ...options });
const dpad = (x, y, distance) => ({ dpad_up: [x, y - distance], dpad_down: [x, y + distance], dpad_left: [x - distance, y], dpad_right: [x + distance, y] });
export const APPEARANCES = {
  'logitech-f310': {
    body: '#344765',
    photo: photo('Logitech F310.webp', 351, 351, [0, 61, 351, 230], {
      a: [275, 179], b: [301, 153], x: [249, 153], y: [275, 127],
      left_stick_button: [124, 213], right_stick_button: [225, 213],
      back: [138, 127], start: [211, 127], guide: [174, 139], ...dpad(75, 151, 18),
    }),
  },
  'xbox-360': {
    body: '#292b2b',
    photo: photo('xbox 360.webp', 351, 351, [0, 45, 351, 260], {
      a: [271, 142], b: [298, 116], x: [245, 115], y: [271, 89],
      left_stick_button: [70, 117], right_stick_button: [219, 176],
      back: [134, 119], start: [207, 119], guide: [171, 117], ...dpad(114, 176, 19),
    }, {
      axesBelowPhoto: true,
      // Hotspot radii are measured in original image pixels, just like the centers.
      radii: { a: 11.5, b: 11.5, x: 11.5, y: 11.5, guide: 20, back: 9, start: 9, left_stick_button: 22, right_stick_button: 21, dpad_up: 11, dpad_down: 11, dpad_left: 11, dpad_right: 11 },
      labelOffsets: { a: [88, 16], b: [88, 0] },
    }),
  },
  'dualshock-4': {
    body: '#3b4f72',
    photo: photo('Sony Dualshock 4.jpeg', 565, 353, [0, 0, 565, 353], {
      a: [461, 147], b: [503, 105], x: [419, 106], y: [461, 65],
      left_stick_button: [191, 185], right_stick_button: [376, 185],
      back: [166, 49], start: [400, 49], guide: [283, 186], touchpad: [284, 81], ...dpad(107, 105, 29),
    }),
  },
  'etpark-ps4': {
    body: '#272b30',
    photo: photo('Etpark PS4.jpeg', 425, 470, [0, 185, 425, 285], {
      a: [351, 298], b: [378, 272], x: [322, 272], y: [351, 245],
      left_stick_button: [147, 330], right_stick_button: [287, 330],
      back: [131, 232], start: [299, 232], guide: [216, 336], ...dpad(83, 272, 20),
    }),
  },
};

export function photoLayout(controller) {
  if (!controller.photo) return null;
  const [cx, cy, cw, ch] = controller.photo.crop;
  const width = 520, scale = width / cw, height = ch * scale;
  const left = 100, top = 95;
  const centers = Object.fromEntries(Object.entries(controller.photo.centers).map(([id, [x, y]]) => [id, { x: left + (x - cx) * scale, y: top + (y - cy) * scale }]));
  const axisGroups = [];
  for (const side of ['left', 'right']) {
    const stick = centers[`${side}_stick_button`];
    const axisAnchor = controller.photo.axesBelowPhoto ? { x: side === 'left' ? 250 : 470, y: top + height + 49 } : { x: stick.x, y: stick.y + 61 };
    centers[`${side}_stick_x`] = { x: axisAnchor.x - 26, y: axisAnchor.y };
    centers[`${side}_stick_y`] = { x: axisAnchor.x + 26, y: axisAnchor.y };
    if (controller.photo.axesBelowPhoto) axisGroups.push({ side, x: axisAnchor.x, y: axisAnchor.y });
    centers[`${side}_bumper`] = { x: side === 'left' ? 220 : 500, y: 74 };
    centers[`${side}_trigger`] = { x: side === 'left' ? 220 : 500, y: 34 };
  }
  return { left, top, width, height, scale, centers, axisGroups, viewHeight: Math.max(475, top + height + (controller.photo.axesBelowPhoto ? 92 : 20)) };
}
