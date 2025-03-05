#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
# 'ultralytics',
# 'onnx',
# 'onnxruntime',
# 'onnxslim',
# ]
# ///
import ultralytics

# sizes of the models are n, s, m, l, x. All are same version (11 as of writing)
model_name = 'yolo11s-pose'
print("Loading YOLO model...")
model=ultralytics.YOLO(model_name+'.pt')
print('Exporting')
model.export(format='onnx')
print("Model exported to ONNX")

print("Starting to download the ONNX runtime files")
def download(url):
    """download a file from a url into current folder
    the last part of the url is used as the filename
    """
    import urllib.request
    import os
    filename = url.split('/')[-1]
    urllib.request.urlretrieve(url, filename)

download("https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js")
download("https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs")
download("https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm")
print("Downloaded ONNX runtime files")

