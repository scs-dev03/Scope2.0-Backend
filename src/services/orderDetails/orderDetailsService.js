import { getPool2 } from "../../db/db.js";
import sql from 'mssql'

const orderDetailsByPartnumberService = async(dealerid,locationid,partnumber,Udate,Ldate)=>{
    try {
        const pool = await getPool2()
    //     const query = `
    //     select distinct pm.partnumber1 , pm.partdesc , pm.mrp , ogs.scsOrderno, ogs.openingStock , ooq , ogs.addeddate , sn.Maxvalue 
    //     from [10.10.152.17].[z_scope].dbo.OGS_OrderData_TD001_${dealerid} ogs
    //     left join Stockable_Nonstockable_TD001_${dealerid} sn on sn.Locationid = ogs.locationid and sn.partnumber = ogs.partnumber
    //     left join LocationInfo li on li.LocationID = ogs.locationid 
    //     left join Part_Master pm on pm.brandid = ogs.brandid and pm.partnumber1 = ogs.partnumber
    //     where ogs.partnumber = '${partnumber}' and ogs.locationid = ${locationid}
    //     and sn.Stockdate = (select max(stockdate) from Stockable_Nonstockable_TD001_${dealerid})
    //     and ogs.addeddate >= ${Udate} and ogs.addeddate <= ${Ldate}
    //     order by addeddate desc`
    // //    console.log(query);
       
    //     const result = await pool.request().query(query)

//     const query = `
//     SELECT DISTINCT 
//     pm.partnumber1, pm.partdesc, pm.mrp, ogs.scsOrderno, ogs.openingStock, ooq, ogs.addeddate, sn.Maxvalue , ogs.FinalOrderQty, ito.transferfrombranch
//     FROM [10.10.152.17].[z_scope].dbo.OGS_OrderData_TD001_${dealerid} ogs
//     left join [10.10.152.17].[z_scope].dbo.OGS_SOTD_IndentTransferOrder_TD001_8 ito on ogs.partnumber = ito.partnumber and ogs.locationid = ito.locationid
//     LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
//     ON sn.Locationid = ogs.locationid AND sn.partnumber = ogs.partnumber
//     LEFT JOIN LocationInfo li ON li.LocationID = ogs.locationid 
//     LEFT JOIN Part_Master pm ON pm.brandid = ogs.brandid AND pm.partnumber1 = ogs.partnumber
//     WHERE ogs.partnumber = @partnumber 
//     AND ogs.locationid = @locationid
//     AND sn.Stockdate = (SELECT MAX(stockdate) FROM Stockable_Nonstockable_TD001_${dealerid})
//     AND ogs.addeddate >= @Udate AND ogs.addeddate <= @Ldate
//     ORDER BY addeddate DESC
// `;\

const query = `
SELECT DISTINCT 
pm.partnumber1, pm.partdesc,pm.Category, pm.mrp,pm.landedcost,ooq, ogs.scsOrderno, ogs.OpeningStock, 
ogs.OrderQtyPlaced,ogs.DealerRemarks, ogs.addeddate, ito.transferfrombranch , ogs.FinalOrderQty
FROM [10.10.152.17].[z_scope].dbo.OGS_OrderData_TD001_${dealerid} ogs
left join [10.10.152.17].[z_scope].dbo.OGS_SOTD_IndentTransferOrder_TD001_8 ito on ogs.scsorderno = ito.scsorderno
LEFT JOIN LocationInfo li ON li.LocationID = ogs.locationid 
--left join currentstock1 cs1 on cs1.LocationID = li.locationid
--left join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = ogs.partnumber
LEFT JOIN Part_Master pm ON pm.brandid = ogs.brandid AND pm.partnumber1 = ogs.partnumber
WHERE ogs.partnumber = @partnumber AND ogs.locationid = @locationid
AND ogs.addeddate >=  @Udate AND ogs.addeddate <= @Ldate
ORDER BY addeddate DESC
`

const result = await pool.request()
  .input('partnumber', partnumber)
  .input('locationid', locationid)
  .input('Udate',sql.DateTime ,Udate)
  .input('Ldate',sql.DateTime, Ldate)
  .query(query);

        return result
    } catch (error) {
        throw new Error(`orderDetailsByPartnumberService failed ${error.message}`)
    }
}

// function formatOrderData(input) {
//     const grouped = {};
//     // console.log(input);

//     input.forEach(entry => {
//         const key = entry.scsOrderno;

//         if (!grouped[key]) {
//         grouped[key] = {

//             partnumber1: entry.partnumber1,
//             partdesc: entry.partdesc,
//             Category: entry.Category,
//             mrp: entry.mrp,
//             landedcost: entry.landedcost,
//             transferDetails: []
//         };
//         }

//         grouped[key].transferDetails.push({
//             scsOrderno:entry.scsOrderno ,
//             addeddate: entry.addeddate,
//             transferfrombranch: entry.transferfrombranch || 0,
//             openingStock: entry.openingStock || 0,
//             ooq: entry.ooq ,
//             OrderQtyPlaced: entry.OrderQtyPlaced || 0,
//             DealerRemarks: entry.DealerRemarks || 'N/A',
//             FinalOrderQty: entry.FinalOrderQty || 0
//         });
//     });

//   return Object.values(grouped);
// }
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