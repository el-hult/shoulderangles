
const model_name = 'yolo11s-pose.onnx'
let session = null;

const keypoint_dicts = [
    [0, 'Nose', 'green'],
    [1, 'Left Eye', 'red'],
    [2, 'Right Eye', 'red'],
    [3, 'Left Ear', 'blue'],
    [4, 'Right Ear', 'blue'],
    [5, 'Left Shoulder', 'red'],
    [6, 'Right Shoulder', 'red'],
    [7, 'Left Elbow', 'red'],
    [8, 'Right Elbow', 'red'],
    [9, 'Left Wrist', 'red'],
    [10, 'Right Wrist', 'red'],
    [11, 'Left Hip', 'red'],
    [12, 'Right Hip', 'red'],
    [13, 'Left Knee', 'red'],
    [14, 'Right Knee', 'red'],
    [15, 'Left Ankle', 'red'],
    [16, 'Right Ankle', 'red'],
]

/** @function bbox_similarity 
 * Compute the IOU, Intersection over Union.
 * It is 0 if the two bounding boxes are not overlapping
 * If the boxes are the same, it is 1
 * It computes the area of their intersection, and the area of their union
 * Finally, it divides the areas by eachother
 * 
 * @param bbox1 a js array of length 4, [x,y,w,h]
 * @param bbox2 as bbox1
 */
const bbox_similarity = function (bbox1, bbox2) {
    const x1 = Math.max(bbox1[0], bbox2[0]);
    const y1 = Math.max(bbox1[1], bbox2[1]);
    const x2 = Math.min(bbox1[0] + bbox1[2], bbox2[0] + bbox2[2]);
    const y2 = Math.min(bbox1[1] + bbox1[3], bbox2[1] + bbox2[3]);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const bbox1Area = bbox1[2] * bbox1[3];
    const bbox2Area = bbox2[2] * bbox2[3];
    const unionArea = bbox1Area + bbox2Area - intersectionArea;

    return intersectionArea / unionArea;
}

/**
 * Structure the output of the model
 * input data is a Float32Array of size 1*56*8400
 * there are 8400 bounding boxes, each with 56 datapoints
 * the 56 datapoints are:
 * 4 bounding box coordinates (x1, y1, x2, y2)
 * 1 confidence score between 0 and 1
 * 51 keypoints, each with 3 coordinates (x, y, is_visible)
 * 
 * HOWEVER! The output of the neural network is transposed, so it is really first 8400 bounding box x-coordinates,
 * then 8400 bounding box y-coordinates, then 8400 bounding box width, then 8400 bounding box height,
 * then 8400 bounding box confidence, then 8400 keypoints 1 x-coordinates, then 8400 keypoints 1 y-coordinates, etc.
 * @param Float32Array d the output of the model
 * @returns 
 */

const structure_output = function (d) {
    const THRESHOLD_CONF = 0.5
    const THRESH_SIMIL = 0.8
    let out = [];
    for (let j = 0; j < 8400; j++) {
        let confidence = d[4 * 8400 + j];
        if (confidence > THRESHOLD_CONF) {
            let bboxx = d[0 * 8400 + j];
            let bboxy = d[1 * 8400 + j];
            let bboxw = d[2 * 8400 + j];
            let bboxh = d[3 * 8400 + j];
            let bbox = [bboxx, bboxy, bboxw, bboxh];
            let keypoints = {}
            for (const q of keypoint_dicts) {
                let kpt_num = q[0]
                let kpt_name = q[1]
                keypoints[kpt_name] = {
                    x: d[(5 + kpt_num * 3 + 0) * 8400 + j],
                    y: d[(5 + kpt_num * 3 + 1) * 8400 + j],
                    visible: d[(5 + kpt_num * 3 + 2) * 8400 + j],
                }
            }
            out.push({ bbox: bbox, confidence: confidence, keypoints: keypoints });
        }
    }
    console.assert(out.length > 0, "No bounding boxes at all!")

    let out2 = []
    if (out.length > 0) {
        out2.push(out.shift())
    }
    while (out.length > 0) {
        const newer = out.shift()
        let is_new = true
        for (const older of out2) {
            if (bbox_similarity(newer['bbox'], older['bbox']) > THRESH_SIMIL) {
                is_new = false
                break
            }
        }
        if (is_new) {
            out2.push(newer)
        }
    }
    return out2;
}


/**
 * Obtain the image data from the canvas, and reshape it to the format expected by the YOLO model
 * It must be a 1D array of floats, with the values normalized to [0,1]
 * @param CanvasRenderingContext2D ctx 
 * @returns 
 */
const getImgData = function(ctx) {
  let frame = ctx.getImageData(0, 0, c2.width, c2.height);
  const data = frame.data;
  const red =[], green = [], blue = [];
  for (let i = 0; i < data.length; i += 4) {
    red.push(data[i]/255);
    green.push(data[i + 1]/255);
    blue.push(data[i + 2]/255);
  }
  const reshaped_data = [...red, ...green, ...blue];
  return reshaped_data;
}


/**
 * Take the image data from a canvas, and run the model on it
 * @param CanvasRenderingContext2D ctx 
 * @returns 
 */
export async function run_model(ctx) {
    const input = getImgData(ctx);
    const s = 640; // size of the image, 640x640
    console.assert(input.length === 3 * s * s);
    if (!session) {
        console.log('loading model .onnx');
        session = await ort.InferenceSession.create(model_name);
    }

    const yolo_input = new ort.Tensor(Float32Array.from(input), [1, 3, s, s]);
    const outputs = await session.run({ images: yolo_input });
    const outputs2 = outputs["output0"]; // network has 1 output named 'output0'
    console.assert(outputs2['dataLocation'] == 'cpu');
    console.assert(outputs2['dims'][0] == 1);
    console.assert(outputs2['dims'][1] == 56);
    console.assert(outputs2['dims'][2] == 8400);
    console.assert(outputs2['size'] == 1 * 56 * 8400);
    const data = outputs2['cpuData'];
    console.assert(data instanceof Float32Array);

    let inference_results = structure_output(data);
    return inference_results;
}
