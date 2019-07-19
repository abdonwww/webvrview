/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 *
 * Based on @tojiro's vr-samples-utils.js
 */

export default class WEBVR {
	static createButton(renderer: any, options?: any) {
    let button: HTMLButtonElement;

		if (options && options.referenceSpaceType) {
			renderer.vr.setReferenceSpaceType( options.referenceSpaceType );
		}

		const showEnterVR = (device: any) => {
			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';

			button.textContent = 'ENTER VR';

			button.onmouseenter = () => { button.style.opacity = '1.0'; };
			button.onmouseleave = () => { button.style.opacity = '0.5'; };
			button.onclick = () => {
				device.isPresenting ? device.exitPresent() : device.requestPresent( [ { source: renderer.domElement } ] );
			};

			renderer.vr.setDevice(device);
		};

		const showEnterXR = () => {
			let currentSession: any = null;

			const onSessionStarted = (session: any) => {
				session.addEventListener( 'end', onSessionEnded );
				renderer.vr.setSession( session );
				button.textContent = 'EXIT XR';
				currentSession = session;
			}

			const onSessionEnded = () => {
				currentSession.removeEventListener( 'end', onSessionEnded );
				renderer.vr.setSession( null );
				button.textContent = 'ENTER XR';
				currentSession = null;
			}

			//
			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';

			button.textContent = 'ENTER XR';

			button.onmouseenter = () => { button.style.opacity = '1.0'; };
			button.onmouseleave = () => { button.style.opacity = '0.5'; };
			button.onclick = () => {
				if ( currentSession === null ) {
					navigator.xr.requestSession('immersive-vr').then(onSessionStarted);
				} else {
					currentSession.end();
				}
			};
		};

		const disableButton = () => {
			button.style.display = '';
			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';

			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;
		}

		const showVRNotFound = () => {
			disableButton();
			button.textContent = 'VR NOT FOUND';
			renderer.vr.setDevice( null );
		}

		const showXRNotFound = () => {
			disableButton();
			button.textContent = 'XR NOT FOUND';
		}

		const stylizeElement = (element: HTMLButtonElement | HTMLAnchorElement) => {
			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';
		}

		if ('xr' in navigator && 'supportsSession' in navigator.xr) {
			button = document.createElement('button');
			button.style.display = 'none';

			stylizeElement(button);

			navigator.xr.supportsSession( 'immersive-vr' ).then( showEnterXR ).catch( showXRNotFound );

			return button;
		} else if ('getVRDisplays' in navigator ) {
			button = document.createElement( 'button' );
			button.style.display = 'none';

			stylizeElement( button );

			window.addEventListener('vrdisplayconnect', (event) => {
				showEnterVR(event.display);
			}, false );

			window.addEventListener('vrdisplaydisconnect', (event) => {
				showVRNotFound();
      }, false );

			window.addEventListener('vrdisplaypresentchange', (event) => {
				button.textContent = event.display.isPresenting ? 'EXIT VR' : 'ENTER VR';
			}, false );

			window.addEventListener('vrdisplayactivate', (event) => {
				event.display.requestPresent( [ { source: renderer.domElement } ] );
			}, false );

			navigator.getVRDisplays()
				.then((displays) => {
					if (displays.length > 0) {
						showEnterVR( displays[ 0 ] );
					} else {
						showVRNotFound();
					}
        })
        .catch( showVRNotFound );

			return button;
		} else {
			const message = document.createElement( 'a' );
			message.href = 'https://webvr.info';
			message.innerHTML = 'WEBVR NOT SUPPORTED';

			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';

			stylizeElement( message );

			return message;
		}
	}

	// DEPRECATED

	static checkAvailability() {
		console.warn( 'WEBVR.checkAvailability has been deprecated.' );
		return new Promise( function () {} );
	}

	static getMessageContainer() {
		console.warn( 'WEBVR.getMessageContainer has been deprecated.' );
		return document.createElement( 'div' );
	}

	static getButton() {
		console.warn( 'WEBVR.getButton has been deprecated.' );
		return document.createElement( 'div' );
	}

	static getVRDisplay() {
		console.warn( 'WEBVR.getVRDisplay has been deprecated.' );
	}
}
