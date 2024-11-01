let cropper = null;
const loading = document.querySelector('.loading');
const error = document.querySelector('.error');
const preview = document.getElementById('preview');
const frame = document.getElementById('frame');
const uploadInput = document.getElementById('upload');
const downloadBtn = document.getElementById('downloadBtn');

function showError(message) {
    error.textContent = message;
    error.style.display = 'block';
    setTimeout(() => {
        error.style.display = 'none';
    }, 3000);
}

function updateFramePosition(cropper) {
    if (!cropper || !frame) return;

    try {
        const cropBoxData = cropper.getCropBoxData();
        const frameStyle = {
            width: `${cropBoxData.width}px`,
            height: `${cropBoxData.height}px`,
            left: `${cropBoxData.left}px`,
            top: `${cropBoxData.top}px`,
            display: 'block',
            position: 'absolute',
            zIndex: 100
        };

        Object.assign(frame.style, frameStyle);
    } catch (err) {
        console.error('Error updating frame position:', err);
    }
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
        showError('File size should be less than 16MB');
        return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload a valid image file (JPEG or PNG)');
        return;
    }

    loading.style.display = 'block';
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const img = new Image();
            img.onload = function() {
                preview.src = img.src;
                preview.style.display = 'block';

                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(preview, {
                    aspectRatio: 1,
                    viewMode: 3,  // Restrict view to within container
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    background: true,
                    responsive: true,
                    checkOrientation: true,
                    minContainerWidth: 100,
                    minContainerHeight: 100,
                    zoomOnWheel: true,
                    wheelZoomRatio: 0.1,
                    // Custom styling
                    modal: true,  // Show the black modal
                    // Initialize with contained view
                    ready: function() {
                        downloadBtn.disabled = false;
                        frame.style.display = 'block';
                        
                        // Get initial dimensions
                        const containerData = this.getContainerData();
                        const imageData = this.getImageData();
                        
                        // Calculate optimal initial zoom
                        const scale = Math.min(
                            containerData.width / imageData.naturalWidth,
                            containerData.height / imageData.naturalHeight
                        );
                        
                        // Center and zoom the image
                        this.zoomTo(scale);
                        this.moveTo(
                            (containerData.width - imageData.width * scale) / 2,
                            (containerData.height - imageData.height * scale) / 2
                        );
                        
                        updateFramePosition(this);

                        // Add custom class to container
                        this.container.classList.add('cropper-clean-mode');
                    },
                    cropstart: function(event) {
                        // Show more of the image when starting to drag
                        this.container.classList.remove('cropper-clean-mode');
                        frame.style.opacity = '0.8';
                    },
                    cropmove: function() {
                        updateFramePosition(this);
                    },
                    cropend: function(event) {
                        // Hide the excess image when done dragging
                        this.container.classList.add('cropper-clean-mode');
                        frame.style.opacity = '1';
                        updateFramePosition(this);
                    },
                    zoom: function(event) {
                        updateFramePosition(this);
                    }
                });

                // Add mouse event listeners with throttling
                let ticking = false;
                document.addEventListener('mousemove', function() {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            if (cropper) updateFramePosition(cropper);
                            ticking = false;
                        });
                        ticking = true;
                    }
                });

                // Add touch event listeners with throttling
                document.addEventListener('touchmove', function() {
                    if (!ticking) {
                        requestAnimationFrame(() => {
                            if (cropper) updateFramePosition(cropper);
                            ticking = false;
                        });
                        ticking = true;
                    }
                });
            };

            img.onerror = function() {
                showError('Failed to load image');
            };

            img.src = 'data:image/jpeg;base64,' + data.image;
        } else {
            showError(data.error || 'Upload failed');
        }
    } catch (err) {
        console.error('Upload error:', err);
        showError('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
        loading.style.display = 'none';
    }
}

async function handleDownload() {
    if (!cropper) return;

    loading.style.display = 'block';
    try {
        const canvas = cropper.getCroppedCanvas({
            width: 1024,
            height: 1024,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        const imageData = canvas.toDataURL('image/jpeg', 1.0);

        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData: imageData })
        });

        if (!response.ok) {
            throw new Error('Generation failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'framed_image.jpg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        showError('Failed to generate image');
        console.error('Error:', err);
    } finally {
        loading.style.display = 'none';
    }
}

uploadInput.addEventListener('change', handleFileUpload);
downloadBtn.addEventListener('click', handleDownload);

button.classList.add('loading');
button.classList.remove('loading');