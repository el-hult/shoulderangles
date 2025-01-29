# ShoulderAngles

A super simple app that estimates the angles in the shoulders based on YOLO pose estimation.
I developed it as a fun little thing since I have reduced mobility in my shoulders and wanted to see if I could make a simple tool to help me with my exercises.

 1. Run `./export_model.py` to download and serialize the appropriate model as ONNX.
 2. Run `./serve.py` to start the web server.

Denendencies are declared in the python files. If you have `uv` installed, just run the files and the shebang will sort out the dependencies.

💡 Inpiration is taken from these two sources:
 - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas
 - https://dev.to/andreygermanov/how-to-detect-objects-in-videos-in-a-web-browser-using-yolov8-neural-network-and-javascript-lfb

⚠️ Issues:
 - The model is not very accurate. I use the nano version, so a larger might be better.
 - It lags. I should look into using hardware acceleration, and not only CPU.
 - There is error because of 2d projection. This is probably not possible to deal with.