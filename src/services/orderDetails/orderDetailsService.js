import { getPool2 } from "../../db/db.js";
import sql from 'mssql'

const orderDetailsByPartnumberService = async(brandid,dealerid,locationid,partnumber,Udate,Ldate)=>{
    try {
    const pool = await getPool2()
    
    const query = `
 DECLARE 
        @InputPart VARCHAR(40) = '${partnumber}',
        @InputBrandID INT = ${brandid},
        @InputLocationID INT = ${locationid},
        @RowsInserted INT;

        -- Drop temp table if exists
        IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
            DROP TABLE #PartFamily;

        -- Create PartFamily temp table
        CREATE TABLE #PartFamily (
            Part VARCHAR(40),
            BrandID INT
        );

        -- Seed with input part
        INSERT INTO #PartFamily (Part, BrandID)
        VALUES (@InputPart, @InputBrandID);

        -- Expand the part family
        SET @RowsInserted = 1;
        WHILE @RowsInserted > 0
        BEGIN
            INSERT INTO #PartFamily (Part, BrandID)
            SELECT DISTINCT sm.SubPartNumber1, sm.BrandID
            FROM Substitution_Master sm
            JOIN #PartFamily f ON sm.PartNumber1 = f.Part AND sm.BrandID = f.BrandID
            WHERE NOT EXISTS (
                SELECT 1 FROM #PartFamily x WHERE x.Part = sm.SubPartNumber1 AND x.BrandID = sm.BrandID
            )
            UNION
            SELECT DISTINCT sm.PartNumber1, sm.BrandID
            FROM Substitution_Master sm
            JOIN #PartFamily f ON sm.SubPartNumber1 = f.Part AND sm.BrandID = f.BrandID
            WHERE NOT EXISTS (
                SELECT 1 FROM #PartFamily x WHERE x.Part = sm.PartNumber1 AND x.BrandID = sm.BrandID
            );

            SET @RowsInserted = @@ROWCOUNT;
        END;
           select pf.Part , ogs.scsorderno , ogs.OpeningStock , ogs.ooq , ogs.OrderQtyPlaced,ogs.DealerRemarks, ogs.addeddate,ogs.FinalOrderQty,ito.transferfrombranch
		   from #PartFamily pf 
		    join [10.10.152.17].[z_scope].dbo.OGS_OrderData_TD001_${dealerid} ogs
		   on ogs.brandid = pf.BrandID and pf.Part = ogs.partnumber
		   left join [10.10.152.17].[z_scope].dbo.OGS_SOTD_IndentTransferOrder_TD001_${dealerid} ito 
		   on ogs.scsorderno = ito.scsorderno  and ito.partnumber = pf.Part
		   where ogs.locationid = @InputLocationID
       AND ogs.addeddate >=  @Ldate AND ogs.addeddate <= @Udate
      ORDER BY addeddate DESC
    `
// console.log(query);

    const result = await pool.request()
      .input('brandid', brandid)
      // .input('dealerid', dealerid)
      .input('partnumber', partnumber)
      .input('locationid', locationid)
      .input('Udate',sql.DateTime ,Udate)
      .input('Ldate',sql.DateTime, Ldate)
  .query(query);
// console.log(result);

        return result
    } catch (error) {
        throw new Error(`orderDetailsByPartnumberService failed ${error.message}`)
    }
}

function formatOrderData(input) {
    const grouped = {};
    // console.log(input);

    input.forEach(entry => {
        const key = entry.scsOrderno;

        if (!grouped[key]) {
        grouped[key] = {

            partnumber1: entry.partnumber1,
            partdesc: entry.partdesc,
            Category: entry.Category,
            mrp: entry.mrp,
            landedcost: entry.landedcost,
            transferDetails: []
        };
        }

        grouped[key].transferDetails.push({
            scsOrderno:entry.scsOrderno ,
            addeddate: entry.addeddate,
            transferfrombranch: entry.transferfrombranch || 0,
            openingStock: entry.openingStock || 0,
            ooq: entry.ooq ,
            OrderQtyPlaced: entry.OrderQtyPlaced || 0,
            DealerRemarks: entry.DealerRemarks || 'N/A',
            FinalOrderQty: entry.FinalOrderQty || 0
        });
    });

  return Object.values(grouped);
}

function transformOrderData(response1,response2) {
    // console.log(response2[0].Qty);
    
  if (!response1 || response1.length === 0) return {};

  const sample = response1[0]; // Assuming all rows share same static values
  const result = {
    partnumber1: sample.partnumber1,
    partdesc: sample.partdesc,
    Category: sample.Category,
    mrp: sample.mrp,
    landedcost: sample.landedcost,
    StockQty:response2[0].Qty,
    Data: []
  };

  response1.forEach(entry => {
    result.Data.push({
      scsOrderno: entry.scsOrderno,
      addeddate: entry.addeddate,
      transferfrombranch: entry.transferfrombranch || 0,
      OpeningStock: entry.OpeningStock || 0,
      ooq: entry.ooq,
      OrderQtyPlaced: entry.OrderQtyPlaced || 0,
      DealerRemarks: entry.DealerRemarks || "N/A",
      FinalOrderQty: entry.FinalOrderQty || 0
    });
  });

  return result;
}


export {orderDetailsByPartnumberService , transformOrderData }