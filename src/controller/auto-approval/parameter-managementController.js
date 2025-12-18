import { ApiError } from '../../utils/ApiError.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { locationSpecificParamsListService, remarkParametersService, valuedParamsListService, viewParameterService } from '../../services/auto-approval/parameter-managementService.js'
import { getPool1 } from '../../db/db.js'
import { partNature } from '../MasterApiController.js'

const viewParameter = async (req, res) => {
  try {
    const { bucketId } = req.body
    const result = await viewParameterService(bucketId)
    res.status(200).json(
      new ApiResponse(200, result.recordset, `Data`)
    )
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, error?.message || "Error in generating Acc. and Ref. Token"));
  }
}


const parameterValue = async (req, res) => {
  try {
    const pool = await getPool1()
    const { parameter, LocationId } = req.body

    const preDefinedMap = {
      OrderType: 'OrderTypeMaster',
      JobtypeID: 'Job_Card_Type',
      PartTypeID: 'PartTypeMaster',
      OrderRemark : '',
      PartNature : 'PartNatureMaster',
      Model : 'ModelMaster'

      // Advisor: 'AdvisorMaster',
      // PartyName: 'AAP_SPMPartyMaster'
      // VehicleModel: 'VehicleModelMaster',
    };

    const locationSpecificMap = {
      Advisor: 'AAP_SPMAdvisorMaster',
      PartyName: 'AAP_SPMPartyMaster'
    }

    let data;
    if (LocationId == null) {
      const tableName = preDefinedMap[parameter];
      if (!tableName) {
        return res.status(200).json(new ApiResponse(204, [], ''));
      }
      data = await valuedParamsListService(tableName)
      return res.json(new ApiResponse(200, data.recordset, 'Data Retreival Successfull'));
    }

    else {
      const tableName = locationSpecificMap[parameter];
      if (!tableName) {
        return res.status(200).json(new ApiResponse(204, [], ''));
      }
      // console.log(tableName,LocationId);

      data = await locationSpecificParamsListService(tableName, LocationId)
      // console.log(data);

      return res.json(new ApiResponse(200, data.recordset, 'Data Retreival Successfull'));
    }
  }
  catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }

}

const remarkParameters = async (req, res) => {
  try {
    const result = await remarkParametersService()
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message))
  }
}

export { viewParameter, parameterValue, remarkParameters }