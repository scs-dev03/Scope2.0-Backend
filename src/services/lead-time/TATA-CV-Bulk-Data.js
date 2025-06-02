// const connection = require('../../connection');
import sql from 'mssql'
import moment from "moment";

const   bulkTATACVPOInsertData= async function(data,pool, dealer, location,res) {
        // console.log('----------------------it is executing');
        let isNullFound=false;
        let part_number=data[0]["part"];
       // console.log("part number ",part_number)
        let brandId=17;
        let query=`Select brandid from z_scope.dbo.VW_PartMaster where partno=@part_number and brandid=@brandId`;
        const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
        //console.log("result in tata cv mrn",result)
        if(result.recordset.length==0){
            return {poFailed:true}
        }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["part"] || item["part"]==0){

                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
        const values = data.map(item => {
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
            const Location = location || item["location"]; 
            return [
            item["order"], // [Order No]
            
            // [Part No]
            item["part"], // [Part No]
            
            // [Recd Qty] - Ensure it's a valid decimal
            item["recd qty"] !== null && !isNaN(parseFloat(item["recd qty"])) 
                ? parseFloat(item["recd qty"]).toFixed(2) // Convert to decimal with 2 decimal places
                : null, // [Recd Qty]
            
            // [Status]
            item["status"], // [Status]
            
            // [Ware House Name]
            item["ware house name"], // [Ware House Name]
            
            // [Payer Code]
            item["payer code"], // [Payer Code]
            
            // [Division Name]
            item["division name"], // [Division Name]
            
            // [Transaction Date] - Ensure it's a valid date
            item["transaction date"] !== "0-00-00" && item["transaction date"] !== null 
                ? item['transaction date']
                : null, // [Transaction Date]
            
            // [purchase_order_date] - Ensure it's a valid date
            item["purchaseorderdate"] !== "0-00-00" && item["purchaseorderdate"] !== null 
                ? (item['purchaseorderdate'])
                : null, // [purchase_order_date]
            
            // [Invoice_Date] - Ensure it's a valid date
            item["invoicedate"] !== "0-00-00" && item["invoicedate"] !== null 
                ? (item['invoicedate']) 
                : null, // [Invoice_Date]
            
            // [Spares Order Type]
            item["spares order type"], // [Spares Order Type]
            
            // [SAP Order Num]
            item["sap order num"], // [SAP Order Num]
            
            // [Commit Flag]
            item["commit flag"], // [Commit Flag]
            
            // Dealer
            Dealer, // [Dealer]
            
            // Location
            Location // [Location]
        ]
        })
        
        await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table('TATA_CV_Purchase_Line_Items_lead_time_latest_data'); // Updated table name
        table.create = false;
    
        // Define columns based on your new schema
        table.columns.add('Order No', sql.VarChar(355), { nullable: true }); // [Order No]
        table.columns.add('Part No', sql.VarChar(100), { nullable: true }); // [Part No]
        table.columns.add('Recd Qty', sql.Decimal(38, 2), { nullable: true }); // [Recd Qty]
        table.columns.add('Status', sql.VarChar(100), { nullable: true }); // [Status]
        table.columns.add('Ware House Name', sql.VarChar(355), { nullable: true }); // [Ware House Name]
        table.columns.add('Payer Code', sql.VarChar(100), { nullable: true }); // [Payer Code]
        table.columns.add('Division Name', sql.VarChar(355), { nullable: true }); // [Division Name]
        table.columns.add('Transaction Date', sql.Date, { nullable: true }); // [Transaction Date]
        table.columns.add('purchase_order_date', sql.Date, { nullable: true }); // [purchase_order_date]
        table.columns.add('Invoice_Date', sql.Date, { nullable: true }); // [Invoice_Date]
        table.columns.add('Spares Order Type', sql.VarChar(150), { nullable: true }); // [Spares Order Type]
        table.columns.add('SAP Order Num', sql.VarChar(150), { nullable: true }); // [SAP Order Num]
        table.columns.add('Commit Flag', sql.VarChar(10), { nullable: true }); // [Commit Flag]
        table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // [Dealer]
        table.columns.add('Location', sql.VarChar(255), { nullable: true }); // [Location]
    
        // Add rows to the table
        values.forEach((row) => {
            table.rows.add(
                row[0],  // [Order No]
                row[1],  // [Part No]
                row[2],  // [Recd Qty]
                row[3],  // [Status]
                row[4],  // [Ware House Name]
                row[5],  // [Payer Code]
                row[6],  // [Division Name]
                row[7],  // [Transaction Date]
                row[8],  // [purchase_order_date]
                row[9],  // [Invoice_Date]
                row[10], // [Spares Order Type]
                row[11], // [SAP Order Num]
                row[12], // [Commit Flag]
                row[13], // [Dealer]
                row[14]  // [Location]
            );
        });
    
        const request = pool.request();
    
        // Execute the bulk insert
        try {
             await request.query('use UAD_BI_LEAD_TIME ')
            await request.query('TRUNCATE TABLE TATA_CV_Purchase_Line_Items_lead_time_latest_data');
            await request.bulk(table);

        
        } catch (error) {
            console.error('Error during bulk insert:', error);
            throw error; // Rethrow the error for further handling if necessary
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
        console.log(item)
      console.error("Invalid serial number:", serialNumber);
      throw new error('stop');
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

export default bulkTATACVPOInsertData
