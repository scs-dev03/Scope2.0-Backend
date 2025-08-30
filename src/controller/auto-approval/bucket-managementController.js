import {ApiError} from '../../utils/ApiError.js'
import {ApiResponse} from '../../utils/ApiResponse.js'
import { viewBucketService } from '../../services/auto-approval/bucket-managementService.js'

const viewBucket = async(req,res)=>{
try {
        const result = await viewBucketService()
        res.status(200).json(
            new ApiResponse(200,result.recordset,`Data Lele`)
        )
    } catch (error) {
    //  
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Error in generating Acc. and Ref. Token"));
    }
}   


export {viewBucket}