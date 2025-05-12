
import sql from 'mssql'
import moment from "moment";

  const  bulkHyundaiInsertPOData= async function(data,pool, dealer, location,res) {
      let isNullFound=false;
       data=data.slice(1);
      
       let part_number=data[0]["part no current"];
      //  console.log("part_number in hyundai ",part_number,data[0])
       let brandId=11;
       let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
       const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
      //  console.log("result in hyundai ",result)
       if(result.length==0){
        // let tableNamePO='Hyundai_bo_file_lead_time_latest_data';
        // let tableNameMRN='Hyundai_Pur_File_lead_time_latest_data'
        // let query1=`TRUNCATE TABLE ${tableNamePO}`
        // let query2=`TRUNCATE TABLE ${tableNameMRN}`
        // await pool.request().query(query1);
        // await pool.request().query(query2);
        return {poFailed:true}
       }
      //  console.log(data[0])
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["part no current"] ||!item["part no order"] || item["part no current"]==0 || item["part no order"]==0){
                console.log(item)
                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
        const values = data.map(item => {
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
      const Location = location || item["location"]; 
            return [  item["order no"], // Order No (lowercase)
              item['part no order'], // Part No Order (lowercase)
              item['part no current'], // Part No Current (lowercase)
              item['part name'], // PART NAME (lowercase)
              item['quantity order'] !== null && !isNaN(parseFloat(item['quantity order'])) ? parseFloat(item['quantity order']) : null, // Quantity Order (lowercase)
              item['quantity current'] !== null && !isNaN(parseFloat(item['quantity current'])) ? parseFloat(item['quantity current']) : null, // Quantity Current (lowercase)
              item['po date'] !== "0-00-00" ? item['po date'] : null, // PO DATE (lowercase)
              item['pdc'], // PDC (lowercase)
              Dealer, // Dealer ID (Converted to lowercase)
              Location // Location ID (Converted to lowercase)
          ]

        });
            // console.log(data[1]),
            await pool.request().query('use UAD_BI_LEAD_TIME')
        const table = new sql.Table('Hyundai_bo_file_lead_time_latest_data');
        table.create = false;
    
        // Updated columns with new names and data types
        table.columns.add('Order No', sql.VarChar(50), { nullable: true }); // Order No
        table.columns.add('Part No Order', sql.VarChar(50), { nullable: true }); // Part No Order
        table.columns.add('Part No Current', sql.VarChar(50), { nullable: true }); // Part No Current
        table.columns.add('PART NAME', sql.VarChar(255), { nullable: true }); // Part Name
        table.columns.add('Quantity Order', sql.Float, { nullable: true }); // Quantity Order
        table.columns.add('Quantity Current', sql.Float, { nullable: true }); // Quantity Current
        table.columns.add('PO DATE', sql.Date, { nullable: true }); // PO Date
        table.columns.add('PDC', sql.VarChar(255), { nullable: true }); // PDC
        table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // Dealer
        table.columns.add('Location', sql.VarChar(100), { nullable: true }); // Location
    
        // Add rows to the table
        values.forEach((row) => {
            table.rows.add(
                row[0], // Order No
                row[1], // Part No Order
                row[2], // Part No Current
                row[3], // PART NAME
                row[4], // Quantity Order
                row[5], // Quantity Current
                row[6], // PO DATE
                row[7], // PDC
                row[8], // Dealer
                row[9], // Location
                row[10], // Dealer ID
                row[11] // Location ID
            );
        });
    
        const request = pool.request();
        await request.query('TRUNCATE TABLE Hyundai_bo_file_lead_time_latest_data');
        // Execute the bulk insert
        await request.bulk(table);
      }
    }

  const  bulkHyundaiInsertMRNData=async function(data,pool,dealer,location,res){
      let isNullFound=false;
      let part_number=data[0]["part no"];
      let brandId=11;
      let query=`Select brandid from z_scope.dbo.part_master where partnumber=@part_number and brandid=@brandId`;
      const result=await pool.request().input('part_number',part_number).input('brandId',brandId).query(query);
     // console.log("result in hyundai ",result)
      if(result.length==0){
      //  let tableNamePO='Hyundai_bo_file_lead_time_latest_data';
      //  let tableNameMRN='Hyundai_Pur_File_lead_time_latest_data'
      //  let query1=`TRUNCATE TABLE ${tableNamePO}`
      //  let query2=`TRUNCATE TABLE ${tableNameMRN}`
      //  await pool.request().query(query1);
      //  await pool.request().query(query2);
         return {mrnFailed:true}
      }
        for(let item of data){
            const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
        const Location = location || item["location"];
            if(!Dealer || !Location || !item["part no"] || item["part no"]==0){
              // console.log("item",item)
                    isNullFound=true;
                    return isNullFound;    
            }
        }
        if(!isNullFound){
      const values = data.map(item => {
      const Dealer = dealer || item["dealer"];  // Use provided dealer or item["dealer"]
      const Location = location || item["location"]; 
      return [
      // console.log(data[1]),
      item["po no"], // Po No (lowercase)
      item['part no'], // Part No (lowercase)
      item['invoice date'] !== "0-00-00" ? item['invoice date'] : null, // Invoice Date (lowercase)
      item['gr date'] !== "0-00-00" ? item['gr date'] : null, // GR Date (lowercase)
      item['rcv qty'] !== null && !isNaN(parseFloat(item['rcv qty'])) ? parseFloat(item['rcv qty']) : null, // RCV QTY (lowercase)
      Dealer, // Dealer (lowercase, provided as a parameter)
      Location // Location (lowercase, provided as a parameter)
  ]
        }
    );
    
        await pool.request().query('use UAD_BI_LEAD_TIME')
        // Create a new sql Table to represent the target structure in SQL
        const table = new sql.Table('Hyundai_Pur_File_lead_time_latest_data');
        table.create = false;
    
        // Define columns based on the target table schema
        table.columns.add('Po No', sql.VarChar(50), { nullable: true }); // Po No
        table.columns.add('Part No', sql.VarChar(100), { nullable: true }); // Part No
        table.columns.add('Invoice Date', sql.Date, { nullable: true }); // Invoice Date
        table.columns.add('GR Date', sql.Date, { nullable: true }); // GR Date
        table.columns.add('RCV QTY', sql.Float, { nullable: true }); // RCV QTY
        table.columns.add('Dealer', sql.VarChar(100), { nullable: true }); // Dealer
        table.columns.add('Location', sql.VarChar(100), { nullable: true }); // Location
    
        // Add the values as rows to the table
        values.forEach((row) => {
            table.rows.add(
                row[0], // Po No
                row[1], // Part No
                row[2], // Invoice Date
                row[3], // GR Date
                row[4], // RCV QTY
                row[5], // Dealer
                row[6]  // Location
            );
        });
    
        // Create a request object for the database operation
        const request = pool.request();
    
        await request.query('TRUNCATE TABLE Hyundai_Pur_File_lead_time_latest_data');
        // Execute the bulk insert operation
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
  
  function convertExcelSerialToIST(serialNumber,item) {
    if (!serialNumber || isNaN(serialNumber)) {
        // console.log(item)
      // console.error("Invalid serial number:", serialNumber);
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

export {bulkHyundaiInsertPOData,bulkHyundaiInsertMRNData}
