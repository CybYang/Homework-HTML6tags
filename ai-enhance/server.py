# server.py
from flask import Flask, request, send_file
from PIL import Image, ImageFilter, ImageEnhance
import io

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    return response

def apply_enhancement(img):
    # 模拟 AI 对图像的处理
    # 锐化
    img = img.filter(ImageFilter.SHARPEN)
    
    # 对比度
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.2)
    
    # 亮度
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)
    
    return img

@app.route('/enhance', methods=['POST','OPTIONS'])
# 绑定URL路径和处理函数

def enhance_image():
    if request.method == 'OPTIONS':
        return Response(status=200)
    if 'image' not in request.files:
        return 'No image', 400
    
    # 读取上传的图片
    file = request.files['image']
    img = Image.open(file.stream)
    
    # 应用处理
    processed_img = apply_enhancement(img)
    
    # 返回处理后的图片
    img_io = io.BytesIO()
    processed_img.save(img_io, 'JPEG', quality=100)
    img_io.seek(0)
    
    return send_file(img_io, mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(port=5000, debug=True) # 只适用于开发环境