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

    const query = `
    SELECT DISTINCT 
    pm.partnumber1, pm.partdesc, pm.mrp, ogs.scsOrderno, ogs.openingStock, ooq, ogs.addeddate, sn.Maxvalue 
    FROM [10.10.152.17].[z_scope].dbo.OGS_OrderData_TD001_${dealerid} ogs
    LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
    ON sn.Locationid = ogs.locationid AND sn.partnumber = ogs.partnumber
    LEFT JOIN LocationInfo li ON li.LocationID = ogs.locationid 
    LEFT JOIN Part_Master pm ON pm.brandid = ogs.brandid AND pm.partnumber1 = ogs.partnumber
    WHERE ogs.partnumber = @partnumber 
    AND ogs.locationid = @locationid
    AND sn.Stockdate = (SELECT MAX(stockdate) FROM Stockable_Nonstockable_TD001_${dealerid})
    AND ogs.addeddate >= @Udate AND ogs.addeddate <= @Ldate
    ORDER BY addeddate DESC
`;

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

export {orderDetailsByPartnumberService}