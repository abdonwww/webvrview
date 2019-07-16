/**
 * Shows a 2D loading indicator while various pieces of EmbedVR load.
 */
export default class LoadingIndicator {
  el: HTMLDivElement;

  constructor() {
    this.el = this.build_();
    document.body.appendChild(this.el);
    this.show();
  }

  build_() {
    const overlay = document.createElement('div');
    const overlayStyle: CSSStyleDeclaration = overlay.style;
    overlayStyle.position = 'fixed';
    overlayStyle.top = '0';
    overlayStyle.left = '0';
    overlayStyle.width = '100%';
    overlayStyle.height = '100%';
    overlayStyle.background = '#eee';

    const img = document.createElement('img');
    img.src = 'images/loading.gif';

    const imgStyle: CSSStyleDeclaration = img.style;
    imgStyle.position = 'absolute';
    imgStyle.top = '50%';
    imgStyle.left = '50%';
    imgStyle.transform = 'translate(-50%, -50%)';
  
    overlay.appendChild(img);
    return overlay;
  }
  
  hide() {
    this.el.style.display = 'none';
  }

  show() {
    this.el.style.display = 'block';
  }
}
