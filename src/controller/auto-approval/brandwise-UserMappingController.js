import { createMappingService, editMappingService, viewMappingService } from "../../services/auto-approval/brandwise-UserMappingService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const viewMapping = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, UserId } = req.body
        const result = await viewMappingService(BrandId, DealerId, LocationId, UserId)
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

export { viewMapping, createMapping, editMapping }