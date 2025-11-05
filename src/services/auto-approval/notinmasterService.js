import { getPool1 } from "../../db/db.js"
import sql from 'mssql'

// const insertPartNumbers = async(BrandId,data)=>{
//     const pool = await getPool1()
// //     console.log(data);
// //     const partnumbers = data.forEach(row => {
// //         row.PartNumber,
// //         BrandId
// //     });
// // console.log(partnumbers);
// const partnumbers = [...new Set(
//     (data || [])
//       .map(r => String(r?.PartNumber || '').trim())
//       .filter(pn => pn.length > 0)
//   )];

//   if (partnumbers.length === 0) return { inserted: 0 };

//   const table = new sql.Table('dbo.NotInMaster');
//   table.create = false;                          // table already exists
//   table.columns.add('PartNumber', sql.VarChar(30), { nullable: false });
//   table.columns.add('BrandId', sql.Int, { nullable: false });

//   partnumbers.forEach(pn => table.data.add(pn,BrandId));

//   await pool.request().bulk(table);              // throws on dupes unless you handle upstream
//   return { inserted: partnumbers.length };
// }

const insertPartNumbers = async (BrandId,DealerId,userId, data) => {
      
  const brandId = Number(BrandId);
  const dealerId = Number(DealerId);
  if (!Number.isInteger(brandId)) throw new Error('brandId must be an integer');
  if (!Number.isInteger(dealerId)) throw new Error('dealerId must be an integer');

  // Build distinct tuples: (BrandId, DealerId, LocationId, PartNumber)
  const tuples = [];
  const seen = new Set();

  for (const r of (data || [])) {
    const pn = String(r?.PartNumber || '').trim();
    const locId = Number(r?.LocationId);
    if (!pn || !Number.isInteger(locId)) continue;

    const key = `${brandId}|${dealerId}|${userId}|${locId}|${pn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tuples.push([brandId, dealerId,userId, locId, pn]);
  }

  if (tuples.length === 0) return { inserted: 0 };

  const pool = await getPool1();

  // Column order must match rows.add(...)
  const table = new sql.Table('dbo.NotInMaster');
  table.create = false;
  table.columns.add('BrandId',    sql.Int,        { nullable: false });
  table.columns.add('DealerId',   sql.Int,        { nullable: false });
  table.columns.add('Addedby',   sql.Int,         { nullable: true });
  table.columns.add('LocationId', sql.Int,        { nullable: false });
  table.columns.add('PartNumber', sql.VarChar(30),{ nullable: false });

  for (const t of tuples) table.rows.add(...t);

  await pool.request().bulk(table); // will error on dupes if you add a UNIQUE index (recommended)
  return { inserted: tuples.length };
};

export {insertPartNumbers}