import moment from "moment";
import sql from "mssql";
 const bulkHeroInsertData= async function(data,pool,dealer,location,res) {

    let isNullFound=false;
    let part_number=data[0]["part number"];
    let brandId=20;
    let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
    const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
   // console.log("result in hero ",result)
    if(result.length==0){
      // let tableNamePO='Hero_Lead_Time_File_latest_data'
      // let query1=`TRUNCATE TABLE ${tableNamePO}`
      // await pool.request().query(query1);
      return {poFailed:true}
    }
    for(let item of data){
        const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
    const Location = location || item["location"];
        if(!Dealer || !Location || !item["part number"]){

                isNullFound=true;
                return isNullFound;    
        }
    }
    if(!isNullFound){
    const values = data.map(item => {
      const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
    const Location = location || item["location"]; 
    return [  
      item["purchase order number"],
      item['order status'],
      item['order date'],
      item['invoice date'] !== "0-00-00" ? item['invoice date'] : null,
      item['grn invoice date'] !== "0-00-00" ? item['grn invoice date'] : null,
      item['order subtype'],
      item['part number'],
      // Check if 'order quantity' is a valid number or is null
      item['order quantity'] !== null && !isNaN(parseFloat(item['order quantity'])) ? parseFloat(item['order quantity']) : null,
      // Check if 'invoice quantity' is a valid number or is null
      item['invoice quantity'] !== null && !isNaN(parseFloat(item['invoice quantity'])) ?  parseFloat(item['invoice quantity']) : null,
      Dealer,
      Location
    ]});
      //  console.log("values ",values);
      await pool.request().query(`use UAD_BI_LEAD_TIME`)
    const table = new sql.Table('Hero_Lead_Time_File_latest_data');
    table.create = false;   
    

    table.columns.add('Purchase Order Number', sql.VarChar(255),{nullable:true});  // VarChar(255)
  table.columns.add('Order Status', sql.VarChar(100),{nullable:true});           // VarChar(100)
  table.columns.add('Order Date', sql.Date,{nullable:true});                     // Date
  table.columns.add('Invoice Date', sql.Date,{nullable:true});                   // Date
  table.columns.add('GRN Invoice Date', sql.Date,{nullable:true});               // Date
  table.columns.add('Order Subtype', sql.VarChar(255),{nullable:true});          // VarChar(255)
  table.columns.add('Part Number', sql.VarChar(150),{nullable:true});            // VarChar(150)
  table.columns.add('Order Quantity', sql.Decimal(38, 2),{nullable:true});       // Decimal(38,2)
  table.columns.add('Invoice Quantity', sql.Decimal(38, 2),{nullable:true});     // Decimal(38,2)
  table.columns.add('Dealer', sql.VarChar(100),{nullable:true});                 // VarChar(100)
  table.columns.add('Location', sql.VarChar(100),{nullable:true});   
    // Add rows to the table
    values.forEach((row) => {
      table.rows.add(
        row[0], // purchase order number
        row[1], // order status
        row[2], // order date
        row[3], // invoice date
        row[4], // grn invoice date
        row[5], // order subtype
        row[6], // part number
        row[7], // order quantity
        row[8], // invoice quantity
        row[9], // dealer
        row[10] // location
      );
    });

    
    const request =  pool.request();
    await request.query('TRUNCATE TABLE Hero_Lead_Time_File_latest_data');
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
 export default {bulkHeroInsertData}
