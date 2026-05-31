# q5play + p5.js Compatibility Layer

Explore the q5play + p5 demo in the [p5.js Web Editor](https://editor.p5js.org/quinton-ashley/sketches/EfJ_atCs5) or [q5 Web Editor](https://codevre.com/q5-editor?project=bTC7gjpSpkTgfyD7VRiZdh3iJFw2_20260529131436736_htnr).

Learn more: <https://open.substack.com/pub/q5js/p/q5play-is-now-compatible-with-p5js>

## Demo

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" type="text/css" href="style.css" />

  <script src="https://cdn.jsdelivr.net/npm/p5@2.3.0/lib/p5.js"></script>

  <script type="importmap">
    {
      "imports": {
        "box2d3-wasm": "https://q5play.org/Box2D.deluxe.mjs"
      }
    }
  </script>
  <script type="module" src="https://q5play.org/q5play.js"></script>
  <script type="module" src="https://q5play.github.io/p5-compat/q5play-p5-compat.js"></script>

  <script type="module" src="sketch.js"></script>
</head>

<body></body>

</html>
```

```js
await Canvas();
world.gravity.y = 10;

let ball = new Sprite();
ball.diameter = 50;
ball.img = '🤪';

let groundA = new Sprite();
groundA.x = -120;
groundA.width = 220;
groundA.rotation = 30;
groundA.physics = STATIC;

let groundB = new Sprite();
groundB.x = 120;
groundB.width = 220;
groundB.rotation = -30;
groundB.physics = STATIC;

textSize(18);

p5.update = function () {
	background('skyblue');
	text('click to jump!', 0, -50);

	if (mouse.presses()) ball.vel.y = -5;
};
```
