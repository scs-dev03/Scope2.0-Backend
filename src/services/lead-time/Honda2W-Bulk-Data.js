import sql from "mssql";
import moment from "moment";

 const bulkHondaInsertData=async function(data,pool,brand,dealer,location,brandId,dealerId,locationId,res) {
   
  await pool.request().query('use UAD_BI_LEAD_TIME')
    const table = new sql.Table('Honda_2W_purchase_register_File_Lead_Time_latest_data');
      table.create = false;
      
      // Updated columns with new names and data types
      table.columns.add('Order Number', sql.VarChar(50), { nullable: true }); // VarChar(50) for Order Number
      table.columns.add('Supplier Name', sql.VarChar(50), { nullable: true }); // VarChar(50) for Supplier Name
      table.columns.add('Order Status', sql.VarChar(50), { nullable: true }); // VarChar(50) for Order Status
      table.columns.add('Purchase Order Type', sql.VarChar(50), { nullable: true }); // VarChar(50) for Purchase Order Type
      table.columns.add('Part Number', sql.VarChar(50), { nullable: true }); // VarChar(50) for Part Number
      table.columns.add('Quantity Requested', sql.Float, { nullable: true }); // Float for Quantity Requested
      table.columns.add('MRNs Actual Received Qty', sql.Float, { nullable: true }); // Float for MRNs Actual Received Quantity
      table.columns.add('Invoiced Qty', sql.Float, { nullable: true }); // Float for Invoiced Quantity
      table.columns.add('Order Date', sql.Date, { nullable: true }); // Date for Order Date
      table.columns.add('MRN Date', sql.Date, { nullable: true }); // Date for MRN Date
      table.columns.add('Invoice Date PO', sql.Date, { nullable: true }); // Date for Invoice Date PO
      table.columns.add('Network Code', sql.VarChar(50), { nullable: true }); // VarChar(50) for Network Code
      table.columns.add('Brand', sql.VarChar(50), { nullable: true }); // VarChar(50) for Brand
      table.columns.add('Dealer', sql.VarChar(50), { nullable: true }); // VarChar(50) for Dealer
      table.columns.add('Location', sql.VarChar(50), { nullable: true }); // VarChar(50) for Location
      table.columns.add('BrandID', sql.VarChar(50), { nullable: true }); // VarChar(50) for Brand ID
      table.columns.add('DealerID', sql.VarChar(50), { nullable: true }); // VarChar(50) for Dealer ID
      table.columns.add('LocationID', sql.VarChar(50), { nullable: true }); // VarChar(50) for Location ID
  
    let isNullFound=false;
    let part_number=data[0]["part number"]
       let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number`;
       let result=await pool.request().input('part_number',part_number).query(query);
       console.log("result in honda ",result)
       if(result.length==0){
      //   let tableNamePO='Honda_2W_purchase_register_File_Lead_Time_latest_data'
      // let query1=`TRUNCATE TABLE ${tableNamePO}`
      // await pool.request().query(query1);
      return {poFailed:true}
       }
       let query56=`Select dealerId,dealer,location,locationId from z_scope.dbo.locationInfo where brandId=22`;
            let result56=await pool.request().query(query56);
            
        for(let item of data){
          // let dealerIdAsRow=dealerId;
          // let locationIdAsRow=locationId;
            let Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        let Location = location || item["location"];
            if(!Dealer || !Location || !item["part number"] || item["part number"] ==0){

                    isNullFound=true;
                    return isNullFound;    
            }
            
            
            if(dealer==null && location==null){

            
            // console.log("result in honda ",result56)        
            
              let resultDealer = result56.find(item1 =>{
                return item1.dealer.toLowerCase()==(item["dealer"].toLowerCase());
              } );
               let resultLocation = result56.find(item1 => {return item1.location.toLowerCase()==(item["location"].toLowerCase())});
               dealerId = resultDealer ? resultDealer.dealerId : null;
               locationId = resultLocation ? resultLocation.locationId : null;

            }
          

            table.rows.add(
              item["order number"],
              item['supplier name'],
              item['order status'],
              item['purchase order type'],
              item['part number'],
              item['quantity requested'] !== null && !isNaN(parseFloat(item['quantity requested'])) ? parseFloat(item['quantity requested']) : null,
              item['mrns actual received qty'] !== null && !isNaN(parseFloat(item['mrns actual received qty'])) ? parseFloat(item['mrns actual received qty']) : null,
              item['invoiced qty'] !== null && !isNaN(parseFloat(item['invoiced qty'])) ? parseFloat(item['invoiced qty']) : null,
              item['order date'] !== "0-00-00" ? item['order date']: null,
              item['mrn date'] !== "0-00-00" ? item['mrn date'] : null,
              item['invoice date po'] !== "0-00-00" ? item['invoice date po'] : null,
              item['network code'],
              brand,
              Dealer,
              Location,
              brandId,
              dealerId,
              locationId
          );
      }
  
      // If no null values were found, perform the bulk insert
      if (!isNullFound) {
          const request = pool.request();
  
          // Clean up the target table before bulk insert
          await request.query('TRUNCATE TABLE Honda_2W_purchase_register_File_Lead_Time_latest_data');
  
          // Perform the bulk insert
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

export default {bulkHondaInsertData}
