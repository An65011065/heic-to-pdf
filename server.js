require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch'); 
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { PDFDocument } = require('pdf-lib');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

const app = express();

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'upload',
    format: async (req, file) => 'jpeg', // Assuming direct conversion to jpeg is desired
    public_id: (req, file) => file.originalname,
  },
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

app.post('/upload', upload.array('heicFiles'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of req.files) {
    try {
      const response = await fetch(file.path);
      const arrayBuffer = await response.arrayBuffer();
      const jpgImage = await pdfDoc.embedJpg(Buffer.from(arrayBuffer));
      const jpgDims = jpgImage.scale(0.5);
      const page = pdfDoc.addPage([jpgDims.width, jpgDims.height]);
      page.drawImage(jpgImage, { x: 0, y: 0, width: jpgDims.width, height: jpgDims.height });
    } catch (error) {
      console.error('Error processing file:', error);
      return res.status(500).send('Error during file processing.');
    }
  }

  const pdfBytes = await pdfDoc.save();
  res.setHeader('Content-Type', 'application/pdf');
  const pdfName = `converted_files_${Date.now()}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${pdfName}"`);
  res.send(pdfBytes);
});

module.exports = app;
