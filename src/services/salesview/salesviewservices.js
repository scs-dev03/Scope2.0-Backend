import { getPool1 , getPool2} from "../../db/db.js"


// Part Details with location-wise part quality -> (stockable , non-stockable , non-moving)
const partDetailsservice = async (brandid,dealerid,locationid,partnumber,res)=>{
    try {
            const pool = getPool2()
            const query = `
            SELECT DISTINCT
                pm.partnumber, pm.partid,
                (CASE 
                  WHEN pm.partnumber = sm.partnumber THEN sm.subpartnumber 
                  ELSE pm.partnumber 
                END) AS LatestPartno,
                pm.partdesc, pm.moq, pm.category, 
                pm.landedcost, pm.mrp, pm.dateadded, pm.lastupdated ,
        		CASE
                WHEN os.greenflag = 'N' OR os.yellowflag = 'N' OR su.redflag = 'N' 
                THEN 'Non-Moving' 
                WHEN sn.Maxvalue = 0 THEN 'Non-Stockable'
        		WHEN sn.Maxvalue > 0 THEN 'Stockable'
            END AS Partstatus
              FROM part_master pm
              LEFT JOIN substitution_master sm ON pm.partnumber = sm.partnumber
        	  LEFT JOIN  Stockable_Nonstockable_TD001_${dealerid} sn on sn.locationid = ${locationid} and sn.partnumber1 = pm.partnumber1
        	  LEFT JOIN  Opening_Stock_Upload_TD001_${dealerid} os on os.Locationid = ${locationid} and pm.PartNumber = os.Partnumber1
        	  LEFT JOIN stock_upload_spm_td001_${dealerid} su ON su.locationid = ${locationid} AND pm.PartNumber1 = su.Partnumber1
              WHERE pm.partnumber1 in  (
            '${partnumber}') AND pm.brandid = ${brandid} `

            const result = await pool.request().query(query)
            return result
    } catch (error) {
            // return res.status(500).json({
            //     Error:error.message,
            //     Service:`partDetailsservice`
            // })
            throw new Error(`partfamilyDetailsservice failed: ${error.message}`);
    }
}

export {partDetailsservice}