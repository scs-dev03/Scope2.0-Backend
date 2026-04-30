import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

const zipCsvFile = (csvPath, outputZipPath) => {
  return new Promise((resolve, reject) => {
    // Create output stream for the zip file
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Highest compression
    });

    output.on('close', () => {
      console.log(`✅ Zip created: ${outputZipPath} (${archive.pointer()} total bytes)`);
      resolve(outputZipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append the CSV file to the zip
    const csvName = path.basename(csvPath); // Just the file name
    archive.file(csvPath, { name: csvName });

    archive.finalize();
  });
};

export {zipCsvFile}