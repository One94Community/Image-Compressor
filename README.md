# Image Compression Web App

A responsive web application for compressing images (both single and bulk) with adjustable quality settings. All processing happens client-side in the browser.


## Features

- **Dual Mode Compression**:
  - Single image compression
  - Bulk compression (up to 20 images at once)
  
- **Adjustable Quality**:
  - Quality slider from 10% to 90%
  - Smart resizing for large images (max 2000px dimension)

- **Visual Comparison**:
  - Side-by-side before/after comparison
  - File size and dimension information

- **Bulk Processing**:
  - ZIP download for all compressed images
  - Individual download options

- **Privacy Focused**:
  - No server processing - all done in browser
  - Your images never leave your computer

## Technologies Used

- HTML5, CSS3, JavaScript
- Canvas API for image processing
- JSZip for creating ZIP archives
- FileSaver.js for client-side file saving

## Installation

No installation required! This is a pure client-side application. You can:

1. **Use Online**: [Live Demo](#) (add your live URL here)
2. **Run Locally**:
   ```bash
   git clone https://github.com/One94community/image-compressor.git
   cd image-compressor
   # Open index.html in your browser
