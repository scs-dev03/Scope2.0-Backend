import sql from 'mssql'
import moment from "moment";

 const    bulkMahindraInsertPOData=async function(data,pool, dealer, location, res,headers) {
        try{
            let isNullFound=false;
            let part_number=data[0]["part no"];
            let brandId=9;
            let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
            const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
           // console.log("result in mahindra po",result)
            if(result.length==0){
                // let tableNamePO='Mahindra_PO_file_Lead_Time_Latest_Data';
                // let tableNameMRN='Mahindra_receipt_file_lead_Time_Latest_data'
                // let query1=`TRUNCATE TABLE ${tableNamePO}`
                // let query2=`TRUNCATE TABLE ${tableNameMRN}`
                // await pool.request().query(query1);
                // await pool.request().query(query2);
            //   return res.sendStatus(404).json({message:'Part Number does not exist'});
            return {poFailed:true}
            }
            
            for(let item of data){
                const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
            const Location = location || item["location"];
                if(!Dealer || !Location || !item["part no"] || item["part no"]==0){
                        isNullFound=true;
                        // console.log(Dealer,Location)
                        // console.log(item);
                        return isNullFound;
                        
                    
                }
            }
            if(!isNullFound){
            const values = data.map(item => 
                {
                   // console.log("item in po",item)
                    const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
                    const Location = location || item["location"]; 
                    
                    return [
                    // Adjust the mapping to fit the new column names
                    item["po release date"] !== "0-00-00" && item["po release date"] !== null ? item['po release date'] : null, // Po Release Date
                    item["po type"], // Po type
                    item["po status"], // po Status
                    item["po number"], // Po Number
                    item["po group"], // po group
                    item["po line item status"], // po line item status
                    item["po rejection reason"], // Po rejection reason
                    item["part no"], // Part No
                    item["so qty"] !== null && !isNaN(parseFloat(item["so qty"])) ? parseFloat(item["so qty"]) : null, // so qty
                    Dealer, // dealer (from function argument)
                    Location, // location (from function argument)
                ]
            });
            
                await pool.request().query('use UAD_BI_LEAD_TIME')
                const table = new sql.Table('Mahindra_PO_file_Lead_Time_Latest_Data'); // Use the exact table name
                table.create = false;
            
                // Define columns exactly as per your provided schema
                table.columns.add('Po Release Date', sql.Date, { nullable: true }); // Po Release Date
                table.columns.add('Po type', sql.VarChar(355), { nullable: true }); // Po type
                table.columns.add('po Status', sql.VarChar(250), { nullable: true }); // po Status
                table.columns.add('Po Number', sql.VarChar(50), { nullable: true }); // Po Number
                table.columns.add('po group', sql.VarChar(355), { nullable: true }); // po group
                table.columns.add('po line item status', sql.VarChar(250), { nullable: true }); // po line item status
                table.columns.add('Po rejection reason', sql.VarChar(355), { nullable: true }); // Po rejection reason
                table.columns.add('Part No', sql.VarChar(100), { nullable: true }); // Part No
                table.columns.add('so qty', sql.Float, { nullable: true }); // so qty
                table.columns.add('Dealer', sql.VarChar(355), { nullable: true }); // Dealer
                table.columns.add('Location', sql.VarChar(355), { nullable: true }); // Location
            
                // Add rows to the table, matching the column order in `table.columns.add()`
                values.forEach((row) => {
                    table.rows.add(
                        row[0],  // Po Release Date
                        row[1], // Po type
                        row[2], // po Status
                        row[3], // Po Number
                        row[4], // po group
                        row[5], // po line item status
                        row[6], // Po rejection reason
                        row[7], // Part No
                        row[8], // so qty
                        row[9], // dealer
                        row[10] // location
                    );
                });
            
                const request = pool.request();
                await request.query('TRUNCATE TABLE Mahindra_PO_file_Lead_Time_Latest_Data');
                // Execute the bulk insert
                await request.bulk(table);
                isColumnMatch=true;
                // return { status: 200, message: 'Bulk insert successful!',columns:expectedColumns};
            }
        }
        catch (error) {
            console.error("Error during bulk insert:", error);
            return { status: 500, message: 'Internal server error' };
        }
    
        
    }
    

  const  bulkMahindraInsertMRNData=async function(data,pool, dealer, location,res,headers) {
        // console.log('----------------------it is executing');
        let isNullFound=false;
        // console.log(data[2])
       
        data=data.slice(1);
        let part_number=data[0]["part number"];
        let brandId=9;
        let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
        const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
      //  console.log("result in mahindra ",result)
        if(result.length==0){
            // let tableNamePO='Mahindra_PO_file_Lead_Time_Latest_Data';
            //     let tableNameMRN='Mahindra_receipt_file_lead_Time_Latest_data'
            //     let query1=`TRUNCATE TABLE ${tableNamePO}`
            //     let query2=`TRUNCATE TABLE ${tableNameMRN}`
            //     await pool.request().query(query1);
            //     await pool.request().query(query2);
                return {mrnFailed:true}
        }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
            const Location = location || item["location"];
            
            if(!Dealer || !Location || !item["part number"] || item["part number"]==0){
                console.log(item,Dealer,Location)
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
            // Adjust field mappings to match new columns
            item["receipt date"] !== "0-00-00" && item["receipt date"] !== null 
                ? item['receipt date']
                : null, // [receipt date]
            
            item["invoice date"] !== "0-00-00" && item["invoice date"] !== null 
                ? item['invoice date']
                : null, // [Invoice Date]
            
            item["po number"], // [PO Number]
            
            item["party type"], // [party type]
            
            item["part number"], // [Part Number]
            
            item["received qty"] !== null && !isNaN(parseFloat(item["received qty"])) 
                ? parseFloat(item["received qty"]) 
                : null, // [received qty]
            
            item["invoice qty"] !== null && !isNaN(parseFloat(item["invoice qty"])) 
                ? parseFloat(item["invoice qty"]) 
                : null, // [Invoice Qty]
            
            Dealer, // [Dealer]
            
            Location // [Location]
        ]});
    
        await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table('Mahindra_receipt_file_lead_Time_Latest_data'); // Updated table name
        table.create = false;
    
        // Define columns using the exact column names from your new schema
        table.columns.add('receipt date', sql.Date, { nullable: true }); // [receipt date]
        table.columns.add('Invoice Date', sql.Date, { nullable: true }); // [Invoice Date]
        table.columns.add('PO Number', sql.VarChar(155), { nullable: true }); // [PO Number]
        table.columns.add('party type', sql.VarChar(255), { nullable: true }); // [party type]
        table.columns.add('Part Number', sql.VarChar(100), { nullable: true }); // [Part Number]
        table.columns.add('received qty', sql.Float, { nullable: true }); // [received qty]
        table.columns.add('Invoice Qty', sql.Float, { nullable: true }); // [Invoice Qty]
        table.columns.add('Dealer', sql.VarChar(355), { nullable: true }); // [Dealer]
        table.columns.add('Location', sql.VarChar(355), { nullable: true }); // [Location]
    
        // Add rows to the table, matching the column order in `table.columns.add()`
        values.forEach((row) => {
            table.rows.add(
                row[0],  // [receipt date]
                row[1],  // [Invoice Date]
                row[2],  // [PO Number]
                row[3],  // [party type]
                row[4],  // [Part Number]
                row[5],  // [received qty]
                row[6],  // [Invoice Qty]
                row[7],  // [Dealer]
                row[8]   // [Location]
            );
        });
    
        const request = pool.request();
        await request.query('TRUNCATE TABLE Mahindra_receipt_file_lead_Time_Latest_data');
        // Execute the bulk insert
        await request.bulk(table);
    }
    }
    
function columnsMatch(expected, uploaded) {
    // console.log("expected ",expected,uploaded)
    return expected.every(col => uploaded.includes(col));
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
  
  function convertExcelSerialToIST(serialNumber,item) {
    if (!serialNumber || isNaN(serialNumber)) {
    //     console.log(item)
    //   console.error("Invalid serial number:", serialNumber);
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

export {bulkMahindraInsertPOData,bulkMahindraInsertMRNData}
