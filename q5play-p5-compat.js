if (typeof globalThis.Q5 == 'undefined') {
	let upgrade = ' Consider upgrading to q5: https://q5js.org';

	if (p5.VERSION[0] != 2) {
		throw new Error(`q5play requires q5.js or p5.js version 2. Detected: v${p5.VERSION}.` + upgrade);
	}

	const runHook = p5.prototype._runLifecycleHook;
	p5.prototype._runLifecycleHook = async function (hookName) {
		const $ = this;

		if (hookName == 'postsetup') return;
		if (hookName == 'predraw') {
			if (!$._ranPostsetup) {
				await runHook.call($, 'postsetup');

				$.loge = $.log.bind($);
				$.log = console.log;
				$.camera = $._camera;

				if ($._isGlobal) {
					if (window.camera instanceof p5.Camera) $.camera3D = window.camera.bind($);
					for (let prop of ['log', 'loge', 'camera', 'camera3D']) {
						Object.defineProperty(window, prop, {
							value: $[prop]
						});
					}
				}
				$._ranPostsetup = true;
			}
			$.q5play._preDrawFrameTime = performance.now();
			$.resetMatrix();
		}

		const r = await runHook.call($, hookName);

		if (hookName == 'postdraw') {
			$.q5play._postDrawFrameTime = performance.now();
			$.q5play._fps = Math.round(1000 / ($.q5play._postDrawFrameTime - $.q5play._preDrawFrameTime)) || 1;
		}

		return r;
	};

	// p5.js v2 compatibility layer
	p5._q5playCompat = ($) => {
		$ ??= p5.instance;
		const c = $.canvas;

		// q5play defaults
		$.angleMode($.DEGREES);
		$.imageMode($.CENTER);
		if (p5.supportsHDR) $.colorMode($.RGBHDR, 1);
		else $.colorMode($.RGB, 1);

		// polyfills for q5 functions and properties
		$.halfWidth = $.width / 2;
		$.halfHeight = $.height / 2;
		$.jit = (v) => $.random(-v, v);
		$.disablePreload = () => {};
		$.findEl = $.select;
		$.findEls = $.selectAll;
		$.inset = $.copy;
		$._loaders = [];
		$._colorFormat = 1;
		$.pushMatrix = $.pushStyles = $.push;
		$.popMatrix = $.popStyles = $.pop;
		$.loadAudio = $.loadSound;
		$.MAXED = 'maxed';
		$.PIXELATED = 'pixelated';

		const imgRegex = /(jpe?g|png|gif|webp|avif|svg)/i,
			fontRegex = /(ttf|otf|woff2?|eot|json)/i,
			fontCategoryRegex = /(serif|sans-serif|monospace|cursive|fantasy)/i,
			audioRegex = /(wav|flac|mp3|ogg|m4a|aac|aiff|weba)/i;

		$.load = function (...urls) {
			if (Array.isArray(urls[0])) urls = urls[0];

			let promises = [];

			for (let url of urls) {
				let ext = url.split('.').pop().toLowerCase();

				let obj;
				if (ext == 'json') {
					if (url.includes('-msdf.')) {
						throw new Error('p5.js v2 can not load MSDF fonts.' + upgrade);
					}
					obj = $.loadJSON(url);
				} else if (ext == 'csv') {
					obj = $.loadCSV(url);
				} else if (imgRegex.test(ext)) {
					obj = $.loadImage(url);
				} else if (fontRegex.test(ext) || fontCategoryRegex.test(url)) {
					obj = $.loadFont(url);
				} else if (audioRegex.test(ext)) {
					obj = $.loadSound(url);
				} else if (ext == 'xml') {
					obj = $.loadXML(url);
				} else {
					obj = $.loadText(url);
				}
				promises.push(obj);
			}

			if (urls.length == 1) return promises[0];
			return Promise.all(promises);
		};

		document.head.insertAdjacentHTML(
			'beforeend',
			`<style>
html, body {
	margin: 0;
	padding: 0;
}
.q5Canvas {
	outline: none;
	-webkit-touch-callout: none;
	-webkit-text-size-adjust: none;
	-webkit-user-select: none;
	overscroll-behavior: none;
}
.q5-pixelated {
	image-rendering: pixelated;
	font-smooth: never;
	-webkit-font-smoothing: none;
}
.q5-centered,
.q5-maxed {
  display: flex;
	align-items: center;
	justify-content: center;
}
main.q5-centered,
main.q5-maxed {
	height: 100vh;
}
main {
	overscroll-behavior: none;
}
</style>`
		);

		$._adjustDisplay = (forced) => {
			let s = c.style;
			// if the canvas doesn't have a style,
			// it may be a server side canvas, so return
			if (!s) return;
			if (c.displayMode == 'normal') {
				// unless the canvas needs to be resized, return
				if (!forced) return;
				s.width = c.w * c.displayScale + 'px';
				s.height = c.h * c.displayScale + 'px';
			} else {
				let parent = c.parentElement.getBoundingClientRect();
				if (c.w / c.h > parent.width / parent.height) {
					if (c.displayMode == 'centered') {
						s.width = c.w * c.displayScale + 'px';
						s.maxWidth = '100%';
					} else s.width = '100%';
					s.height = 'auto';
					s.maxHeight = '';
				} else {
					s.width = 'auto';
					s.maxWidth = '';
					if (c.displayMode == 'centered') {
						s.height = c.h * c.displayScale + 'px';
						s.maxHeight = '100%';
					} else s.height = '100%';
				}
			}
		};

		$.displayMode = (displayMode = 'normal', renderQuality = 'smooth', displayScale = 1) => {
			if (typeof displayScale == 'string') {
				displayScale = parseFloat(displayScale.slice(1));
			}
			if (displayMode == 'fullscreen') displayMode = 'maxed';
			if (displayMode == 'center') displayMode = 'centered';

			if (c.displayMode) {
				c.parentElement.classList.remove('q5-' + c.displayMode);
				c.classList.remove('q5-pixelated');
			}

			c.parentElement.classList.add('q5-' + displayMode);

			if (renderQuality == 'pixelated') {
				c.classList.add('q5-pixelated');
				$.pixelDensity(1);
				// $.defaultImageScale(1);
				if ($.noSmooth) $.noSmooth();
				if ($.textFont) $.textFont('monospace');
			}

			Object.assign(c, { displayMode, renderQuality, displayScale });

			if ($.ctx) $.pushStyles();
			$._adjustDisplay(true);
			if ($.ctx) $.popStyles();
		};

		if ($._c2d || $._webgpuFallback) {
			$.opacity = (v) => ($.ctx.globalAlpha = v);
		} else $.opacity = () => {};

		// prettier-ignore
		let nos = ['loadAll','capsule','defaultImageScale','createTextImage','textImage','textToPoints','noiseMode','createRecorder','record','pauseRecording','deleteRecording', 'saveRecording'];
		for (let p of nos) {
			$[p] = () => console.error(`p5.js v2 does not have ${p}.` + upgrade);
		}

		if ($._isGlobal) {
			// prettier-ignore
			let props = ['halfWidth','halfHeight','jit','disablePreload','findEl','findEls','inset','load','displayMode','opacity','pushMatrix','popMatrix','pushStyles','popStyles','loadAudio','MAXED','PIXELATED',...nos];
			for (let p of props) {
				window[p] = $[p];
			}
		}

		if ($._webgpuFallback) {
			const _resetMatrix = $.resetMatrix;
			$.resetMatrix = () => {
				_resetMatrix.call($);
				// sets origin to the center of the canvas
				$.translate($.halfWidth, $.halfHeight);
			};
		}

		// polyfills for q5 WebGPU high efficiency style changing functions
		$._getFillIdx = () => $._renderer.states.fillColor;
		$._getStrokeIdx = () => $._renderer.states.strokeColor;
		$._setFillIdx = (v) => $._renderer.fill(v);
		$._setStrokeIdx = (v) => $._renderer.stroke(v);
		$._getStrokeWeight = () => [$._renderer.states.strokeWeight];
		$._setStrokeWeight = (v) => $.strokeWeight(v[0]);
		$._getImageMode = () => $._renderer.states.imageMode;
		$._doFill = () => {};
		$._doStroke = () => {};

		// add to p5.Vector
		p5.Vector.prototype.direction = function () {
			if (!this._directionCached) {
				const x = this.x,
					y = this.y;
				if (x || y) this._direction = $.atan2(this.y, this.x);
				else this._direction = 0;
				this._directionCached = this._useCache;
			}
			return this._direction;
		};
		p5.Vector.prototype.setDirection = function (ang) {
			let mag = this.mag();
			if (mag) {
				this.x = mag * $.cos(ang);
				this.y = mag * $.sin(ang);
			}
			this._direction = ang;
			this._directionCached = this._useCache;
			return this;
		};

		// prettier-ignore
		const entryPoints = ['setup','update','draw','deviceMoved','deviceTurned','deviceShaken','doubleClicked','mousePressed','mouseReleased','mouseMoved','mouseDragged','mouseClicked','mouseWheel','touchStarted','touchMoved','touchEnded','keyPressed','keyReleased','keyTyped','windowResized'];

		for (let ep of entryPoints) {
			Object.defineProperty(p5, ep, {
				set(fn) {
					$[ep] = fn;
					if ($._isGlobal) window[ep] = fn;
				},
				get() {
					return $[ep];
				}
			});
		}
	};

	window.P2D = 'p2d';
	window.P2DHDR = 'p2d-hdr';
	window.WEBGL = 'webgl';
	window.WEBGPU = 'webgpu';
	window.windowWidth = window.innerWidth;
	window.windowHeight = window.innerHeight;

	window.Canvas = (...args) => {
		return new Promise((resolve) => {
			window.setup = async function () {
				const $ = p5.instance;

				let rendTypes = [$.P2D, $.P2DHDR, $.WEBGL, $.WEBGPU];
				$._specifiedRenderer = args.some((a) => rendTypes.includes(a));
				if (window.matchMedia && matchMedia('(dynamic-range: high) and (color-gamut: p3)').matches) {
					p5.supportsHDR = true;
					if (!$._specifiedRenderer) args.push($.P2DHDR);
				}

				let r = p5.instance.Canvas(...args);
				if (r instanceof Promise) r = await r;

				// workaround for https://github.com/processing/p5.js/issues/8843
				$._renderer.states.fillColor._defaultStringValue = '#fff';
				$._renderer.states.strokeColor._defaultStringValue = '#000';

				if ($._isGlobal) window.canvas = r.canvas;

				resolve(r);
			};
		});
	};

	globalThis.Q5 = globalThis.q5 = p5;
}
