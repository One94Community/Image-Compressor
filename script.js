// DOM Elements
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const browseBtn = document.getElementById('browse-btn');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const previewContainer = document.getElementById('preview-container');
const fileList = document.getElementById('file-list');
const clearBtn = document.getElementById('clear-btn');
const compressAllBtn = document.getElementById('compress-all-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('compression-progress');
const progressText = document.getElementById('progress-text');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const batchDownload = document.getElementById('batch-download');

// State variables
let files = [];
let compressedFiles = [];

// Initialize the app
function init() {
    setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
    browseBtn.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    qualitySlider.addEventListener('input', updateQualityValue);
    clearBtn.addEventListener('click', clearAllFiles);
    compressAllBtn.addEventListener('click', compressAllFiles);
    downloadAllBtn.addEventListener('click', downloadAllAsZip);
}

// Handle file selection
function handleFileSelect() {
    const newFiles = Array.from(fileInput.files);
    
    // Validate files
    const validFiles = validateFiles(newFiles);
    
    if (validFiles.length === 0) {
        if (newFiles.length > 0) {
            showError('No valid images selected. Please select JPEG, PNG, or WEBP files under 5MB.');
        }
        return;
    }
    
    // Add valid files to our files array
    addFiles(validFiles);
}

// Validate selected files
function validateFiles(newFiles) {
    return newFiles.filter(file => {
        // Check if file is an image
        if (!file.type.match('image.*')) {
            showError(`Skipped non-image file: ${file.name}`);
            return false;
        }
        
        // Check file size
        if (file.size > 5 * 1024 * 1024) {
            showError(`Skipped large file: ${file.name} (max 5MB)`);
            return false;
        }
        
        // Check if file already exists
        if (files.some(f => 
            f.name === file.name && 
            f.size === file.size && 
            f.lastModified === file.lastModified
        )) {
            showError(`Skipped duplicate file: ${file.name}`);
            return false;
        }
        
        // Check total files limit
        if (files.length >= 20) {
            showError('Maximum 20 files allowed');
            return false;
        }
        
        return true;
    });
}

// Add valid files to the files array
function addFiles(validFiles) {
    files = [...files, ...validFiles];
    errorMessage.textContent = '';
    successMessage.textContent = '';
    updateFileList();
    updateControls();
}

// Update the file list display
function updateFileList() {
    fileList.innerHTML = '';
    fileList.style.display = files.length ? 'block' : 'none';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <span class="file-name" title="${file.name}">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button class="remove-btn" data-index="${index}">×</button>
        `;
        
        fileList.appendChild(fileItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            removeFile(index);
        });
    });
}

// Remove a file from the list
function removeFile(index) {
    files.splice(index, 1);
    updateFileList();
    updateControls();
    
    // Remove corresponding preview if exists
    const previewBox = document.getElementById(`preview-${index}`);
    if (previewBox) previewBox.remove();
    
    if (files.length === 0) {
        clearAllFiles();
    }
}

// Clear all files and reset the app
function clearAllFiles() {
    files = [];
    compressedFiles = [];
    previewContainer.innerHTML = '';
    fileList.style.display = 'none';
    batchDownload.style.display = 'none';
    updateControls();
    errorMessage.textContent = '';
    successMessage.textContent = '';
    fileInput.value = '';
}

// Update control buttons state
function updateControls() {
    clearBtn.disabled = files.length === 0;
    compressAllBtn.disabled = files.length === 0;
}

// Update quality value display
function updateQualityValue() {
    qualityValue.textContent = qualitySlider.value;
}

// Compress all selected files
function compressAllFiles() {
    if (files.length === 0) return;
    
    previewContainer.innerHTML = '';
    compressedFiles = [];
    batchDownload.style.display = 'none';
    
    showProgress(0, files.length);
    
    const quality = parseInt(qualitySlider.value);
    let processed = 0;
    
    // Process files with small delay between each to prevent UI freezing
    files.forEach((file, index) => {
        setTimeout(() => {
            compressFile(file, index, quality).then(() => {
                processed++;
                updateProgress(processed, files.length);
                
                if (processed === files.length) {
                    compressionComplete();
                }
            }).catch(error => {
                console.error('Error compressing file:', error);
                showError(`Error processing ${file.name}`);
                processed++;
                updateProgress(processed, files.length);
                
                if (processed === files.length) {
                    compressionComplete();
                }
            });
        }, index * 100);
    });
}

// Compress a single file
function compressFile(file, index, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions
                    const { width, height } = calculateDimensions(img);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG
                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }
                        
                        const compressedUrl = URL.createObjectURL(blob);
                        const compressedName = generateCompressedFileName(file.name);
                        
                        // Add to compressed files array
                        compressedFiles.push({
                            name: compressedName,
                            blob: blob,
                            url: compressedUrl,
                            size: blob.size,
                            originalSize: file.size,
                            width: width,
                            height: height
                        });
                        
                        // Create preview box
                        createPreviewBox(index, file, img, compressedUrl, blob, width, height);
                        
                        resolve();
                    }, 'image/jpeg', quality / 100);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Image loading failed'));
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('File reading failed'));
        };
        
        reader.readAsDataURL(file);
    });
}

// Calculate new image dimensions
function calculateDimensions(img) {
    let width = img.width;
    let height = img.height;
    
    const MAX_DIMENSION = 2000;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
        } else {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
        }
    }
    
    return { width, height };
}

// Generate compressed file name
function generateCompressedFileName(originalName) {
    const extension = originalName.split('.').pop();
    return `compressed_${originalName.replace(`.${extension}`, '')}.jpg`;
}

// Create preview box for a compressed image
function createPreviewBox(index, originalFile, originalImg, compressedUrl, compressedBlob, width, height) {
    const previewBox = document.createElement('div');
    previewBox.className = 'image-box';
    previewBox.id = `preview-${index}`;
    
    previewBox.innerHTML = `
        <h3 title="${originalFile.name}">${originalFile.name}</h3>
        <div class="image-comparison">
            <div>
                <img src="${originalImg.src}" alt="Original">
                <div class="image-info">
                    Original: ${formatFileSize(originalFile.size)}<br>
                    ${originalImg.width}×${originalImg.height}
                </div>
            </div>
            <div>
                <img src="${compressedUrl}" alt="Compressed">
                <div class="image-info">
                    Compressed: ${formatFileSize(compressedBlob.size)}<br>
                    ${width}×${height}<br>
                    <a href="${compressedUrl}" download="compressed_${originalFile.name}" class="btn download-btn">
                        Download
                    </a>
                </div>
            </div>
        </div>
    `;
    
    previewContainer.appendChild(previewBox);
}

// Download all compressed files as ZIP
function downloadAllAsZip() {
    if (compressedFiles.length === 0) return;
    
    showProgress(0, compressedFiles.length, 'Preparing ZIP');
    
    const zip = new JSZip();
    const folder = zip.folder("compressed_images");
    let added = 0;
    
    compressedFiles.forEach((file) => {
        folder.file(file.name, file.blob);
        added++;
        updateProgress(added, compressedFiles.length, 'Preparing ZIP');
        
        if (added === compressedFiles.length) {
            zip.generateAsync({ type: "blob" })
                .then(function(content) {
                    saveAs(content, "compressed_images.zip");
                    hideProgress();
                })
                .catch(error => {
                    console.error('Error creating ZIP:', error);
                    showError('Error creating ZIP file');
                    hideProgress();
                });
        }
    });
}

// Show progress indicator
function showProgress(current, total, action = 'Compressing') {
    progressContainer.style.display = 'block';
    progressBar.value = (current / total) * 100;
    progressText.textContent = `${action} (${current}/${total})`;
}

// Update progress indicator
function updateProgress(current, total, action = 'Compressing') {
    progressBar.value = (current / total) * 100;
    progressText.textContent = `${action} (${current}/${total})`;
}

// Hide progress indicator
function hideProgress() {
    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 500);
}

// Compression complete handler
function compressionComplete() {
    hideProgress();
    batchDownload.style.display = 'flex';
    successMessage.textContent = 'All images compressed successfully!';
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 5000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);