import sql from 'mssql'
import moment  from 'moment';

 const   bulkRenaultInsertMRNData=async function(data,pool, dealer, location,res) {
        // console.log(data[0]);
        let isNullFound=false;
        let part_number=data[0]["part no"];
        let brandId=12;
        let query=`Select brandid from z_scope.dbo.VW_PartMaster where partno=@part_number and brandid=@brandId`;
        const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
      //  console.log("result in renault mrn",result)
        if(result.recordset.length==0){
            // let tableNameMRN='Renault_GRN_file_lead_time_latest_data';
            // let tableNamePO='Renault_POSBO_file_lead_time_latest_data'
            // let query1=`TRUNCATE TABLE ${tableNamePO}`
            // let query2=`TRUNCATE TABLE ${tableNameMRN}`
            // await pool.request().query(query1);
            // await pool.request().query(query2);
            return {mrnFailed:true}
        }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["part no"] || item["part no"]==0){
                    // console.log("mrn ",item)
                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
            // console.log("data ",data[0])
        const values = data.map(item => {

            let shippedQuantity = (item['shipped quantity'] !== null && !isNaN(parseFloat(item['shipped quantity']))) ? parseFloat(item['shipped quantity']) : null;
        let receiptQuantity = (item['receipt quantity'] !== null && !isNaN(parseFloat(item['receipt quantity']))) ? parseFloat(item['receipt quantity']) : null;
        
        if (shippedQuantity == null || isNaN(shippedQuantity)) {

           // console.error('Invalid Shipped Quantity:', item['shipped quantity'],item);
            shippedQuantity = null; // Force it to null
        } 
        const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"]; 
        return [
            item['transaction date'] !== "0-00-00" && item['transaction date'] !== null ? item['transaction date'] : null, // Transaction Date
            item['supplier invoice date'] !== "0-00-00" && item['supplier invoice date'] !== null ? item['supplier invoice date'] : null, // Supplier Invoice Date
            item['supplier type'], // Supplier Type
            item['dms order number'], // DMS Order Number
            shippedQuantity, // Shipped Quantity
            receiptQuantity, // Receipt Quantity
            item['part no'], // Part No
            Dealer, // Dealer
            Location // Location
        ];})
    
        await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table('Renault_GRN_file_lead_time_latest_data');
    table.create = false;
    // Define columns based on the CREATE TABLE statement (use the exact column names)
    table.columns.add('Transaction Date', sql.Date, { nullable: true }); // Transaction Date
    table.columns.add('Supplier Invoice Date', sql.Date, { nullable: true }); // Supplier Invoice Date
    table.columns.add('SUPPLIER TYPE', sql.VarChar(50), { nullable: true }); // Supplier Type
    table.columns.add('DMS Order Number', sql.VarChar(50), { nullable: true }); // DMS Order Number
    table.columns.add('Shipped Quantity', sql.Float, { nullable: true }); // Shipped Quantity
    table.columns.add('Receipt Quantity', sql.Float, { nullable: true }); // Receipt Quantity
    table.columns.add('Part No', sql.VarChar(50), { nullable: true }); // Part No
    table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // Dealer
    table.columns.add('Location', sql.VarChar(100), { nullable: true }); // Location

    // Add rows to the table
    // console.log("values ",values)
    values.forEach((row) => {
        table.rows.add(
            row[0], // Transaction Date
            row[1], // Supplier Invoice Date
            row[2], // Supplier Type
            row[3], // DMS Order Number
            row[4], // Shipped Quantity
            row[5], // Receipt Quantity
            row[6], // Part No
            row[7], // Dealer
            row[8]  // Location
        );
    });

    const request = pool.request();

    try {
        // Execute the bulk insert
        await request.query('use UAD_BI_LEAD_TIME ')
        await request.query('TRUNCATE TABLE Renault_GRN_file_lead_time_latest_data');
        await request.bulk(table);
       
    } catch (error) {
        console.error('Error during bulk insert:', error.message);
    }
}
    }
    
   const bulkRenaultInsertPOData=async function(data, pool, dealer, location,res) {
        let isNullFound=false;
        
        let part_number=data[0]["order part number"];
        let brandId=12;
        let query=`Select brandid from z_scope.dbo.VW_PartMaster where partno=@part_number and brandid=@brandId`;
        const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
       // console.log("result in renault po",result)
        if(result.length==0){
            // let tableNameMRN='Renault_GRN_file_lead_time_latest_data';
            // let tableNamePO='Renault_POSBO_file_lead_time_latest_data'
            // let query1=`TRUNCATE TABLE ${tableNamePO}`
            // let query2=`TRUNCATE TABLE ${tableNameMRN}`
            // await pool.request().query(query1);
            // await pool.request().query(query2);
            return {poFailed:true}
        }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["order part number"] || item["order part number"]==0){
                // console.log(item["order part number"])
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
            
                item['supplier type'], // supplier type
                item['po number'], // po number
                item['order submission date'] !== "0-00-00" ? item['order submission date']: null, // order submission date
                item['order sub type'], // order sub type
                item['order part number'], // order part number
                item['order quantity'] !== null && !isNaN(parseFloat(item['order quantity'])) ? parseFloat(item['order quantity']) : null, // order quantity
                Dealer, // dealer (assumed dealer is set earlier in your code)
                Location // location (assumed location is set earlier in your code)
        ]
    });
        // console.log("values ",values);
        await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table('Renault_POSBO_file_lead_time_latest_data');
        table.create = false;
    
        // Define columns based on the new table structure (Renault_POSBO_file_lead_time)
        table.columns.add('supplier type', sql.VarChar(50), { nullable: true }); // supplier type
        table.columns.add('po number', sql.VarChar(50), { nullable: true }); // po number
        table.columns.add('order submission date', sql.Date, { nullable: true }); // order submission date
        table.columns.add('order sub type', sql.VarChar(30), { nullable: true }); // order sub type
        table.columns.add('order part number', sql.VarChar(50), { nullable: true }); // order part number
        table.columns.add('order quantity', sql.Float, { nullable: true }); // order quantity
        table.columns.add('dealer', sql.VarChar(100), { nullable: true }); // dealer
        table.columns.add('location', sql.VarChar(100), { nullable: true }); // location
    
        // Add rows to the table
        values.forEach((row) => {
            table.rows.add(
                row[0], // supplier type
                row[1], // po number
                row[2], // order submission date
                row[3], // order sub type
                row[4], // order part number
                row[5], // order quantity
                row[6], // dealer
                row[7]  // location
            );
        });
    
        const request = pool.request();
    
        try {
            // Execute the bulk insert
            await request.query('use UAD_BI_LEAD_TIME ')
            await request.query('TRUNCATE TABLE Renault_POSBO_file_lead_time_latest_data');
            await request.bulk(table);
            
           
        } catch (error) {
            console.error('Error during bulk insert:', error.message);
        }
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

function convertExcelSerialToIST(serialNumber,item) {
    if (!serialNumber || isNaN(serialNumber)) {
         console.log(item,serialNumber)
      console.error("Invalid serial number:", serialNumber);
      throw new error("strop")
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

export {bulkRenaultInsertPOData,bulkRenaultInsertMRNData}