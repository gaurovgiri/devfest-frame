### Utility Functions

# Configuration
class Config:
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    OUTPUT_SIZE = (1024, 1024)
    FRAME_PATHS = {
        'participant': 'static/avatar-participant.png',
        'organizer': 'static/avatar-organizer.png'
    }
    QUALITY = 95

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
