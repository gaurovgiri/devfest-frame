from flask import Flask, render_template, request, jsonify, send_file
from PIL import Image
import os
import io
import base64
from utils import allowed_file

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['DEBUG'] = True
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        try: 
            img_data = base64.b64encode(file.read()).decode('utf-8')
            return jsonify({'success': True, 'image': img_data})
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/generate', methods=['POST'])
def generate_image():
    try:
        data = request.json
        image_data = data['imageData'].split(',')[1]  # Remove data URL prefix
        
        # Convert base64 to image
        img_data = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_data))
        
        # Convert image to RGBA mode if it isn't already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Load frame
        frame = Image.open('static/avatar.png')
        
        # Ensure frame is in RGBA mode
        if frame.mode != 'RGBA':
            frame = frame.convert('RGBA')
        
        # Resize frame to match image size
        frame = frame.resize(img.size, Image.LANCZOS)
        
        # Create a new blank image with alpha channel
        final_image = Image.new('RGBA', img.size, (0, 0, 0, 0))
        
        # Paste the user image first
        final_image.paste(img, (0, 0))
        
        # Paste the frame on top with transparency
        final_image.paste(frame, (0, 0), frame)
        
        # Convert to RGB before saving (remove transparency)
        final_image = final_image.convert('RGB')
        
        # Save result to bytes
        img_io = io.BytesIO()
        final_image.save(img_io, 'JPEG', quality=95)
        img_io.seek(0)
        
        return send_file(
            img_io,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='framed_image.jpg'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)