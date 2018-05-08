/* eslint-disable */
const { timeline, keyframes, tween, easing, pointer, transform, schedule, everyFrame } = popmotion;
const { transformMap, smooth } = transform;

// import { keyframes } from 'popmotion'

const deg = d => d * Math.PI / 180

const browFrames = [
  { radius: 80, thickness: 24, start: deg(-30), end: deg(-150) },
  { radius: 80, thickness: 24, start: deg(-40), end: deg(-160) },
  { radius: 80, thickness: 24, start: deg(150), end: deg(30) }
];

const pupilFrames = [
  { radius: 40, width: deg(0), gaze: deg(0) },
  { radius: 40, width: deg(60), gaze: -deg(30) },
  { radius: 40, width: deg(60), gaze: -deg(30) },
  { radius: 40, width: deg(60), gaze: deg(30) },
  { radius: 40, width: deg(60), gaze: deg(30) },
  { radius: 40, width: deg(0), gaze: deg(0) }
];

class HelloEye {
  constructor ({ container, color }) {
    this.color = color || 'white';
    this.pupil = pupilFrames[0];
    this.brow = browFrames[0];
    this.bAnimation = null;
    this.pAnimation = null;
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    this.container = container || document.body
    this.container.appendChild(canvas);
    this.ctx = canvas.getContext('2d');
  }

  drawBrow () {
    const brow = this.brow;
    const ctx = this.ctx;
    let x, y;
    ctx.beginPath();
    ctx.arc(0, 0, brow.radius + brow.thickness / 2, brow.start, brow.end, true);
    x = brow.radius * Math.cos(brow.end);
    y = brow.radius * Math.sin(brow.end);
    ctx.arc(x, y, brow.thickness / 2, brow.end, brow.end + Math.PI, true);
    ctx.arc(0, 0, brow.radius - brow.thickness / 2, brow.end, brow.start, false);
    x = brow.radius * Math.cos(brow.start);
    y = brow.radius * Math.sin(brow.start);
    ctx.arc(x, y, brow.thickness / 2, brow.start, brow.start + Math.PI, false);
    ctx.fill();
  }

  drawPupil () {
    const pupil = this.pupil;
    const ctx = this.ctx;
    ctx.beginPath();
    // left
    if (pupil.gaze - pupil.width / 2 >= deg(90)) {
      ctx.arc(0, 0, pupil.radius, deg(90), deg(270));
    } else {
      ctx.save();
      const left = Math.max(Math.min(pupil.gaze - pupil.width / 2, 0), deg(-180))
      ctx.scale(Math.cos(left), 1);
      ctx.arc(0, 0, pupil.radius, deg(90), deg(270));
      ctx.restore();
    }
    // right
    if (pupil.gaze + pupil.width / 2 <= deg(-90)) {
      ctx.arc(0, 0, pupil.radius, deg(270), deg(90));
    } else {
      ctx.save();
      const right = Math.min(Math.max(pupil.gaze + pupil.width / 2, 0), deg(180))
      ctx.scale(Math.cos(right), 1);
      ctx.arc(0, 0, pupil.radius, deg(270), deg(90));
      ctx.restore();
    }
    ctx.fill();
  }

  draw () {
    const ctx = this.ctx;
    const w = this.ctx.canvas.width;
    const h = this.ctx.canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = this.color;
    this.drawBrow(this.brow);
    this.drawPupil(this.pupil);
    ctx.restore();
  }
  
  setAnimation (anim) {
    if (this.pAnimation) this.pAnimation.stop();
    if (this.bAnimation) this.bAnimation.stop();

    let bFrames, pFrames;
    switch (anim) {
      case 'looking':
        bFrames = [browFrames[0]];
        pFrames = pupilFrames.slice(1, 5).concat([pupilFrames[1]]);
        break;
      default:
        bFrames = [browFrames[0]];
        pFrames = [pupilFrames[0]];
    }
    
    const snap = easing.cubicBezier(0.2, 1, 0.2, 1);

    this.pAnimation = keyframes({
      values: pFrames,
      // times: [0, 0.25, 0.5, 0.75, 1],
      duration: 2000,
      loop: Infinity,
      easings: [snap, snap, snap, snap]
    }).start(p => this.pupil = p)

    this.bAnimation = keyframes({
      values: bFrames,
      // times: [0, 0.25, 0.5, 0.75, 1],
      duration: 2000,
      yoyo: Infinity,
      easings: [snap, snap, snap, snap]
    }).start(b => this.brow = b)
  }
  
  animate () {
    requestAnimationFrame(this.animate.bind(this));
    this.draw();
  }
}
