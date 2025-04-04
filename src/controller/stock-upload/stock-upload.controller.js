import {stockUploadSingleLocation,getPartNotInMasterSingleLocationInService,
    getAllRecordsSingleLocation,getUploadedDataSingleLocationInService
    ,stockUploadMultiLocation,getUploadedDataMultiLocationInService,
    getPartNotInMasterMultiLocationInService,getAllRecordsMultiLocation} from '../../services/stock-upload/stock-upload.service.js'
const uploadDataSingleLocation=async (req,res)=>{

    try{

        const result=await stockUploadSingleLocation(req);
        res.status(200).json(result);
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}

const allRecordsSingleLocation=async (req,res)=>{
    try{

        const result=await getAllRecordsSingleLocation(req.body);
        res.status(200).json({data:result});
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}

const getPartNotInMasterSingleLocation=async (req,res)=>{
    try{

        const result=await getPartNotInMasterSingleLocationInService(req.body);
        res.status(200).json({data:result});
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}

const uploadedDataSingleLocation=async(req,res)=>{
    try{

        const result=await getUploadedDataSingleLocationInService(req.body);
        res.status(200).json({data:result});
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}

const uploadDataMultiLocation=async(req,res)=>{

    try{
        const result=await stockUploadMultiLocation(req);
        res.status(200).json(result);
    }
    catch(error){

        res.status(201).json({error:error.message});
    }

}

const getMultiLocationUploadedData = async (req, res) => {
    try {
      // Generate the ZIP buffer
      const zipBuffer = await getUploadedDataMultiLocationInService(req.body);
  
      // Set the headers for the response (this must be done before sending the response)
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=uploaded_data.zip');
  
      // Send the ZIP buffer as the response to the client
      res.send(zipBuffer);
  
      // Cleanup: Perform the deletion of any temporary files *after* the response is sent
      const zipFilePath = path.join(__dirname, 'uploaded_data.zip'); // Path to your temp ZIP file
  
      // Cleanup file deletion after sending the response (use `setImmediate` or `process.nextTick` to avoid modifying response after it's sent)
      setImmediate(() => {
        fs.unlink(zipFilePath, (err) => {
          if (err) {
            console.error('Error deleting the ZIP file:', err);
          } else {
            console.log('ZIP file deleted successfully');
          }
        });
      });
  
    } catch (error) {
      // If there's an error, ensure that no response has been sent yet before sending the error
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  };
  

const getPartNotInMasterMultiLocation=async(req,res)=>{

    try{

        const zipBuffer=await getPartNotInMasterMultiLocationInService(req.body,res);
        res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=part_not_in_master.zip');

    // Send the ZIP file as the response
    res.send(zipBuffer);
    const zipFilePath = path.join(__dirname, 'part_not_in_master.zip'); // Use the appropriate path
    fs.unlink(zipFilePath, (err) => {
      if (err) {
        console.error('Error deleting the ZIP file:', err);
      } else {
        console.log('ZIP file deleted successfully');
      }
    });
        // res.status(200).json({data:result});
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}

const allRecordsMultiLocation=async (req,res)=>{

    try{

        const result=await getAllRecordsMultiLocation(req.body);
        res.status(200).json({data:result});
    }
    catch(error){

        res.status(201).json({error:error.message});
    }
}
export  {uploadDataSingleLocation,allRecordsSingleLocation,getPartNotInMasterSingleLocation,
    uploadedDataSingleLocation,uploadDataMultiLocation,
    getMultiLocationUploadedData,getPartNotInMasterMultiLocation,allRecordsMultiLocation}