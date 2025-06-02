import sql from "mssql";
import moment from "moment";

 export const bulkHondaInsertData=async function(data,pool,brand,dealer,location,brandId,dealerId,locationId,res) {
   
  try{
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
       let query=`Select brandid from z_scope.dbo.VW_PartMaster where partno=@part_number`;
       let result=await pool.request().input('part_number',part_number).query(query);
    //   console.log("result in honda ",result)
       if(result.recordset.length==0){
      //   let tableNamePO='Honda_2W_purchase_register_File_Lead_Time_latest_data'
      // let query1=`TRUNCATE TABLE ${tableNamePO}`
      // await pool.request().query(query1);
      return {poFailed:true}
       }
       let query56=`Select dealerId,dealer,location,locationId from z_scope.dbo.locationInfo where brandId=22`;
            let result56=await pool.request().query(query56);
            
           // console.log("data ",data)
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
            
              let resultDealer = result56.recordset.find(item1 =>{
                return item1.dealer.toLowerCase()==(item["dealer"].toLowerCase());
              } );
               let resultLocation = result56.recordset.find(item1 => {return item1.location.toLowerCase()==(item["location"].toLowerCase())});
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
              String(brandId),
              dealerId,
              locationId
          );

          
      }

      //console.log(data)
 // console.log("isNullFound ",isNullFound)
      // If no null values were found, perform the bulk insert
      if (!isNullFound) {
       // console.log("table",table)
          const request = pool.request();
 // console.log("First row to be inserted:", table.rows[0]);
          // Clean up the target table before bulk insert
          try{

            await request.query('use UAD_BI_LEAD_TIME')
            await request.query('TRUNCATE TABLE Honda_2W_purchase_register_File_Lead_Time_latest_data');
    
            // Perform the bulk insert
            await request.bulk(table);
          }
          catch(error ){
          //  console.log("errorr ",error)
          }
      }
    }catch(error){
      console.log("error ,",error)
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






  // if(!isNullFound){
  //     const values = data.map(item => {
  //       const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
  //     const Location = location || item["location"]; 
  //     return [  
  //       item["purchase order number"],
  //       item['order status'],
  //       item['order date'],
  //       item['invoice date'] !== "0-00-00" ? item['invoice date'] : null,
  //       item['grn invoice date'] !== "0-00-00" ? item['grn invoice date'] : null,
  //       item['order subtype'],
  //       item['part number'],
  //       // Check if 'order quantity' is a valid number or is null
  //       item['order quantity'] !== null && !isNaN(parseFloat(item['order quantity'])) ? parseFloat(item['order quantity']) : null,
  //       // Check if 'invoice quantity' is a valid number or is null
  //       item['invoice quantity'] !== null && !isNaN(parseFloat(item['invoice quantity'])) ?  parseFloat(item['invoice quantity']) : null,
  //       Dealer,
  //       Location
  //     ]});
  //       //  console.log("values ",values);
  //       await pool.request().query(`use UAD_BI_LEAD_TIME`)
  //     const table = new sql.Table('Hero_Lead_Time_File_latest_data');
  //     table.create = false;   
      
  
  //     table.columns.add('Purchase Order Number', sql.VarChar(255),{nullable:true});  // VarChar(255)
  //   table.columns.add('Order Status', sql.VarChar(100),{nullable:true});           // VarChar(100)
  //   table.columns.add('Order Date', sql.Date,{nullable:true});                     // Date
  //   table.columns.add('Invoice Date', sql.Date,{nullable:true});                   // Date
  //   table.columns.add('GRN Invoice Date', sql.Date,{nullable:true});               // Date
  //   table.columns.add('Order Subtype', sql.VarChar(255),{nullable:true});          // VarChar(255)
  //   table.columns.add('Part Number', sql.VarChar(150),{nullable:true});            // VarChar(150)
  //   table.columns.add('Order Quantity', sql.Decimal(38, 2),{nullable:true});       // Decimal(38,2)
  //   table.columns.add('Invoice Quantity', sql.Decimal(38, 2),{nullable:true});     // Decimal(38,2)
  //   table.columns.add('Dealer', sql.VarChar(100),{nullable:true});                 // VarChar(100)
  //   table.columns.add('Location', sql.VarChar(100),{nullable:true});   
  //     // Add rows to the table
  //     values.forEach((row) => {
  //       table.rows.add(
  //         row[0], // purchase order number
  //         row[1], // order status
  //         row[2], // order date
  //         row[3], // invoice date
  //         row[4], // grn invoice date
  //         row[5], // order subtype
  //         row[6], // part number
  //         row[7], // order quantity
  //         row[8], // invoice quantity
  //         row[9], // dealer
  //         row[10] // location
  //       );
  //     });
  
     
    
  //   }