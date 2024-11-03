import os
import io
import base64
from PIL import Image
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename

# Initialize Flask app
app = Flask(__name__, 
           static_folder='../static',    # Update static folder path
           template_folder='../templates' # Update templates folder path
)

# Configuration
class Config:
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    OUTPUT_SIZE = (1024, 1024)
    FRAME_PATHS = {
        'participant': os.path.join(app.static_folder, 'avatar-participant.png'),
        'organizer': os.path.join(app.static_folder, 'avatar-organizer.png')
    }
    QUALITY = 95

# Utility functions
def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def process_image_data(image_data_url):
    """Process base64 image data into a PIL Image."""
    try:
        # Remove data URL prefix if present
        if 'base64,' in image_data_url:
            image_data = image_data_url.split('base64,')[1]
        else:
            image_data = image_data_url
            
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1])
            image = background
        
        return image
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return None

def overlay_frame(base_image, frame_type='participant'):
    """Overlay the selected frame on the base image."""
    try:
        # Get frame path
        frame_path = Config.FRAME_PATHS.get(frame_type)
        if not frame_path or not os.path.exists(frame_path):
            raise ValueError(f"Frame not found: {frame_type}")

        # Open and resize frame
        frame = Image.open(frame_path)
        frame = frame.resize(Config.OUTPUT_SIZE, Image.Resampling.LANCZOS)

        # Ensure base image is in correct size
        base_image = base_image.resize(Config.OUTPUT_SIZE, Image.Resampling.LANCZOS)

        # Create final image
        final_image = Image.new('RGB', Config.OUTPUT_SIZE, (255, 255, 255))
        final_image.paste(base_image, (0, 0))
        
        # Handle frame with alpha channel
        if frame.mode == 'RGBA':
            final_image.paste(frame, (0, 0), frame)
        else:
            final_image.paste(frame, (0, 0))

        return final_image
    except Exception as e:
        print(f"Error overlaying frame: {str(e)}")
        return None

# Routes
@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle image upload and return base64 encoded image."""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400

        # Read and process image
        img = Image.open(file.stream)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1])
            img = background

        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format='JPEG', quality=Config.QUALITY)
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return jsonify({
            'success': True,
            'image': img_str
        })

    except Exception as e:
        print(f"Upload error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Error processing image'
        }), 500

@app.route('/generate', methods=['POST'])
def generate_frame():
    """Generate framed image from uploaded image and selected frame."""
    try:
        data = request.get_json()
        
        if not data or 'imageData' not in data:
            return 'No image data provided', 400

        # Get frame type
        frame_type = data.get('frameType', 'participant')
        if frame_type not in Config.FRAME_PATHS:
            return 'Invalid frame type', 400

        # Process base64 image
        image = process_image_data(data['imageData'])
        if not image:
            return 'Error processing image', 500

        # Create framed image
        final_image = overlay_frame(image, frame_type)
        if not final_image:
            return 'Error creating frame', 500

        # Save to buffer and return
        img_buffer = io.BytesIO()
        final_image.save(img_buffer, format='JPEG', quality=Config.QUALITY)
        img_buffer.seek(0)

        return send_file(
            img_buffer,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name=f'devfest_{frame_type}_frame.jpg'
        )

    except Exception as e:
        print(f"Generation error: {str(e)}")
        return 'Error generating image', 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    return jsonify({
        'success': False,
        'error': 'File is too large (max 16MB)'
    }), 413

@app.errorhandler(500)
def server_error(e):
    """Handle server errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# For local development
if __name__ == '__main__':
    app.run(debug=True)
