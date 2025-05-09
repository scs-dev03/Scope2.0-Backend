import readExcelFileMappingService from "../../services/mapping/mapping.service.js";


export const uploadFileInController=async function(req,res) {
        
    try{

    const filePath = req.file.path;  
    // console.log(filePath)
    // Call service to process the uploaded Excel file
    const result = await readExcelFileMappingService(filePath);
       
    // Send back the data to the client
    res.json({ message: 'File processed successfully', data: result.headers ,data1:result.data ,filePath:filePath });
  } catch (error) {
    console.error('Error in controller:', error);
    res.status(500).json({ error: 'Failed to process the Excel file' });
  }

}