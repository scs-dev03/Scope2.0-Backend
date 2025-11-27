import { createMappingService, editMappingService, userBrandsService, userDealerService, userLocationService, viewMappingService } from "../../services/auto-approval/brandwise-UserMappingService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const viewMapping = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, UserId } = req.body
        // console.log(BrandId, DealerId, LocationId, UserId)

        function format(arr) {
            if (!Array.isArray(arr) || arr.length === 0) return null;
            const s = arr.map(v => String(v).trim()).filter(Boolean).join(',');
            return s ? `${s.replace(/'/g, "''")}` : null;
        }
        const formattedLocationIds = format(LocationId);
        const formattedBrandIds = format(BrandId);
        const formattedDealerIds = format(DealerId);
        const formattedUserIds = format(UserId);

        // console.log(formattedBrandIds,formattedDealerIds,formattedLocationIds,formattedUserIds);
        
        const result = await viewMappingService(formattedBrandIds, formattedDealerIds, formattedLocationIds, formattedUserIds)
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }
}

const createMapping = async (req, res) => {
    try {
        const { payload, addedby } = req.body
        // console.log(payload);

        if (!Array.isArray(payload) || payload.length === 0) {
            return res
                .status(400)
                .json(new ApiError(400, 'payload must be a non-empty array'));
        }

        //     const requiredKeys = ['BrandId', 'DealerId', 'LocationId', 'userId'];

        // // 🔍 validate each object has all required keys
        // for (let i = 0; i < payload.length; i++) {
        //   const row = payload[i];
        //   if (typeof row !== 'object' || row === null) {
        //     return res
        //       .status(400)
        //       .json(new ApiError(400, `Row at index ${i} must be an object`));
        //   }

        //   for (const key of requiredKeys) {
        //     if (!Object.prototype.hasOwnProperty.call(row, key)) {
        //       return res
        //         .status(400)
        //         .json(
        //           new ApiError(
        //             400,
        //             `Row at index ${i} is missing required key: ${key}`
        //           )
        //         );
        //     }
        //   }
        // }
        const result = await createMappingService(payload, addedby)
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }
}

const editMapping = async (req, res) => {
    try {
        const { payload } = req.body;

        if (!Array.isArray(payload) || payload.length === 0) {
            return res
                .status(400)
                .json(new ApiError(400, 'payload must be a non-empty array'));
        }

        // ✅ ensure all rows are for 1 user only
        const firstUserId = payload[0].userId;
        const mixedUser = payload.find((r) => r.userId !== firstUserId);

        if (mixedUser) {
            return res
                .status(400)
                .json(
                    new ApiError(
                        400,
                        'Edit allowed for only one user per request. All rows must have same userId.'
                    )
                );
        }

        const addedBy = req.user?.id || null;

        const result = await editMappingService(payload, addedBy);
        res.status(200).json(new ApiResponse(200, result));
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message));
    }
}

const userBrands = async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) {
            return res.status(400).json(new ApiError(400, `userId is required`))
        }
        const result = await userBrandsService(userId)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched`))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode, error.message))
    }

}
const userDealers = async (req, res) => {
    try {
        const { userId, BrandId } = req.body
        if (!userId) {
            return res.status(400).json(new ApiError(400, `userId is required`))
        }
        const result = await userDealerService(userId, BrandId)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched`))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode, error.message))
    }

}
const userLocation = async (req, res) => {
    try {
        const { userId, DealerId } = req.body
        if (!userId) {
            return res.status(400).json(new ApiError(400, `userId is required`))
        }
        const result = await userLocationService(userId, DealerId)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched`))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode, error.message))
    }

}

export { viewMapping, createMapping, editMapping, userBrands, userDealers, userLocation }