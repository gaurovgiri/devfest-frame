/**
 * DevFest Profile Frame Creator
 * A class to handle image upload, frame selection, cropping, and downloading functionality
 * for the DevFest profile picture frame creator.
 */
class FrameCreator {
    /**
     * Initialize the frame creator with all necessary elements and configurations
     */
    constructor() {
        // DOM Elements
        this.elements = {
            loading: document.querySelector('.loading'),
            error: document.querySelector('.error'),
            preview: document.getElementById('preview'),
            frame: document.getElementById('frame'),
            uploadInput: document.getElementById('upload'),
            downloadBtn: document.getElementById('downloadBtn'),
            frameOptions: document.querySelectorAll('input[name="frameType"]'),
            imageContainer: document.querySelector('.image-container')
        };

        // Cropper instance
        this.cropper = null;

        // Constants
        this.constants = {
            MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB
            VALID_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
            FRAME_PATHS: {
                participant: '/static/avatar-participant.png',
                organizer: '/static/avatar-organizer.png'
            },
            CROP_DIMENSIONS: {
                width: 1024,
                height: 1024
            },
            ERROR_DURATION: 3000,
            CROP_OPTIONS: {
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
                wheelZoomRatio: 0.1
            }
        };

        // Initialize the frame creator
        this.init();
    }

    /**
     * Initialize frame display and event listeners
     */
    init() {
        // Show initial frame and setup listeners
        this.initializeFrame();
        this.bindEventListeners();
    }

    /**
     * Initialize the frame with default selection
     */
    initializeFrame() {
        this.setFrameType('participant');
    }

    /**
     * Bind all necessary event listeners
     */
    bindEventListeners() {
        this.elements.uploadInput.addEventListener('change', this.handleFileUpload.bind(this));
        this.elements.downloadBtn.addEventListener('click', this.handleDownload.bind(this));
        this.elements.frameOptions.forEach(option => {
            option.addEventListener('change', this.handleFrameChange.bind(this));
        });
    }

    /**
     * Display error message to user
     * @param {string} message - Error message to display
     * @param {number} duration - Duration to show error message
     */
    showError(message, duration = this.constants.ERROR_DURATION) {
        const { error } = this.elements;
        error.textContent = message;
        error.style.display = 'block';
        setTimeout(() => {
            error.style.display = 'none';
        }, duration);
    }

    /**
     * Toggle loading state
     * @param {boolean} show - Whether to show or hide loading indicator
     */
    toggleLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
    }

    /**
     * Set frame type and update display
     * @param {string} frameType - Type of frame to display
     */
    setFrameType(frameType) {
        const framePath = this.constants.FRAME_PATHS[frameType];
        if (framePath) {
            this.elements.frame.src = framePath;
            this.elements.frame.style.display = 'block';
        }
    }

    /**
     * Handle frame type change event
     * @param {Event} e - Change event from frame type radio buttons
     */
    handleFrameChange(e) {
        const frameType = e.target.value;
        this.setFrameType(frameType);
        
        if (this.cropper) {
            this.updateFramePosition();
        }
    }

    /**
     * Update frame position based on crop box
     */
    updateFramePosition() {
        const { frame } = this.elements;
        if (!this.cropper || !frame) return;

        try {
            const cropBoxData = this.cropper.getCropBoxData();
            Object.assign(frame.style, {
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

    /**
     * Initialize and setup the cropper instance
     * @param {HTMLImageElement} img - Image element to crop
     */
    setupCropper(img) {
        const { preview, downloadBtn, frame, imageContainer } = this.elements;
        
        // Setup preview image
        preview.src = img.src;
        preview.style.display = 'block';
        imageContainer.classList.add('image-uploaded');

        // Destroy existing cropper if any
        if (this.cropper) {
            this.cropper.destroy();
        }

        // Create new cropper instance with custom configuration
        this.cropper = new Cropper(preview, {
            ...this.constants.CROP_OPTIONS,
            ready: () => {
                downloadBtn.disabled = false;
                frame.style.opacity = '1';
                
                const containerData = this.cropper.getContainerData();
                const imageData = this.cropper.getImageData();
                
                // Calculate optimal initial zoom
                const scale = Math.min(
                    containerData.width / imageData.naturalWidth,
                    containerData.height / imageData.naturalHeight
                );
                
                // Center and zoom the image
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
                frame.style.opacity = '0.8';
            },
            cropmove: () => this.updateFramePosition(),
            cropend: () => {
                this.cropper.container.classList.add('cropper-clean-mode');
                frame.style.opacity = '1';
                this.updateFramePosition();
            },
            zoom: () => this.updateFramePosition()
        });

        this.setupEventListeners();
    }

    /**
     * Setup performance-optimized event listeners for frame updates
     */
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

        // Add event listeners with passive flag for better performance
        document.addEventListener('mousemove', updateFrame, { passive: true });
        document.addEventListener('touchmove', updateFrame, { passive: true });
    }

    /**
     * Validate uploaded file
     * @param {File} file - File to validate
     * @returns {boolean} Whether file is valid
     */
    validateFile(file) {
        if (!file) return false;

        if (file.size > this.constants.MAX_FILE_SIZE) {
            this.showError('File size should be less than 16MB');
            return false;
        }

        if (!this.constants.VALID_TYPES.includes(file.type)) {
            this.showError('Please upload a valid image file (JPEG or PNG)');
            return false;
        }

        return true;
    }

    /**
     * Handle file upload event
     * @param {Event} e - Change event from file input
     */
    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!this.validateFile(file)) return;

        this.toggleLoading(true);
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
            this.toggleLoading(false);
        }
    }

    /**
     * Get current frame type selection
     * @returns {string} Selected frame type
     */
    getSelectedFrameType() {
        const selectedFrame = document.querySelector('input[name="frameType"]:checked');
        return selectedFrame ? selectedFrame.value : 'participant';
    }

    /**
     * Handle image download
     */
    async handleDownload() {
        if (!this.cropper) return;

        this.toggleLoading(true);
        try {
            const canvas = this.cropper.getCroppedCanvas({
                ...this.constants.CROP_DIMENSIONS,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            
            const imageData = canvas.toDataURL('image/jpeg', 1.0);
            const frameType = this.getSelectedFrameType();

            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageData, frameType })
            });

            if (!response.ok) {
                throw new Error('Generation failed');
            }

            // Handle successful download
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `devfest_${frameType}_frame.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Generation error:', err);
            this.showError('Failed to generate image');
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.cropper) {
            this.cropper.destroy();
        }
        // Remove event listeners
        document.removeEventListener('mousemove', this.updateFramePosition);
        document.removeEventListener('touchmove', this.updateFramePosition);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.frameCreator = new FrameCreator();
});

// Clean up on page unload
window.addEventListener('unload', () => {
    if (window.frameCreator) {
        window.frameCreator.destroy();
    }
});