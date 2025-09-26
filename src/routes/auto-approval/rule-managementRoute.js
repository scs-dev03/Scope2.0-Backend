import { Router } from "express";
import {
    addRule, modifyRule, addRuleMapping,
    modifyRuleMapping, addPriorityMapping, modifyPriorityMapping, getRuleMappings, getPriorityMappings, addTemplate,
    modifyTemplate,
    getTemplate,
    getAllRules,
    getRuleOutput
} from "../../controller/auto-approval/rule-managementController.js"

const router = Router();

router.post("/add-template",addTemplate);
router.put("/modify-template",modifyTemplate);
router.post("/template",getTemplate);
router.post("/add-rule", addRule);
router.put("/modify-rule", modifyRule);
router.get("/view-rules",getAllRules)
router.post("/add-ruleMapping", addRuleMapping);
router.put("/modify-ruleMapping", modifyRuleMapping)
router.post("/add-priority-mapping", addPriorityMapping);
router.put("/modify-priority-mapping", modifyPriorityMapping);
router.post("/rule-mappings", getRuleMappings);
router.post("/priority-mappings", getPriorityMappings);
router.get("/view-ruleoutput",getRuleOutput);

export default router;

