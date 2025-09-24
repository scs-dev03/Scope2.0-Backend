import {
  insertTemplate,
  insertRule,
  updateRule,
  insertRuleMapping,
  updateRuleMapping,
  insertPriorityMapping,
  updatePriorityMapping,
  fetchPriorityMappings,
  fetchRuleMappings,
  updateTemplate,
  fetchTemplate
} from "../../services/auto-approval/rule-managementService.js";

import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const addTemplate = async (req, res) => {
  try {
    const { name, tempDesc, template, createdBy } = req.body;

    if (!name || !tempDesc || !template || !createdBy) {
      return res
        .status(400)
        .json(new ApiError(400, "name, TempDesc, Template, createdBy are compulsory", [], ""));
    }

    const data = await insertTemplate(name, tempDesc, template, createdBy);

    res
      .status(201)
      .json(new ApiResponse(201, data, "Template added successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};
const modifyTemplate = async (req, res) => {
  try {
    const { Id, name, tempDesc, template, createdBy, status } = req.body;

    if (!Id || name===undefined || tempDesc===undefined || template===undefined || createdBy===undefined || status===undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "Id,name,tempDesc,template,createdBy,status is mandatory", [], ""));
    }

    const data = await updateTemplate(Id, name, tempDesc, template, createdBy, status);

    res
      .status(200)
      .json(new ApiResponse(200, data, "Template modified successfully"));
  } catch (err) {
    console.log(err);
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const getTemplate = async (req, res) => {
  try {
    const { createdBy, startDate, endDate } = req.body;

    if (createdBy === undefined || startDate === undefined || endDate === undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "createdBy, startDate,endDate is mandatory for fetching rule mappings", [], ""));
    }

    const data = await fetchTemplate(createdBy, startDate, endDate);
    if (data.length == 0) {
      res
        .status(200)
        .json(new ApiResponse(200, data, "no template exist for this user or in this range"));
    }
    else {
      res
        .status(200)
        .json(new ApiResponse(200, data, "template fetched successfully"));
    }
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const addRule = async (req, res) => {
  try {
    const { LocationId, name, description, expression, trueOutput, falseOutput, createdBy, trueRemark, falseRemark } = req.body;

    if (
      LocationId === undefined ||
      !name?.trim() ||
      !description?.trim() ||
      !expression?.trim() ||
      trueOutput == null ||
      falseOutput == null ||
      createdBy == null ||
      trueRemark === undefined ||
      falseRemark === undefined
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "LocationId, name, description, expression, output, trueRemark, falseRemark and createdBy are compulsory", [], ""));
    }

    const data = await insertRule(LocationId, name, description, expression, trueOutput, falseOutput, createdBy, trueRemark, falseRemark);

    res
      .status(201)
      .json(new ApiResponse(201, data, "Rule added successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};


const modifyRule = async (req, res) => {
  try {
    const { ruleId, name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark } = req.body;

    if (ruleId==null || 
      name===undefined ||
      description===undefined||
      expression===undefined ||
      trueOutput === undefined ||
      falseOutput === undefined ||
      trueRemark === undefined ||
      falseRemark === undefined
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "ruleId,name,description,expression,trueOutput,falseOutput,createdBy,trueRemark,falseRemark is mandatory for updating", [], ""));
    }

    const data = await updateRule(ruleId, name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark);

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

    if (BrandId==null || RuleId==null || CreatedBy==null || DealerId===undefined || LocationId===undefined) {
      return res
        .status(400)  
        .json(new ApiError(400, "BrandId, RuleId, and CreatedBy,DealerId,LocationId are mandatory", [], ""));
    }

    const data = await insertRuleMapping(BrandId, RuleId, CreatedBy, DealerId, LocationId);

    res
      .status(201)
      .json(new ApiResponse(201, data, "Rule mapping created successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

const modifyRuleMapping = async (req, res) => {
  try {
    const { id, BrandId, RuleId, DealerId, LocationId, Status } = req.body;

    if (id==null || BrandId===undefined || RuleId===undefined || DealerId===undefined || LocationId===undefined || Status===undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "id, BrandId,RuleId,DealerId,LocationId,Status is mandatory", [], ""));
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

    if (!LocationId || !RuleId || Priority===undefined || Status===undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "LocationId,Priority,Status and RuleId are mandatory", [], ""));
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
    if (data.length == 0) {
      res
        .status(200)
        .json(new ApiResponse(200, data, "no mapping exist for this Location"));
    }
    else {
      res
        .status(200)
      .json(new ApiResponse(200, data, "Priority mappings fetched successfully"));
    }
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message ||"internal server error", [], ""));
  }
};

const getRuleMappings = async (req, res) => {
  try {
    const { BrandId, DealerId, LocationId } = req.body;

    if (!BrandId || DealerId===undefined || LocationId===undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "BrandId is mandatory for fetching rule mappings", [], ""));
    }

    const data = await fetchRuleMappings(BrandId, LocationId, DealerId);
    if (data.length == 0) {
      res
        .status(200)
        .json(new ApiResponse(200, data, "no mapping exist for this Brand or Dealer or Location"));
    }
    else {
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
  addTemplate,
  modifyTemplate,
  addRule,
  modifyRule,
  addRuleMapping,
  modifyRuleMapping,
  addPriorityMapping,
  modifyPriorityMapping,
  getPriorityMappings,
  getRuleMappings,
  getTemplate
};
