import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { PDFDocument } from 'pdf-lib';


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

export default app;

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
