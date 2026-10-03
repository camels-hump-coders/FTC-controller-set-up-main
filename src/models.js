import * as THREE from '../vendor/three/three.module.min.js';

// Reference-based, lightweight solid models. Dimensions are illustrative, not CAD scans.
const material = (color, roughness = 0.62, metalness = 0.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const rubber = () => material('#161b21', 0.92);
const coord = (x, y) => [(x - 360) / 79, (235 - y) / 79];

function roundedShape(w, h, r) {
  const x = -w / 2, y = -h / 2, shape = new THREE.Shape();
  shape.moveTo(x+r,y); shape.lineTo(x+w-r,y); shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r); shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h); shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r); shape.quadraticCurveTo(x,y,x+r,y);
  return shape;
}
function roundedBox(w, h, depth, r, mat, bevel = 0.035) {
  const geo = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 12, steps: 1 });
  geo.translate(0,0,-depth/2);
  return new THREE.Mesh(geo, mat);
}
function cylinder(radius, depth, mat, segments = 40) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}
function textPlane(text, width, height, { color = '#d5dee9', background = null, font = 'bold', fontSize = 80 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = Math.max(96, Math.round(512*height/width));
  const ctx = canvas.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0,0,canvas.width,canvas.height); }
  ctx.fillStyle = color; ctx.font = `${font} ${fontSize}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, canvas.height/2, 485);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.FrontSide }));
}
function addAt(parent, object, x, y, z) { object.position.set(x,y,z); parent.add(object); return object; }
function shellShape(family) {
  const s = new THREE.Shape(), p = (x,y) => coord(x,y);
  const move = (x,y) => s.moveTo(...p(x,y));
  const curve = (a,b,c,d,e,f) => s.bezierCurveTo(...p(a,b),...p(c,d),...p(e,f));
  if (family === 'playstation') {
    move(174,115); curve(134,108,119,133,106,178); curve(99,204,86,270,79,330); curve(72,375,117,396,145,365);
    curve(161,345,176,312,190,283); curve(220,307,269,317,306,292); curve(334,287,386,287,414,292);
    curve(451,317,500,307,530,283); curve(544,312,559,345,575,365); curve(603,396,648,375,641,330);
    curve(634,270,621,204,614,178); curve(601,133,586,108,546,115); curve(461,126,259,126,174,115);
  } else if (family === 'xbox') {
    move(177,119); curve(139,111,116,154,108,193); curve(99,242,77,313,75,351); curve(75,389,109,389,140,363);
    curve(204,296,248,289,281,292); curve(330,279,390,279,439,292); curve(472,289,516,296,580,363);
    curve(611,389,645,389,645,351); curve(643,313,621,242,612,193); curve(604,154,581,111,543,119); curve(469,138,251,138,177,119);
  } else {
    move(173,121); curve(132,115,112,145,104,190); curve(90,250,75,320,83,349); curve(94,389,129,383,152,354);
    curve(174,326,191,296,211,278); curve(235,300,260,309,298,307); curve(339,312,381,312,422,307);
    curve(460,309,485,300,509,278); curve(529,296,546,326,568,354); curve(591,383,626,389,637,349);
    curve(645,320,630,250,616,190); curve(608,145,588,115,547,121); curve(488,127,459,149,428,142); curve(378,138,342,138,292,142); curve(261,149,232,127,173,121);
  }
  s.closePath(); return s;
}
function makeShell(controller) {
  const group = new THREE.Group(), shape = shellShape(controller.family);
  const frontGeo = new THREE.ExtrudeGeometry(shape, { depth:0.27, bevelEnabled:true, bevelSize:0.12, bevelThickness:0.12, bevelSegments:5, curveSegments:20 });
  const front = new THREE.Mesh(frontGeo, material(controller.body, controller.family === 'xbox' ? 0.46 : 0.59)); front.position.z = 0.05; group.add(front);
  const backGeo = new THREE.ExtrudeGeometry(shape, { depth:0.33, bevelEnabled:true, bevelSize:0.10, bevelThickness:0.11, bevelSegments:4, curveSegments:20 });
  const back = new THREE.Mesh(backGeo, rubber()); back.position.z = -0.52; group.add(back);
  // Rounded grip inserts distinguish the controller families without flat photo planes.
  for (const sign of [-1,1]) {
    const grip = new THREE.Mesh(new THREE.SphereGeometry(1,32,20), rubber());
    grip.scale.set(0.39,0.99,0.38); grip.rotation.z = -sign*0.27; grip.position.set(sign*2.85,-0.93,0.04); group.add(grip);
    if (controller.id === 'etpark-ps4') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(1,0.022,6,40,Math.PI*0.8), material('#326bfd',0.45));
      arc.position.set(sign*2.52,-0.02,0.46); arc.rotation.z = sign < 0 ? 2.5 : 4.4; arc.scale.set(.8,1,1); group.add(arc);
    }
    for (const y of [0.8,-0.95]) {
      const screw = cylinder(.065,.025,material('#4c535b',.4,.65),16); screw.position.set(sign*2.15,y,-.645); group.add(screw);
    }
  }
  const plate = roundedBox(1.6,.8,.045,.12,rubber()); addAt(group,plate,0,-.05,-.66);
  const backLabel = textPlane(controller.brand,1.1,.25,{color:'#909ca6',fontSize:100}); backLabel.rotation.y = Math.PI; addAt(group,backLabel,0,.07,-.73);
  const port = roundedBox(.38,.13,.1,.03,material('#101216')); addAt(group,port,0,1.39,-.13);
  if (controller.family !== 'playstation' || controller.id === 'etpark-ps4') {
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.36,-.08),new THREE.Vector3(0,1.95,-.13),new THREE.Vector3(.13,2.4,-.2)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(path,20,.052,8,false),rubber()));
  }
  return group;
}

export function createControllerModel(controller) {
  if (controller.family === 'quadstick') return quadstickModel(controller);
  const group = makeShell(controller), controls = new Map();
  const ps = controller.family === 'playstation';
  const faceZ = .49;
  for (const input of controller.inputs) {
    if (input.type === 'axis') continue;
    const control = new THREE.Group(); control.userData.inputId = input.id;
    let [x,y] = coord(input.x,input.y), z = faceZ;
    let body, radius = .235;
    if (input.shape === 'stick') {
      addAt(control,cylinder(.55,.12,material(controller.body,.68)),0,0,-.01);
      addAt(control,cylinder(.43,.13,rubber()),0,0,.1);
      addAt(control,cylinder(.17,.3,material('#333941',.55)),0,0,.29);
      body = cylinder(.38,.18,material('#20272e',.94)); addAt(control,body,0,0,.46);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.325,.037,10,40),material('#343d44',.97)); addAt(control,rim,0,0,.56);
      const label = textPlane(input.short,.21,.14,{color:'#a4afba',fontSize:120}); addAt(control,label,0,-.1,.563);
      radius = .47;
    } else if (input.shape === 'shoulder' || input.shape === 'trigger') {
      x = input.id.startsWith('left') ? -2.08 : 2.08; y = input.type === 'trigger' ? 1.76 : 1.56; z = input.type === 'trigger' ? -.43 : .12;
      body = roundedBox(input.type === 'trigger' ? .82 : 1.3, input.type === 'trigger' ? .55 : .32, input.type === 'trigger' ? .48 : .5,.12,rubber()); control.add(body);
      const label = textPlane(input.short,.47,.22,{fontSize:175}); addAt(control,label,0,0,.32); radius = .43;
    } else if (input.shape === 'dpad') {
      body = roundedBox(.36,.36,.15,.035,rubber()); control.add(body);
      addAt(control,textPlane(input.short,.26,.26,{color:'#c0cad4',fontSize:300}),0,0,.12); radius = .25;
    } else if (input.shape === 'small') {
      if(ps) { x=input.id==='back'?-1.28:1.28; y=1.14; }
      body = roundedBox(ps ? .15 : .47,ps ? .35 : .20,.13,.07,rubber()); control.add(body);
      const label = textPlane(input.short,ps ? .5 : .42,.11,{fontSize:90}); addAt(control,label,0,ps ? .3 : 0,.12); radius = .27;
    } else if (input.shape === 'touchpad') {
      x=0; y=.91;
      body = roundedBox(1.95,.9,.1,.08,material('#141c24',.95)); control.add(body);
      for (let row=0;row<6;row++) for(let col=0;col<13;col++) addAt(control,cylinder(.012,.008,material('#3c434c'),6),-.81+col*.135,-.33+row*.13,.095);
      radius = .53;
    } else {
      if (input.shape === 'guide') radius = ps ? .20 : .27;
      addAt(control,cylinder(radius+.07,.055,material('#10151b',.7)),0,0,-.055);
      body = cylinder(radius,.14,material(input.shape === 'guide' && controller.family === 'xbox' ? '#c2cbb7' : '#20252d', .35)); control.add(body);
      const label = textPlane(input.short,radius*1.6,radius*1.6,{color:input.color || (controller.family === 'xbox' ? '#6aad31' : '#e0e5ed'),fontSize:330}); addAt(control,label,0,0,.077);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius,.018,8,40),new THREE.MeshBasicMaterial({color:'#52b48d',transparent:true,opacity:0}));
    ring.position.z=input.shape==='stick' ? .59 : input.shape==='shoulder' || input.shape==='trigger' ? .33 : .13;
    if(input.shape==='shoulder') ring.scale.set(1.5,.48,1);
    if(input.shape==='touchpad') ring.scale.set(1.9,.95,1);
    control.add(ring); control.position.set(x,y,z); group.add(control);
    control.traverse(object=>{ object.userData.inputId=input.id; });
    controls.set(input.id,{ group:control, ring, body, baseColor:body.material.color.clone() });
  }
  // Sticks expose separately selectable X/Y tabs, just as the 2D mapper does.
  for (const input of controller.inputs.filter(i=>i.type==='axis')) {
    const [x,y]=coord(input.x,input.y), control=new THREE.Group();
    const body=roundedBox(.5,.26,.05,.06,material('#35473e'));
    control.add(body); addAt(control,textPlane(input.short,.25,.23,{fontSize:330,color:'#d8e5d2'}),0,0,.09);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.19,.016,8,24),new THREE.MeshBasicMaterial({color:'#52b48d',transparent:true,opacity:0})); ring.scale.x=1.5; ring.scale.y=.8; ring.position.z=.095; control.add(ring);
    control.position.set(x,y,.44); control.traverse(object=>{object.userData.inputId=input.id;}); group.add(control); controls.set(input.id,{group:control,ring,body,baseColor:body.material.color.clone()});
  }
  if (ps) {
    if (controller.id==='etpark-ps4') { const touch = roundedBox(1.95,.9,.08,.06,material('#121a21',.85)); addAt(group,touch,0,.91,.48); const edge = new THREE.LineSegments(new THREE.EdgesGeometry(touch.geometry),new THREE.LineBasicMaterial({color:'#4775ed'})); touch.add(edge); }
    for(let row=0;row<3;row++) for(let col=0;col<5-row;col++) addAt(group,cylinder(.028,.02,rubber(),10),-.23+col*.11+row*.055,.22-row*.085,.49);
  } else {
    const logo = textPlane(controller.brand,1.15,.27,{fontSize:95,color:'#b6c1ce'}); addAt(group,logo,0,.05,.48);
    if(controller.family==='logitech') { const mode=roundedBox(.31,.12,.07,.05,rubber());addAt(group,mode,0,-.29,.48);addAt(group,cylinder(.025,.02,material('#83af55')), -.26,-.29,.52); }
  }
  return { group, controls };
}

function quadstickModel(controller) {
  const group=new THREE.Group();
  const shell=roundedBox(3.6,2.25,1.2,.5,material('#303943',.65),.1); addAt(group,shell,0,.4,0);
  addAt(group,textPlane('QuadStick',2,.45,{fontSize:95}),0,.7,.71);
  for(let i=0;i<5;i++) addAt(group,cylinder(.065,.025,material('#61b4e6',.3)), -.6+i*.3,.1,.64);
  const stem=cylinder(.20,1.1,material('#5c6974',.45,.4)); addAt(group,stem,0,-.46,1.06);
  const mouth=roundedBox(1.9,.48,.38,.2,material('#63747c',.5));addAt(group,mouth,0,-.46,1.73);
  for(const x of [-.57,0,.57]) addAt(group,cylinder(.12,.035,rubber()),x,-.46,1.947);
  addAt(group,roundedBox(.75,.18,.24,.05,material('#26333e')),0,-.06,1.78);
  const mount=cylinder(.36,1.3,material('#1b2229',.5));mount.rotation.x=0;addAt(group,mount,0,-1.2,-.2);
  const base=cylinder(1.1,.2,rubber());base.rotation.x=0;addAt(group,base,0,-1.85,-.2);
  return {group,controls:new Map()};
}

export function disposeModel(model) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  model.group.traverse(object=>{ if(object.geometry)geometries.add(object.geometry); if(object.material) for(const mat of Array.isArray(object.material)?object.material:[object.material]) { materials.add(mat); if(mat.map)textures.add(mat.map); } });
  geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); textures.forEach(t=>t.dispose());
}
