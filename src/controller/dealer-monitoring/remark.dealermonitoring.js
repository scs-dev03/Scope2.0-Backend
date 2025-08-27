import { remarkmasterService , partremarkInsertion , vehicleremarkInsertion, ppnipartremarkInsertion, ppnivehicleremarkInsertion } from "../../services/dealerMonitoring/remarksService.js"
import { uploadToS3 } from "../../middlewares/multer.middleware.js"
import { getPool1 } from "../../db/db.js"

const remarkMaster = async(req,res)=>{
try {
        const {type} = req.body
        if(!type){
            return res.status(400).json(`type vehicle or ppni is required`)
        }
        const data = await remarkmasterService(type)
        res.status(200).json({Data:data.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}

const partremark = async(req,res)=>{
try {   
        const pool = await getPool1()
        const transaction = await pool.transaction();

        await transaction.begin()
        const {Dealerid , LocationId , bigid , remarkid , remark , advancevalue ,vehiclenumber , partnumber , userid} = req.body
        if(!Dealerid ||  !LocationId || !bigid || !remarkid || !remark==null || !advancevalue == null || !vehiclenumber || !partnumber ||  !userid){
            return res.status(400).json({message:`Dealerid , Locationid , bigid , remarkid , remark , advancevalue ,vehiclenumber , partnumber , userid are required`})
        }
        
        const file = req.file
        // if(req.file == undefined){
        //     return res.status(400).json({message:`file are required`})
        // }
        // let url = `https://scs-onboard-docs.s3.ap-south-1.amazonaws.com/WhatsApp%20Image%202025-03-19%20at%202.41.24%20PM.jpeg`    
        let url, key;
        if(file)
        {
            try 
            {        
                const uploadResult = await uploadToS3(file);
                url = uploadResult.url;
                key = uploadResult.key; 
            } catch (uploadErr) 
                {   await transaction.rollback()
                    return res.status(500).json({ error: `Failed to upload image: ${uploadErr.message}` });
                }
        }         
        const result = await partremarkInsertion(Dealerid,LocationId,bigid,remarkid,remark,advancevalue,url,vehiclenumber , partnumber , userid ,transaction)
        res.status(200).json({message:`Insertion Successful`,res:result})
    
} catch (error) {
    res.status(500).json({Error:error.message})
}
}

const vehicleremark = async(req,res)=>{
try {   
        const pool = await getPool1()
        const transaction = await pool.transaction();

        await transaction.begin()
        const {Dealerid , LocationId , remarkid , remark , advancevalue ,vehiclenumber  , userid} = req.body
        if(!Dealerid ||  !LocationId  ||  !remark==null || !remarkid || !advancevalue == null || !vehiclenumber  ||  !userid){
            return res.status(400).json({message:`Dealerid , Locationid  , remarkid , remark , advancevalue ,vehiclenumber , userid are required`})
        }
        
        const file = req.file
        if(req.file == undefined && !remark){
            return res.status(400).json({message:`remark or file is required`})
        }
        // let url = `https://scs-onboard-docs.s3.ap-south-1.amazonaws.com/WhatsApp%20Image%202025-03-19%20at%202.41.24%20PM.jpeg`    
        let url, key;
        if(file)
        {
            try 
            {        
                const uploadResult = await uploadToS3(file);
                url = uploadResult.url;
                key = uploadResult.key; 
            } catch (uploadErr) 
                {   await transaction.rollback()
                    return res.status(500).json({ error: `Failed to upload image: ${uploadErr.message}` });
                }
        } 
        const result = await vehicleremarkInsertion(Dealerid,LocationId,remarkid,remark,advancevalue,url,vehiclenumber , userid ,transaction)
        res.status(200).json({message:`Insertion Successful`,res:result})
    
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
}

const ppnipartremark = async(req,res)=>{
try {   
        const pool = await getPool1()
        const transaction = await pool.transaction();

        await transaction.begin()
        const {Dealerid , LocationId , bigid , remarkid , remark , advancevalue ,vehiclenumber , partnumber , userid} = req.body
        if(!Dealerid ||  !LocationId || !bigid ||  !remark==null || !remarkid || !advancevalue == null || !vehiclenumber || !partnumber ||  !userid){
            return res.status(400).json({message:`Dealerid , Locationid , bigid , remarkid , remark , advancevalue ,vehiclenumber , partnumber , userid are required`})
        }
        
        const file = req.file
        // if(req.file == undefined){
        //     return res.status(400).json({message:`file are required`})
        // }
        // let url = `https://scs-onboard-docs.s3.ap-south-1.amazonaws.com/WhatsApp%20Image%202025-03-19%20at%202.41.24%20PM.jpeg`    
        let url, key;
        if(file)
        {
            try 
            {        
                const uploadResult = await uploadToS3(file);
                url = uploadResult.url;
                key = uploadResult.key; 
            } catch (uploadErr) 
                {   await transaction.rollback()
                    return res.status(500).json({ error: `Failed to upload image: ${uploadErr.message}` });
                }
        } 
        
        const result = await ppnipartremarkInsertion(Dealerid,LocationId,bigid,remarkid,remark,advancevalue,url,vehiclenumber , partnumber , userid ,transaction)
        res.status(200).json({message:`Insertion Successful`})
    
} catch (error) {
    res.status(500).json({Error:error.message})
}
}

const ppnivehicleremark = async(req,res)=>{
try {   
        const pool = await getPool1()
        const transaction = await pool.transaction();

        await transaction.begin()
        const {Dealerid , LocationId , remarkid , remark , advancevalue ,vehiclenumber  , userid} = req.body
        if(!Dealerid ||  !LocationId  || !remarkid || !remark==null || !advancevalue == null || !vehiclenumber  ||  !userid){
            return res.status(400).json({message:`Dealerid , Locationid  , remarkid , remark , advancevalue ,vehiclenumber , userid are required`})
        }
        
        const file = req.file
        // if(req.file == undefined){
        //     return res.status(400).json({message:`file is required`})
        // }
        // let url = `https://scs-onboard-docs.s3.ap-south-1.amazonaws.com/WhatsApp%20Image%202025-03-19%20at%202.41.24%20PM.jpeg`    
        let url, key;
        if(file)
        {
            try 
            {        
                const uploadResult = await uploadToS3(file);
                url = uploadResult.url;
                key = uploadResult.key; 
                
            } catch (uploadErr) 
                {   await transaction.rollback()
                    return res.status(500).json({ error: `Failed to upload image: ${uploadErr.message}` });
                }
        } 
        const result = await ppnivehicleremarkInsertion(Dealerid,LocationId,remarkid,remark,advancevalue,url,vehiclenumber , userid ,transaction)
        res.status(200).json({message:`Insertion Successful`,res:result})
    
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
}
export {remarkMaster, partremark  , vehicleremark , ppnipartremark , ppnivehicleremark}