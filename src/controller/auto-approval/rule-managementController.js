import {
  insertRule,
  updateRule,
  insertRuleMapping,
  updateRuleMapping,
  insertPriorityMapping,
  updatePriorityMapping,
  fetchPriorityMappings,
  fetchRuleMappings
} from "../../services/auto-approval/rule-managementService.js";

import { ApiError} from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const addRule = async (req, res) => {
  try {
    const { name, description, expression, trueOutput, falseOutput } = req.body;

    if (!name || !description || !expression || !trueOutput || !falseOutput) {
      return res
        .status(400)
        .json(new ApiError(400, "name, description, expression, output are compulsory", [], ""));
    }

    const data = await insertRule(name, description, expression, trueOutput, falseOutput);

    res
      .status(201)
      .json(new ApiResponse(201,data,"Rule added successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const modifyRule = async (req, res) => {
  try {
    const { ruleId, name, description, expression, trueOutput, falseOutput } = req.body;

    if (!ruleId) {
      return res
        .status(400)
        .json(new ApiError(400, "ruleId is mandatory for updating", [], ""));
    }

    const data = await updateRule(ruleId, name, description, expression, trueOutput, falseOutput);

    res
      .status(200)
      .json(new ApiResponse(200, data, "Rule modified successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const addRuleMapping = async (req, res) => {
  try {
    const { BrandId, RuleId, CreatedBy, DealerId, LocationId } = req.body;

    if (!BrandId || !RuleId || !CreatedBy) {
      return res
        .status(400)
        .json(new ApiError(400, "BrandId, RuleId, and CreatedBy are mandatory", [], ""));
    }

    const data = await insertRuleMapping(BrandId, RuleId, CreatedBy, DealerId, LocationId);

    res
      .status(201)
      .json(new ApiResponse(201,data,"Rule mapping created successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const modifyRuleMapping = async (req, res) => {
  try {
    const { id, BrandId, RuleId, DealerId, LocationId, Status } = req.body;

    if (!id) {
      return res
        .status(400)
        .json(new ApiError(400, "Mapping Id is mandatory for updating", [], ""));
    }

    const data = await updateRuleMapping(id, BrandId, RuleId, DealerId, LocationId, Status);

    res
      .status(200)
      .json(new ApiResponse(200, data, "Rule mapping updated successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const addPriorityMapping = async (req, res) => {
  try {
    const { LocationId, RuleId, Priority, CreatedBy } = req.body;

    if (!LocationId || !RuleId || !Priority || !CreatedBy) {
      return res
        .status(400)
        .json(new ApiError(400, "LocationId, RuleId, Priority, and CreatedBy are mandatory", [], ""));
    }

    const data = await insertPriorityMapping(LocationId, RuleId, Priority, CreatedBy);

    res
      .status(201)
      .json(new ApiResponse(201, data, "Priority mapping added successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const modifyPriorityMapping = async (req, res) => {
  try {
    const { LocationId, RuleId, Priority, Status } = req.body;

    if (!LocationId || !RuleId) {
      return res
        .status(400)
        .json(new ApiError(400, "LocationId and RuleId are mandatory", [], ""));
    }

    const data = await updatePriorityMapping(LocationId, RuleId, Priority, Status);

    res
      .status(200)
      .json(new ApiResponse(200, data, "Priority mapping updated successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const getPriorityMappings = async (req, res) => {
  try {
    const { LocationId } = req.body;

    if (!LocationId) {
      return res
        .status(400)
        .json(new ApiError(400, "LocationId is mandatory", [], ""));
    }

    const data = await fetchPriorityMappings(LocationId);
    if(data.length==0){
      res
      .status(200)
      .json(new ApiResponse(200, data, "no mapping exist for this Location"));
    }
    else{res
        .status(200)
      .json(new ApiResponse(200, data, "Priority mappings fetched successfully"));
    }
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }  
};

const getRuleMappings = async (req, res) => {
  try {
    const { BrandId, DealerId, LocationId } = req.body;

    if (!BrandId) {
      return res
        .status(400)
        .json(new ApiError(400, "BrandId is mandatory for fetching rule mappings", [], ""));
    }

    const data = await fetchRuleMappings(BrandId, LocationId, DealerId);
     if(data.length==0){
      res
      .status(200)
      .json(new ApiResponse(200, data, "no mapping exist for this Brand or Dealer or Location"));
    }
    else{
    res
      .status(200)
      .json(new ApiResponse(200, data, "Rule mappings fetched successfully"));
    }
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

export {
  addRule,
  modifyRule,
  addRuleMapping,
  modifyRuleMapping,
  addPriorityMapping,
  modifyPriorityMapping,
  getPriorityMappings,
  getRuleMappings
};
