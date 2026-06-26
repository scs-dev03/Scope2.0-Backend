import 'dotenv/config';
import fs from 'fs';
import { Parser } from 'json2csv';
import path from 'path';
import { zipCsvFile } from '../utils/.csvtoZipservice.js';
import {getPool} from '../db/db.js'
import { PC_NM_Pool_Mailer } from '../models/BrandPoolQuery.js';

async function exportAndCheckSize({ query, filenamePrefix }) {
  try {
    const pool = getPool();
    const result = await pool.request().query(query);

    if (!result.recordset.length) {
      return { success: false, message: 'No data found' };
    }

    const parser = new Parser();
    const csv = parser.parse(result.recordset);

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${filenamePrefix}_${date}.csv`;
    const filePath = path.join(process.env.LOCAL_FOLDER, fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, csv);
    console.log("✅ File extracted successfully");

    const outputZipPath = path.join(process.env.LOCAL_FOLDER, `${filenamePrefix}_${date}.zip`);
    await zipCsvFile(filePath, outputZipPath);

    console.log('📦 CSV zipped successfully!');
    return {
      success: true,
      message: 'Exported and zipped successfully',
      outputZipPath,
      s3Key: `exports/${fileName}`
    };

  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

export {exportAndCheckSize}
