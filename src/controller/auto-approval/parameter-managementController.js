import {ApiError} from '../../utils/ApiError.js'
import {ApiResponse} from '../../utils/ApiResponse.js'
import { viewParameterService } from '../../services/auto-approval/parameter-managementService.js'

const viewParameter = async (req,res)=>{
try {
        const {bucketId} = req.body
        const result = await viewParameterService(bucketId)
        res.status(200).json(
            new ApiResponse(200,result.recordset,`Data`)
        )
    } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Error in generating Acc. and Ref. Token"));
    }
}   


export {viewParameter}