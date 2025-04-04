import { getPool1 } from "../../db/db.js"
import * as XLSX from "xlsx";
import fs from "fs";
export const getBrands = async () => {
  try {
    const pool = await getPool1();
    const query = `use [z_scope] Select distinct Brand as brand ,BrandId as brand_id from locationInfo where BrandStatus=1 order by brand`;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error("Error executing SQL query to fetch brands:", error.message);
    return {error:error};
  }
};

export const uploadFile = async (req) => {
  try {
    let brandId = parseInt(req.body.brand_id);
    // console.log("brandId ",brandId,req)
    let filePath = req.file.path;
    let headers;
    let data;
    if (brandId == 33 || brandId == 11) {
      //  console.log(brandId);
      data = await readExcelFileWithSubColumns(filePath);
      headers = data.headers;
    } else {
      data = await readExcelFile(filePath);
      headers = data.headers;
    }
    // console.log(data?.header)
    return { headers: headers, data: data.data };
  } catch (error) {
    console.error(
      "Error executing SQL query to in upload File:",
      error.message
    );
    return {error:error};
  }
};

const readExcelFileWithSubColumns = async (filePath) => {
  try {
    //  console.log(XLSX)
    // const workbook = XLSX.readFile(filePath); // `XLSX.readFile` reads the Excel file synchronously
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    // Get the first sheet's name
    const sheetName = workbook.SheetNames[0];

    // Get the sheet data from the workbook
    const sheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Get the first two header rows
    const headerRow1 = data[0];
    const headerRow2 = data[1];

    for (let index = 0; index < headerRow1.length; index++) {
      let item = headerRow1[index];
      // console.log("header at index", index, ":", item, typeof item); // Debugging: Log each item and its type

      // Check for undefined, null, empty strings, and holes in the array
      if (item === null || item === "" || item === undefined) {
        headerRow1[index] = "011"; // Replace empty items with '011'
      }
    }
    //console.log("header row ",headerRow2)

    // console.log(headerRow2);  // Output: [1, null, 'Name', null, 'Age', null]

    for (let index = 0; index < headerRow2.length; index++) {
      let item = headerRow2[index];
      // console.log("header at index", index, ":", item, typeof item); // Debugging: Log each item and its type

      // Check for undefined, null, empty strings, and holes in the array
      if (item === null || item === "" || item == undefined) {
        headerRow2[index] = "011"; // Replace empty items with '011'
      }
    }
    // console.log(headerRow2)
    // Merge the two header rows into one
    const mergedHeaders = headerRow1.map((header, index) => {
      const header2 = headerRow2[index];
      //console.log("header ",header,header2)

      if (header != "011" && header2 != "011") {
        if (header != undefined && header2 != undefined) {
          return `${header} ${header2}`;
        } else if (header == undefined && header2 != undefined) {
          return `${header2}`;
        } else if (header != undefined && header2 == undefined) {
          return `${header}`;
        }
      } else if (header && (header2 === "011" || header2 == undefined)) {
        // If header2 is null or undefined, just use header1

        return header;
      } else if (header2 && (header == "011" || header == undefined)) {
        // return `${headerRow1[index - 1]} ${header2}`;
        let currentHeader = header;
        let validHeader = null;
        let indexToUse = index - 1; // Start checking the previous header

        // Loop to find the last valid header
        while (
          indexToUse >= 0 &&
          (currentHeader === "011" || currentHeader === undefined)
        ) {
          currentHeader = headerRow1[indexToUse];
          indexToUse--;
        }

        // After loop, currentHeader will be the last valid header found
        validHeader = currentHeader;

        // Return the combined result with the valid header found and header2
        return `${validHeader} ${header2}`;
      } else {
        // If both are null or undefined, exclude them from the headers
        return null;
      }
    });
    // .filter(header => header !== null && header !== '');
    // Replace the first two rows with the merged header row
    data[0] = mergedHeaders;
    data.splice(1, 1); // Remove the second header row

    // Convert data to an array of objects
    // let resultData = data.map((row) => {
    //   let obj = {};
    //   mergedHeaders.forEach((header, index) => {
    //     obj[header] = row[index]; // Assign the corresponding value for each header
    //   });
    //   return obj;
    // });

    // let resultData = data.slice(1).map((row) => {
    //   let obj = {};
    //   row.forEach((cell, index) => {
    //     // Remove special characters from each cell value
    //     obj[headers[index]] = removeSpecialCharacters(cell);
    //   });
    //   return obj;
    // });

    let resultData = data.slice(1).map((row) => { 
      let obj = {};
      row.forEach((cell, index) => {
        // If the header is not 'dealer' or 'location', remove special characters
        if (mergedHeaders[index].toLowerCase() !== 'dealer' && mergedHeaders[index].toLowerCase() !== 'location') {
          obj[mergedHeaders[index]] = removeSpecialCharacters(cell);
        } else {
          obj[mergedHeaders[index]] = cell; // Leave 'dealer' and 'location' as they are
        }
      });
      return obj;
    });
    // console.log('Excel file saved with merged headers!',mergedHeaders);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting the file:", err);
      } else {
        // console.log('File deleted successfully:', filePath);
      }
    });
    // console.log(mergedHeaders)
    return { headers: mergedHeaders, data: resultData };
  } catch (error) {
    console.error("Error reading the Excel file:", error);
  }
};

const readExcelFile = async (filePath) => {
  try {
    // Read the Excel file
    // const workbook = XLSX.readFile(filePath); // `XLSX.readFile` reads the Excel file synchronously

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    // Get the first sheet's name
    const sheetName = workbook.SheetNames[0];

    // Get the sheet data from the workbook
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Pass `header: 1` to get the first row as headers

    // Extract headers (first row in the sheet)
    const headers = data[0]; // The first row will be the headers

    // console.log('Headers:', headers);
    // console.log('Data:', data.slice(1)); // Data excluding headers

    // return { headers, data: data.slice(1) };
   
   
    // let resultData = data.slice(1).map((row) => {
    //   let obj = {};
    //   row.forEach((cell, index) => {
    //     // Remove special characters from each cell value
    //     obj[headers[index]] = removeSpecialCharacters(cell);
    //   });
    //   return obj;
    // });

    // console.log("headers ",headers)
    let resultData = data.slice(1).map((row) => { 
      let obj = {};
      row.forEach((cell, index) => {
        // If the header is not 'dealer' or 'location', remove special characters
        // console.log("cell ",cell)
        // if (headers[index].toLowerCase() !== 'dealer' && headers[index].toLowerCase() !== 'location' && headers[index].toLowerCase() !== 'inventory location') {
        //   obj[headers[index]] = removeSpecialCharacters(cell);
        // } else {
        //   obj[headers[index]] = cell; // Leave 'dealer' and 'location' as they are
        // }
        obj[headers[index]]=cell;

      });
      return obj;
    });

    // console.log("result data ",resultData)
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting the file:", err);
      } else {
        console.log("File deleted successfully:", filePath);
      }
    });
      // console.log("header ",resultData)
    return { headers: headers, data: resultData };
  } catch (error) {
    console.log("error in reading the excel file ", error.message);
    return error;
  }
};

export const  getDealersBasedOnBrandIDInService=async function(req){
  try{
      const pool = await getPool1();


// Prepare the SQL query for inserting data into SIMS_STOCK_FILE
    let brand_id=req.brand_id;

const query = `
  use [z_scope]  Select distinct dealerID as dealer_id,dealer as dealer_name from locationinfo where brandID=@brand_id and dealerStatus=1 order by dealer;
  `;

  // Execute the insert query for each row
 const result= await pool.request()
 .input('brand_id',brand_id)
    .query(query);

return result.recordset 
  }
  catch(err){
      console.log("error in fetching data",err.message);
      return {error:error};
  }
  
}

const removeSpecialCharacters = (str) => {
  // This regular expression removes all non-alphanumeric characters (except spaces)
  str=str+'';
  return str.replace(/[^a-zA-Z0-9 ]/g, '');

//   if (header == "location" || header=='dealer') {
//     // console.log(convertedStr)
//     return convertedStr.trim();  // Return the string as is for 'dealer location'
// }
// else{
//       convertedStr= convertedStr.replace(/[^a-zA-Z0-9\s]/g, "")
// }
};
export const getLocationsInService= async function (req) {
  try {
    const pool = await getPool1();
   
    let dealer_id = req.dealer_id;
   
    const query = `
 use [z_scope]   Select locationID as location_id,location as location_name from  locationInfo where dealerID=@dealer_id and status=1 order by location
  `;

    // Execute the insert query for each row
    const result = await pool
      .request()
      .input("dealer_id", dealer_id)
      .query(query);


    return result.recordset;
  } catch (err) {
    console.log("error in fetching data in utilities service in location method", err.message);
    return {error:error};
  }
}
export { readExcelFile, readExcelFileWithSubColumns };
