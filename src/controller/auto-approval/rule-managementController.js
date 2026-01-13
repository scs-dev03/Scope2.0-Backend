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
  fetchTemplate,
  fetchAllRules,
  fetchRuleOutput,
  insertLocationWisePriority,
  viewRulesService,
  viewRuleByIdService
} from "../../services/auto-approval/rule-managementService.js";
import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import sql from 'mssql'

const addTemplate = async (req, res) => {
  try {
    const { name, tempDesc, template, createdBy, trueOutput, falseOutput, trueRemark, falseRemark } = req.body;

    if (!name || !tempDesc || !template || !createdBy || !trueOutput || !falseOutput || trueRemark === undefined || falseRemark === undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "name, tempDesc, template, createdBy, trueOutput, falseOutput, trueRemark, falseRemark are compulsory", [], ""));
    }

    const data = await insertTemplate(name, tempDesc, template, createdBy, trueOutput, falseOutput, trueRemark, falseRemark);

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
    const { Id, name, tempDesc, template, createdBy, status, trueOutput, falseOutput, trueRemark, falseRemark } = req.body;

    if (!Id || name === undefined || tempDesc === undefined || template === undefined || createdBy === undefined || status === undefined || trueOutput === undefined || falseOutput === undefined || trueRemark === undefined || falseRemark === undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "Id,name,tempDesc,template,createdBy,status,trueRemark,falseRemark,trueOutput,falseOutput is mandatory", [], ""));
    }

    const data = await updateTemplate(Id, name, tempDesc, template, createdBy, status, trueOutput, falseOutput, trueRemark, falseRemark);

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
  const { name, description, expression, trueOutput, falseOutput, createdBy, trueRemark, falseRemark, ruleFor, RuleType, mappings } = req.body;

  if (
    !Array.isArray(mappings) ||
    !name?.trim() ||
    !description?.trim() ||
    !expression?.trim() ||
    trueOutput == null ||
    falseOutput == null ||
    createdBy == null ||
    trueRemark === undefined ||
    falseRemark === undefined ||
    ruleFor === undefined ||
    RuleType == null
  ) {
    return res
      .status(400)
      .json(new ApiError(400, "mappings , name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark and createdBy are compulsory", [], ""));
  }
  if (RuleType === 1 && mappings.length > 1) {
    return res.status(400).json(new ApiError(400, `When Creating Location Specific Rules only 1 location is Required`))
  }
  const pool = await getPool1();
  const transaction = new sql.Transaction(pool);
  // console.log(transaction);

  try {
    await transaction.begin();

    // 1) Insert rule inside SAME transaction
    const RuleId = await insertRule(
      transaction,
      name,
      description,
      expression,
      trueOutput,
      falseOutput,
      createdBy,
      trueRemark,
      falseRemark,
      ruleFor,
      RuleType
    );
    // console.log(RuleId);

    // 2) Prepare mappings with RuleId + createdBy
    const ruleMappings = mappings.map(row => ({
      ...row,
      RuleId,
      createdBy
    }));

    // 3) Bulk insert mappings inside SAME transaction
    await insertRuleMapping(transaction, ruleMappings);

    await insertLocationWisePriority(transaction, RuleId, createdBy)

    // 4) Commit only if both succeed
    await transaction.commit();

    return res
      .status(201)
      .json(new ApiResponse(201, ruleMappings, "Rule added successfully"));
  } catch (err) {
    // rollback everything
    try {
      await transaction.rollback();
    } catch (e) {
      // ignore rollback error
    }

    return res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};


const getAllRules = async (req, res) => {
  try {
    const data = await fetchAllRules();
    res
      .status(200)
      .json(new ApiResponse(200, data, "Rule fetched successfully"));
  }
  catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
}

const modifyRule = async (req, res) => {
  try {
    const { ruleId, name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark, ruleFor, status} = req.body;

    if (ruleId == null ||
      name === undefined ||
      description === undefined ||
      expression === undefined ||
      trueOutput === undefined ||
      falseOutput === undefined ||
      trueRemark === undefined ||
      falseRemark === undefined ||
      ruleFor === undefined || 
      status === undefined
    ) {
      return res
        .status(400)
        .json(new ApiError(400, "ruleId,name,description,expression,trueOutput,falseOutput,trueRemark,falseRemark is mandatory for updating", [], ""));
    }

    const data = await updateRule(ruleId, name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark, ruleFor, status);

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
    const { BrandId, RuleIds, CreatedBy, DealerId, LocationId } = req.body;

    if (BrandId == null || !Array.isArray(RuleIds) || RuleIds.length === 0 || CreatedBy == null || DealerId === undefined || LocationId === undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "BrandId, RuleIds, CreatedBy,DealerId,LocationId are mandatory", [], ""));
    }
    if (RuleIds.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "RuleIds cannot be empty", [], ""));
    }

    //const data = await insertRuleMapping(BrandId, RuleIds, CreatedBy, DealerId, LocationId);
    const data = await Promise.all(
      RuleIds.map(ruleId =>
        insertRuleMapping(BrandId, ruleId, CreatedBy, DealerId, LocationId)
      )
    );
    res
      .status(201)
      .json(new ApiResponse(201, data, "Rule mapping created successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message || "internal server error", [], ""));
  }
};

const modifyRuleMapping = async (req, res) => {
  try {
    const { id, BrandId, RuleId, DealerId, LocationId, Status } = req.body;

    if (id == null || BrandId === undefined || RuleId === undefined || DealerId === undefined || LocationId === undefined || Status === undefined) {
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

    if (!LocationId || !RuleId || Priority === undefined || Status === undefined) {
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
      .json(new ApiError(err.statusCode || 500, err.message || "internal server error", [], ""));
  }
};

const getRuleMappings = async (req, res) => {
  try {
    const { BrandId, DealerId, LocationId } = req.body;

    if (!BrandId || DealerId === undefined || LocationId === undefined) {
      return res
        .status(400)
        .json(new ApiError(400, "BrandId, DealerId, LocationId is mandatory for fetching rule mappings", [], ""));
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

const getRuleOutput = async (req, res) => {
  try {
    const data = await fetchRuleOutput();
    res
      .status(200)
      .json(new ApiResponse(200, data, "Rule Output fetched successfully"));
  }
  catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
}

const viewRules = async (req, res) => {
  try {
    const { BrandId, DealerId, LocationId, RuleId } = req.body
    const result = await viewRulesService(BrandId, DealerId, LocationId, RuleId)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(error.statusCode || 500, error.message))
  }
}

const viewRuleById = async (req, res) => {
  try {
    const { Id } = req.body
    if (!Id) {
      return res.status(400).json(new ApiError(400, `Id is Required`))
    }
    const result = await viewRuleByIdService(Id)
    
    const grouped = groupRules(result);

    res.status(200).json(new ApiResponse(200, grouped))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}

function groupRules(rows) {
  const map = new Map();

  for (const r of rows) {
    // group by "rule identity" (everything except Brand/Dealer/Location)
    // so same rule across multiple locations gets merged
    const key = JSON.stringify({
      Id: r.Id,
      Name: r.Name,
      RuleDesc: r.RuleDesc,
      Rule: r.Rule,
      TrueOutput: r.TrueOutput,
      FalseOutput: r.FalseOutput,
      TrueRemarks: r.TrueRemarks,
      FalseRemarks: r.FalseRemarks,
      RuleFor: r.RuleFor,
      RuleType: r.RuleType,
    });

    if (!map.has(key)) {
      map.set(key, {
        Id: r.Id,
        Name: r.Name,
        RuleDesc: r.RuleDesc,
        Rule: r.Rule,
        TrueOutput: r.TrueOutput,
        FalseOutput: r.FalseOutput,
        TrueRemarks: r.TrueRemarks,
        FalseRemarks: r.FalseRemarks,
        RuleFor: r.RuleFor,
        RuleType: r.RuleType,
        BrandIds: new Set(),
        DealerIds: new Set(),
        LocationIds: new Set(),
      });
    }

    const g = map.get(key);
    if (r.BrandId != null) g.BrandIds.add(r.BrandId);
    if (r.DealerId != null) g.DealerIds.add(String(r.DealerId));
    if (r.LocationId != null) g.LocationIds.add(String(r.LocationId));
  }

  // convert Sets -> arrays
  return Array.from(map.values()).map(x => ({
    ...x,
    BrandIds: Array.from(x.BrandIds),
    DealerIds: Array.from(x.DealerIds),
    LocationIds: Array.from(x.LocationIds),
  }));
}

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
  getTemplate,
  getAllRules,
  getRuleOutput,
  viewRules,
  viewRuleById
};
