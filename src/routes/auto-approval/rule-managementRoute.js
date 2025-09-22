import { Router } from "express";
import {
    addRule, modifyRule, addRuleMapping,
    modifyRuleMapping, addPriorityMapping, modifyPriorityMapping, getRuleMappings, getPriorityMappings
} from "../../controller/auto-approval/rule-managementController.js"

const router = Router();

router.post("/add-rule", addRule);
router.put("/modify-rule", modifyRule);
router.post("/add-ruleMapping", addRuleMapping);
router.put("/modify-ruleMapping", modifyRuleMapping)
router.post("/add-priority-mapping", addPriorityMapping);
router.put("/modify-priority-mapping", modifyPriorityMapping);
router.post("/rule-mappings", getRuleMappings);
router.post("/priority-mappings", getPriorityMappings);

export default router;

