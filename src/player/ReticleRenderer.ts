import * as THREE from 'three';

export default class ReticleRenderer {
  camera: any;
  reticle: any;

  constructor(camera: any) {
    this.camera = camera;

    this.reticle = this.createReticle();
    // In front of the hotspot itself, which is at r=0.99.
    this.reticle.position.z = -0.97;
    camera.add(this.reticle);
  
    this.setVisibility(false);
  }

  setVisibility(isVisible: boolean) {
    // TODO: Tween the transition.
    this.reticle.visible = isVisible;
  }

  private createReticle() {
    // Make a torus.
    const geometry = new THREE.TorusGeometry(0.02, 0.005, 10, 20);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const torus = new THREE.Mesh(geometry, material);
  
    return torus;
  }
}
