// Import necessary modules
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');
const { PDFDocument } = require('pdf-lib');

// Initialize Express app
const app = express();
const port = 3000; // You can choose any port that's available

// Configure Multer
const upload = multer({ dest: 'uploads/' });

// Serve static files from 'public' folder
app.use(express.static('public'));

// File upload route
app.post('/upload', upload.array('heicFiles'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
        const inputPath = file.path;

        try {
            // Convert HEIC to JPEG
            const inputBuffer = fs.readFileSync(inputPath);
            const outputBuffer = await convert({
                buffer: inputBuffer, 
                format: 'JPEG',      
                quality: 0.8         
            });

            // Add the JPEG as a page in the PDF
            const jpgImage = await pdfDoc.embedJpg(outputBuffer);
            const jpgDims = jpgImage.scale(0.5); // Scale image to 50% of its original size

            const page = pdfDoc.addPage([jpgDims.width, jpgDims.height]);
            page.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: jpgDims.width,
                height: jpgDims.height,
            });

            // Optionally delete the original uploaded file to clean up
            fs.unlinkSync(inputPath);

        } catch (error) {
            console.error('Error converting file:', error);
            return res.status(500).send('Error during file conversion.');
        }
    }

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();

    // Define the PDF file name and path
    const pdfName = `converted_files_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, 'uploads', pdfName);

    // Write PDF to disk
    fs.writeFileSync(pdfPath, pdfBytes);

    // Send the PDF file as a download to the client
    res.download(pdfPath, pdfName, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error downloading file.');
        }
        // Optionally delete the PDF file after sending it to the client
        fs.unlinkSync(pdfPath);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
