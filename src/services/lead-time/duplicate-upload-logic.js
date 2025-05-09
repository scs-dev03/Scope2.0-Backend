import moment from "moment";
import sql from "mssql2";
    const insertHeroData=async function(pool,item,dealer=null,location=null){
        try{
            const request = pool.request();
            if(dealer && location){
            // Add inputs (parameters) dynamically
            request.input('PurchaseOrderNumber', item['purchase order number']);
            request.input('OrderStatus', item['order status']);
            request.input('OrderDate', item['order date'] ? convertExcelSerialToIST(parseFloat(item['order date'])) : null);
            request.input('InvoiceDate', item['invoice date'] && item['invoice date'] !== "0-00-00" ? convertExcelSerialToIST(parseFloat(item['invoice date'])) : null);
            request.input('GRNInvoiceDate', item['grn invoice date'] && item['grn invoice date'] !== "0-00-00" ? convertExcelSerialToIST(parseFloat(item['grn invoice date'])) : null);
            request.input('OrderSubtype', item['order subtype']);
            request.input('PartNumber', item['part number']);
            request.input('OrderQuantity', parseInt(item['order quantity'], 10));  // Ensure order quantity is an integer
            request.input('InvoiceQuantity', parseInt(item['invoice quantity'], 10));  // Ensure invoice quantity is an integer
            request.input('dealer', dealer);
            request.input('Location', location);
            }
            else{
                request.input('PurchaseOrderNumber', item['purchase order number']);
            request.input('OrderStatus', item['order status']);
            request.input('OrderDate', item['order date'] ? convertExcelSerialToIST(parseFloat(item['order date'])) : null);
            request.input('InvoiceDate', item['invoice date'] && item['invoice date'] !== "0-00-00" ? convertExcelSerialToIST(parseFloat(item['invoice date'])) : null);
            request.input('GRNInvoiceDate', item['grn invoice date'] && item['grn invoice date'] !== "0-00-00" ? convertExcelSerialToIST(parseFloat(item['grn invoice date'])) : null);
            request.input('OrderSubtype', item['order subtype']);
            request.input('PartNumber', item['part number']);
            request.input('OrderQuantity', parseInt(item['order quantity'], 10));  // Ensure order quantity is an integer
            request.input('InvoiceQuantity', parseInt(item['invoice quantity'], 10));  // Ensure invoice quantity is an integer
            request.input('dealer', item['dealer']);
            request.input('Location',item['location']);
            }
            // Define the SQL query to execute the MERGE statement
            const result = await request.execute('dbo.upload_hero_data');
            // console.log('Procedure executed successfully.1 ',result);
        }
        catch(error){
            "error in insert hero data duplicate",error.message}
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
  
    return formattedDate;
  }

async function heroLeadTimeSPOperations(pool){
    // const pool=await connection.connectDB();
    const request=await pool.request();
    const res = await request.execute('sp_HeroLeadTimeOperations');
    // console.log("Stored procedure executed successfully.",res);

    return res;

  }

export default insertHeroData