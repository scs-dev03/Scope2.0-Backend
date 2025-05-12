import sql from 'mssql'
import moment from "moment";

   const bulkJCBInsertPOData=async function(data,pool, dealer, location,res) {
        let isNullFound=false;
        // console.log(data);
         let part_number=data[0]["material no"];
        // console.log("part number in jcb ",part_number)
       let brandId=32;
       let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
       const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
      // console.log("result in jcb ",result)
       if(result.length==0){
        // let tableNamePO='JCB_PO_file_lead_time_latest_data';
        // let tableNameMRN='JCB_mrn_file_lead_time_latest_data'
        // let query1=`TRUNCATE TABLE ${tableNamePO}`
        // let query2=`TRUNCATE TABLE ${tableNameMRN}`
        // await pool.request().query(query1);
        // await pool.request().query(query2);
        return {poFailed:true}
       }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["material no"] || item["material no"]==0){
                console.log("item po ",item)
                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
        const values = data.map(item => 
            {
                const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
                const Location = location || item["location"]; 
                return [
                // Ensure item properties are in lowercase as per your request
                Location,
                item["order no"], // order no
                item["vendor"], // vendor
                item["order ref no"], // order ref no
                item["ordtype"], // ordtype
                item["material no"], // material no
                item["ord date"] !== "0-00-00" && item["ord date"] !== null ? item["ord date"] : null, // ord date
                item["ordqty"] !== null && !isNaN(parseFloat(item["ordqty"])) ? parseFloat(item["ordqty"]) : null, // ordqty
                Dealer,
                
            ]
            } 
    );
         await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table(`JCB_PO_file_lead_time_latest_data`); // Use exact table name
        table.create = false;
    
        // Define columns as per the CREATE TABLE statement exactly (case-sensitive in SQL)
        table.columns.add('Branch Name', sql.VarChar(250), { nullable: true }); // Branch Name
        table.columns.add('Order No', sql.VarChar(50), { nullable: true }); // Order No
        table.columns.add('Vendor', sql.VarChar(50), { nullable: true }); // Vendor
        table.columns.add('Order Ref No', sql.VarChar(50), { nullable: true }); // Order Ref No
        table.columns.add('OrdType', sql.VarChar(50), { nullable: true }); // OrdType
        table.columns.add('Material No', sql.VarChar(50), { nullable: true }); // Material No
        table.columns.add('Ord Date', sql.Date, { nullable: true }); // Ord Date
        table.columns.add('OrdQty', sql.Float, { nullable: true }); // OrdQty
        table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // Dealer
        // table.columns.add('Location', sql.VarChar(100), { nullable: true }); // [Dealer]
    
        // Add rows to the table, matching the column order in `table.columns.add()`
        values.forEach((row) => {
            table.rows.add(
                row[0],  // location
                row[1], // order no
                row[2], // vendor
                row[3], // order ref no
                row[4], // ordtype
                row[5], // material no
                row[6], // ord date
                row[7], // ordqty
                row[8], // dealer
            );
        });
    
        const request = pool.request();
        await request.query('TRUNCATE TABLE JCB_PO_file_lead_time_latest_data');
        // Execute the bulk insert
        await request.bulk(table);
        }
      

    }
    

  const  bulkJCBInsertMRNData=async function(data,pool, dealer, location,res) {

        // console.log('----------------------it is executing',data[0])
        let isNullFound=false;
        let part_number=data[0]["part code"];
        //console.log("data in jcb bulk data 97 ",data)
        let brandId=32;
        let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
        const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
        // console.log("result in jcb ",result)
        if(result.length==0){
        //     let tableNamePO='JCB_PO_file_lead_time_latest_data';
        // let tableNameMRN='JCB_mrn_file_lead_time_latest_data'
        // let query1=`TRUNCATE TABLE ${tableNamePO}`
        // let query2=`TRUNCATE TABLE ${tableNameMRN}`
        // await pool.request().query(query1);
        // await pool.request().query(query2);
            return {mrnFailed:true}
        }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["part code"] || item["part code"]==0){
                console.log("item ",item)
                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
        const values = data.map(item => {
          // console.log(item)
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
            const Location = location || item["location"]; 
            return [
            // Ensure item properties are in lowercase as per your request
             Location, // [Branch]
            item["order no"], // [Order No]
            item["jcbinvdt"] !== "0-00-00" && item["jcbinvdt"] !== null ? item["jcbinvdt"] : null, // [JcbInvDt]
            item["grn date"] !== "0-00-00" && item["grn date"] !== null ? item["grn date"] : null, // [GRN Date]
            item["part code"], // [Part Code]
            item["qty"] !== null && !isNaN(parseFloat(item["qty"])) ? parseFloat(item["qty"]) : null, // [Qty]
            Dealer, // [Dealer],
        ]
        }
    );
    await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table(`JCB_mrn_file_lead_time_latest_data`); // Use exact table name
        table.create = false;
    
        // Define columns using the exact column names you provided
        table.columns.add('Branch', sql.VarChar(250), { nullable: true }); // [Branch]
        table.columns.add('Order No', sql.VarChar(50), { nullable: true }); // [Order No]
        table.columns.add('JcbInvDt', sql.Date, { nullable: true }); // [JcbInvDt]
        table.columns.add('GRN Date', sql.Date, { nullable: true }); // [GRN Date]
        table.columns.add('Part Code', sql.VarChar(50), { nullable: true }); // [Part Code]
        table.columns.add('Qty', sql.Float, { nullable: true }); // [Qty]
        table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // [Dealer]
        //  table.columns.add('Location', sql.VarChar(100), { nullable: true }); // [Dealer]
    
        // Add rows to the table, matching the column order in `table.columns.add()`
        values.forEach((row) => {
            table.rows.add(
                row[0],  // [Branch]
                row[1],  // [Order No]
                row[2],  // [JcbInvDt]
                row[3],  // [GRN Date]
                row[4],  // [Part Code]
                row[5],  // [Qty]
                row[6],  // [Dealer]
                // row[7],
            );
        });
    
        const request = pool.request();
        await request.query('TRUNCATE TABLE JCB_mrn_file_lead_time_latest_data');
        // Execute the bulk insert
        await request.bulk(table);
        }
       
    }

function excelSerialToDate(serialNumber) {
    // Excel date starts at January 1, 1900, so we calculate the date from that point.
    const excelStartDate = new Date(1900, 0, 1); // January 1, 1900
    excelStartDate.setHours(0, 0, 0, 0); // Set the start of the day at midnight
  
    // Excel uses 1 as day 1, so we adjust by subtracting 1 day.
    const millisecondsInADay = 24 * 60 * 60 * 1000;
    const date = new Date(
      excelStartDate.getTime() + (serialNumber - 2) * millisecondsInADay
    );
    return date;
  }
  
  function convertToIST(date) {
    // Convert to UTC first (just to make sure we're handling time correctly)
    const utcDate = new Date(date.toUTCString());
  
    // IST is UTC +5:30, so add 5 hours and 30 minutes to the UTC date
    utcDate.setHours(utcDate.getHours() + 5);
    utcDate.setMinutes(utcDate.getMinutes() + 30);
  
    return utcDate;
  }
  
  function convertExcelSerialToIST(serialNumber) {
    if (!serialNumber || isNaN(serialNumber)) {
        // console.log(item)
      console.error("Invalid serial number:", serialNumber);
      return null;
    }
  
    // Step 1: Convert Excel serial number to JavaScript Date
    const date = excelSerialToDate(serialNumber);
  
    // Step 2: Adjust the time for IST (UTC +5:30)
    const istDate = convertToIST(date);
  
    // Step 3: Format the date to a SQL-friendly string (YYYY-MM-DD)
    const formattedDate = moment(istDate).format("YYYY-MM-DD");
    // console.log("Converted date: ", formattedDate);
  
    formatDate=new Date(formattedDate);
    return formatDate;
  }

export {bulkJCBInsertPOData,bulkJCBInsertMRNData}
