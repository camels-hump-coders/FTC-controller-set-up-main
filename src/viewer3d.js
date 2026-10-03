import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { createControllerModel, disposeModel } from './models.js';

export class ControllerViewer3D {
  constructor(host, onSelect, onFailure) {
    this.host=host; this.onSelect=onSelect; this.onFailure=onFailure; this.active=false; this.visible=true; this.dirty=true; this.model=null; this.controller=null; this.assignmentIds=new Set(); this.liveIds=new Set(); this.selectedId=null; this.hoverId=null; this.autoRotate=false;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.35;
    const canvas=this.renderer.domElement; canvas.setAttribute('aria-label','3D controller. Drag or use arrow keys to rotate 360 degrees. Pinch, scroll, or use plus and minus to zoom. Home resets the view. Use All inputs for keyboard-accessible mapping.'); canvas.tabIndex=0;
    host.append(canvas); this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(35,1,.1,100); this.camera.position.set(0,3.1,12.4);
    this.orbit=new OrbitControls(this.camera,canvas); this.orbit.enableDamping=true; this.orbit.dampingFactor=.10; this.orbit.enablePan=false; this.orbit.minDistance=6; this.orbit.maxDistance=20; this.orbit.autoRotateSpeed=1.2; this.orbit.target.set(0,0,0); this.orbit.update(); this.orbit.saveState();
    this.scene.add(new THREE.HemisphereLight(0xebf4ff,0x45564a,3));
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,7,6);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xc6dcff,2);fill.position.set(5,2,-4);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xb4e3c5,1.7);rim.position.set(-5,-1,-4);this.scene.add(rim);
    this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2();
    this.tooltip=document.createElement('div');this.tooltip.className='three-tooltip';this.tooltip.hidden=true;host.append(this.tooltip);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.intersectionObserver=new IntersectionObserver(entries=>{ this.visible=entries[0].isIntersecting; if(this.visible && this.active)this.startLoop(); });this.intersectionObserver.observe(host);
    this.orbit.addEventListener('change',()=>{this.dirty=true;});
    this.orbit.addEventListener('start',()=>{this.tooltip.hidden=true;});
    this.abort=new AbortController();const options={signal:this.abort.signal};
    const pointers=new Set();
    canvas.addEventListener('pointerdown',event=>{pointers.add(event.pointerId);this.down=pointers.size===1?{x:event.clientX,y:event.clientY,id:event.pointerId,moved:false}:null;},options);
    canvas.addEventListener('pointerup',event=>{ if(this.down && !this.down.moved && event.pointerId===this.down.id && Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)<7){const input=this.pick(event);if(input)this.onSelect(input);}pointers.delete(event.pointerId);this.down=null; },options);
    canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);this.down=null;},options);
    canvas.addEventListener('pointermove',event=>{ if(this.down && Math.hypot(event.clientX-this.down.x,event.clientY-this.down.y)>=7)this.down.moved=true;if(pointers.size)return;const input=this.pick(event);this.hoverId=input;this.updateColors();canvas.style.cursor=input?'pointer':'grab';this.tooltip.hidden=!input;if(input){this.tooltip.textContent=this.controller.inputs.find(i=>i.id===input)?.label;const rect=host.getBoundingClientRect();this.tooltip.style.left=`${Math.max(4,Math.min(event.clientX-rect.left+12,rect.width-140))}px`;this.tooltip.style.top=`${Math.max(6,event.clientY-rect.top-32)}px`;} },options);
    canvas.addEventListener('pointerleave',()=>{this.hoverId=null;this.tooltip.hidden=true;this.updateColors();},options);
    canvas.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')this.reset();else if(['+','=','-'].includes(event.key))this.zoom(event.key==='-'?1.15:.85);else this.rotate(event.key==='ArrowLeft'?.3:event.key==='ArrowRight'?-.3:0,event.key==='ArrowUp'?-.25:event.key==='ArrowDown'?.25:0);}},options);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.setActive(false);this.onFailure('The 3D graphics context was lost. Reload to retry; Photo and Diagram views still work.');},options);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && this.active)this.startLoop();},options);
    this.resize();
  }
  setController(controller,assignments,selectedId) {
    if(this.controller?.id!==controller.id){ if(this.model){this.scene.remove(this.model.group);disposeModel(this.model);}this.controller=controller;this.model=createControllerModel(controller);this.scene.add(this.model.group);this.reset(); }
    this.assignmentIds=new Set(assignments.map(a=>a.inputId));this.selectedId=selectedId;this.updateColors();
  }
  updateColors() {
    if(!this.model)return;
    for(const [id,control] of this.model.controls){ const selected=id===this.selectedId,hover=id===this.hoverId,live=this.liveIds.has(id),assigned=this.assignmentIds.has(id);control.ring.material.opacity=live||selected||hover||assigned?1:0;control.ring.material.color.set(live?'#ffd066':selected?'#bae978':hover?'#d0e8ef':'#59c7a0');control.body.material.color.copy(control.baseColor);control.body.material.emissive.set(live?'#6d4918':selected?'#213815':assigned?'#073725':'#000000');control.body.material.emissiveIntensity=.35;}
    this.dirty=true;
  }
  setLive(ids){this.liveIds=new Set(ids);this.updateColors();}
  pick(event) {
    if(!this.model)return null;
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    // Include the shell so controls cannot be selected through the back of the model.
    const hits=this.raycaster.intersectObject(this.model.group,true).filter(hit=>!(hit.object.material?.transparent && hit.object.material.opacity===0));
    return hits[0]?.object.userData.inputId || null;
  }
  resize(){const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();const distance=Math.max(9.5,13.5/this.camera.aspect);if(this.fitDistance && Math.abs(distance-this.fitDistance)>.01){const offset=this.camera.position.clone().sub(this.orbit.target).multiplyScalar(distance/this.fitDistance);this.camera.position.copy(this.orbit.target).add(offset);}this.fitDistance=distance;this.dirty=true;}
  reset(){this.autoRotate=false;this.orbit.autoRotate=false;this.resize();this.orbit.reset();this.orbit.target.set(0,0,0);this.camera.position.set(0,.24,.971).multiplyScalar(this.fitDistance || 11);this.orbit.update();this.dirty=true;}
  zoom(factor){const offset=this.camera.position.clone().sub(this.orbit.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,this.orbit.minDistance,this.orbit.maxDistance));this.camera.position.copy(this.orbit.target).add(offset);this.orbit.update();this.dirty=true;}
  rotate(horizontal,vertical=0){const offset=this.camera.position.clone().sub(this.orbit.target),sphere=new THREE.Spherical().setFromVector3(offset);sphere.theta+=horizontal;sphere.phi=THREE.MathUtils.clamp(sphere.phi+vertical,.05,Math.PI-.05);this.camera.position.copy(this.orbit.target).add(new THREE.Vector3().setFromSpherical(sphere));this.orbit.update();this.dirty=true;}
  setAutoRotate(enabled){this.autoRotate=enabled;this.orbit.autoRotate=enabled;this.dirty=true;}
  setActive(active){this.active=active;if(active){this.resize();this.startLoop();}else{cancelAnimationFrame(this.frame);this.frame=null;this.tooltip.hidden=true;}}
  startLoop(){if(this.frame)return;const tick=()=>{this.frame=null;if(!this.active||!this.visible||document.hidden)return;const changed=this.orbit.update();if(changed||this.dirty||this.autoRotate){this.renderer.render(this.scene,this.camera);this.dirty=false;}this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);}
  dispose(){this.setActive(false);this.abort.abort();this.resizeObserver.disconnect();this.intersectionObserver.disconnect();this.orbit.dispose();if(this.model)disposeModel(this.model);this.renderer.dispose();this.host.replaceChildren();}
}
