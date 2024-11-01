class FrameCreator {
    constructor() {
        this.cropper = null;
        this.loading = document.querySelector('.loading');
        this.error = document.querySelector('.error');
        this.preview = document.getElementById('preview');
        this.frame = document.getElementById('frame');
        this.uploadInput = document.getElementById('upload');
        this.downloadBtn = document.getElementById('downloadBtn');

        this.init();
    }

    init() {
        this.uploadInput.addEventListener('change', this.handleFileUpload.bind(this));
        this.downloadBtn.addEventListener('click', this.handleDownload.bind(this));
    }

    showError(message, duration = 3000) {
        this.error.textContent = message;
        this.error.style.display = 'block';
        setTimeout(() => {
            this.error.style.display = 'none';
        }, duration);
    }

    updateFramePosition() {
        if (!this.cropper || !this.frame) return;

        try {
            const cropBoxData = this.cropper.getCropBoxData();
            Object.assign(this.frame.style, {
                width: `${cropBoxData.width}px`,
                height: `${cropBoxData.height}px`,
                left: `${cropBoxData.left}px`,
                top: `${cropBoxData.top}px`,
                display: 'block',
                position: 'absolute',
                zIndex: 100
            });
        } catch (err) {
            console.error('Error updating frame position:', err);
        }
    }

    setupCropper(img) {
        this.preview.src = img.src;
        this.preview.style.display = 'block';

        if (this.cropper) {
            this.cropper.destroy();
        }

        this.cropper = new Cropper(this.preview, {
            aspectRatio: 1,
            viewMode: 3,
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
            ready: () => {
                this.downloadBtn.disabled = false;
                this.frame.style.display = 'block';
                
                const containerData = this.cropper.getContainerData();
                const imageData = this.cropper.getImageData();
                
                const scale = Math.min(
                    containerData.width / imageData.naturalWidth,
                    containerData.height / imageData.naturalHeight
                );
                
                this.cropper.zoomTo(scale);
                this.cropper.moveTo(
                    (containerData.width - imageData.width * scale) / 2,
                    (containerData.height - imageData.height * scale) / 2
                );
                
                this.updateFramePosition();
                this.cropper.container.classList.add('cropper-clean-mode');
            },
            cropstart: () => {
                this.cropper.container.classList.remove('cropper-clean-mode');
                this.frame.style.opacity = '0.8';
            },
            cropmove: () => this.updateFramePosition(),
            cropend: () => {
                this.cropper.container.classList.add('cropper-clean-mode');
                this.frame.style.opacity = '1';
                this.updateFramePosition();
            },
            zoom: () => this.updateFramePosition()
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        let ticking = false;
        const updateFrame = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateFramePosition();
                    ticking = false;
                });
                ticking = true;
            }
        };

        document.addEventListener('mousemove', updateFrame, { passive: true });
        document.addEventListener('touchmove', updateFrame, { passive: true });
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 16 * 1024 * 1024) {
            this.showError('File size should be less than 16MB');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            this.showError('Please upload a valid image file (JPEG or PNG)');
            return;
        }

        this.loading.style.display = 'block';
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
                img.onload = () => this.setupCropper(img);
                img.onerror = () => this.showError('Failed to load image');
                img.src = 'data:image/jpeg;base64,' + data.image;
            } else {
                this.showError(data.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            this.showError('Upload failed: ' + (err.message || 'Unknown error'));
        } finally {
            this.loading.style.display = 'none';
        }
    }

    async handleDownload() {
        if (!this.cropper) return;

        this.loading.style.display = 'block';
        try {
            const canvas = this.cropper.getCroppedCanvas({
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
                body: JSON.stringify({ imageData })
            });

            if (!response.ok) {
                throw new Error('Generation failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'devfest_profile_frame.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Generation error:', err);
            this.showError('Failed to generate image');
        } finally {
            this.loading.style.display = 'none';
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new FrameCreator();
});