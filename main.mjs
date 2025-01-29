import { run_model } from './yolo.mjs';

const video = document.getElementById('vid1');
const c2 = document.getElementById('c2');
const ctx = c2.getContext('2d');

// HOT RELOADING
const socket = new WebSocket('ws://localhost:13258');
socket.onopen = function(event) {console.log('ws connected');};
socket.onmessage = function(event) {if (event.data === 'reload') {window.location.reload();}};
socket.onclose = function(event) {console.log('ws disconnected');};

/**
 * A minimal 2D vector class
 */
class V2 {
  constructor(x,y){
    this.x = x;
    this.y = y;
  }

  /**Subtraction of two vectors */
  static sub(v1,v2){
    return new V2(v1.x - v2.x, v1.y - v2.y)
  }

  /**Normalize the vector */
  normalize(){
    const norm = Math.sqrt(this.x**2 + this.y**2)
    this.x /= norm
    this.y /= norm
    return this
  }
}

/**
 * Compute the angle between the collar bone and the upper arm.
 * 
 * Collar bone is the line between the left and right shoulder keypoints.
 * Upper arm is the line between the shoulder and the elbow keypoints.
 * report for both arms the angle that the collar bone comes in from (in radians), and the angle that the arm goes out from the collar bone (in radians).
 * 
 * To be used with the 'arc' function in the canvas API
 * @param {*} keypoints 
 */
const arm_angles = function(keypoints){
  const left_shoulder = new V2(keypoints['Left Shoulder']['x'],keypoints['Left Shoulder']['y'])
  const right_shoulder = new V2(keypoints['Right Shoulder']['x'],keypoints['Right Shoulder']['y'])
  const left_elbow = new V2(keypoints['Left Elbow']['x'],keypoints['Left Elbow']['y'])
  const right_elbow = new V2(keypoints['Right Elbow']['x'],keypoints['Right Elbow']['y'])

  const collar_bone_unit_vector = V2.sub(right_shoulder,left_shoulder).normalize()

  const left_upper_arm_unit_vector = V2.sub(left_elbow,left_shoulder).normalize()
  const right_upper_arm_unit_vector = V2.sub(right_elbow,right_shoulder)

  const left_cb = Math.atan2(collar_bone_unit_vector.y,collar_bone_unit_vector.x)
  const right_cb = Math.atan2(-collar_bone_unit_vector.y,-collar_bone_unit_vector.x)
  const left_out = Math.atan2(left_upper_arm_unit_vector.y,left_upper_arm_unit_vector.x)
  const right_out = Math.atan2(right_upper_arm_unit_vector.y,right_upper_arm_unit_vector.x)

  const out = {'left_in':left_cb, 'right_in':right_cb, 'left_out':left_out, 'right_out':right_out}
  return out
}

let computeFrame = async function() {

  //blit the video frame to the canvas
  ctx.drawImage(video, 0, 0, c2.width, c2.height); 

  // run the model on the canvas
  const inference_result = await run_model(ctx);

  // render the inference results
  for (const res of inference_result){

    // draw the bounding box
    const w = res['bbox'][2]
    const h = res['bbox'][3]
    const x = res['bbox'][0] - w/2
    const y = res['bbox'][1] - h/2
    ctx.strokeStyle = 'black';
    ctx.strokeRect(x,y,w,h);

    // draw the keypoints
    for (const kpt of ['Left Shoulder','Right Shoulder','Left Elbow','Right Elbow']){
      const lex = res['keypoints'][kpt]['x']
      const ley = res['keypoints'][kpt]['y']
      const r = 10
      ctx.beginPath()
      ctx.arc(lex,ley,r,0,2*Math.PI)
      ctx.fillStyle = 'red';
      ctx.fill()
    }

    // draw the angles of the arms
    const angles = arm_angles(res['keypoints'])
    const lsx = res['keypoints']['Left Shoulder']['x'];
    const lsy = res['keypoints']['Left Shoulder']['y'];
    const rsx = res['keypoints']['Right Shoulder']['x'];
    const rsy = res['keypoints']['Right Shoulder']['y'];
    ctx.beginPath();
    ctx.arc(lsx,lsy, 50, angles['left_in'], angles['left_out']);
    ctx.strokeStyle = 'yellow';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rsx,rsy, 50, angles['right_in'], angles['right_out']);
    ctx.stroke();

    // label the shoulders with the angles
    ctx.fillStyle = 'yellow';
    ctx.font = '20px sans-serif';
    ctx.fillText(((180/Math.PI)*(angles['left_out']-angles['left_in'])).toFixed(1),lsx,lsy);
    ctx.fillText(((180/Math.PI)*(angles['right_out']-angles['right_in'])).toFixed(1),rsx,rsy);

    // draw line from left elbow to right elbow via the collar bone
    for (const kpts of [
      ['Left Elbow','Left Shoulder'],
      ['Right Elbow','Right Shoulder'],
      ['Left Shoulder','Right Shoulder']]){
        const x1 = res['keypoints'][kpts[0]]['x']
        const y1 = res['keypoints'][kpts[0]]['y']
        const x2 = res['keypoints'][kpts[1]]['x']
        const y2 = res['keypoints'][kpts[1]]['y']
        ctx.beginPath()
        ctx.moveTo(x1,y1)
        ctx.lineTo(x2,y2)
        ctx.strokeStyle = 'yellow';
        ctx.stroke()
      }
  }
}

/**
 * The forwever loop that runs the model on the video frames
 * @returns nothing
 */
let timerCallback = async function(){
    if (video.paused || video.ended) {
        return;
    }
    await computeFrame();
    setTimeout(() => {timerCallback();}, 0);
}
video.addEventListener('play', () =>  timerCallback(),false);


/**
 * A strange function that starts off everything. It gets the video stream from the web cam, 
 * and feeds it into the video element (that is monitored by a callback on 'play')
 * 
 * @param {*} constraints 
 */
async function getMedia(constraints) {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      const vtracks = stream.getVideoTracks()[0];
      console.assert(vtracks.kind === 'video');
      console.assert(vtracks.enabled === true);
      video.srcObject = stream;
      video.play()
    } catch (err) {
        console.error(err);
    }
  }

await getMedia({ video: true, audio: false });


