import { clusterruleExistingCheck, getClusterService, insertClusterRule, insertInternalRule, ruleExistingCheck, updateClusterRuleService, updateInternalRuleService, uploadClusterRule, uploadInternalRule, viewClusterRuleService, viewRuleService } from "../../services/auto-approval/internalandclustercreationService.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { readExcel } from "../../utils/vonHelper.js";
import fs from 'fs'

const addInternal = async (req, res) => {
    try {
        const { addedby, excel, receiver, senders } = req.body
        if (!addedby || !excel) {
            return res.status(400).json(new ApiError(400, `addedby and excel are required`))
        }
        if (excel == 1) {
            const file = req.file
            if (!file) {
                return res.status(400).json(new ApiError(400, `file is required`))
            }
            const { header, data } = await readExcel(file.path)
            fs.unlinkSync(file.path)
            // console.log(data);

            const { receiver, senders } = splitReceiverSender(data);
            // console.log(senders);
            const check = await ruleExistingCheck(receiver.RuleName)
            if (check == 1) {
                return res.status(409).json(new ApiResponse(409, `${receiver.RuleName} Already Exist`))
            }

            const output = await uploadInternalRule(receiver, senders, addedby)

            res.status(200).json(new ApiResponse(200, output))
        } else {
            const receiverobj = JSON.parse(receiver)

            const check = await ruleExistingCheck(receiverobj.RuleName)
            if (check == 1) {
                return res.status(409).json(new ApiResponse(409, `${receiverobj.RuleName} Already Exist`))
            }
            const result = await insertInternalRule(receiver, senders, addedby)
            res.status(200).json(new ApiResponse(200, result))
        }

    } catch (error) {
        res.status(500).json(new ApiError(500, error))
    }
}

const viewRule = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, RuleName } = req.body
        const result = await viewRuleService(BrandId, DealerId, LocationId, RuleName)
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(500, error))
    }

}

const getcluster = async (req, res) => {
    try {
        const { LocationId } = req.body
        const data = await getClusterService(LocationId)
        res.status(200).json(new ApiResponse(200, data))
    } catch (error) {
        res.status(500).json(new ApiError(500, error))
    }
}

function splitReceiverSender(rows) {
    const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());
    const toInt = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
        return { receiver: null, senders: [] };
    }

    // receiver row = first row that has RuleName (or Location)
    const receiverRow = rows.find(r => norm(r.RuleName) !== "");
    if (!receiverRow) {
        return { receiver: null, senders: [] };
    }

    const receiver = {
        RuleName: norm(receiverRow.RuleName),
        Brand: norm(receiverRow.Brand),
        Dealer: norm(receiverRow.Dealer),
        Location: norm(receiverRow.Location),
        PartCategory: norm(receiverRow.PartCategory),
        ReceiverStockQuality: norm(receiverRow.ReceiverStockQuality),
        Operator: norm(receiverRow.Operator),
        FromRate: toInt(receiverRow.FromRate),
        ToRate: toInt(receiverRow.ToRate),
    };

    const senders = rows
        .filter(r => norm(r.SenderLocation) !== "")
        .map(r => ({
            SenderLocation: norm(r.SenderLocation),
            SenderStockQuality: norm(r.SenderStockQuality),
            RateMin: toInt(r.RateMin),
            RateMax: toInt(r.RateMax),
            ExcessDays: toInt(r.ExcessDays),
            TransferType: norm(r.TransferType),
            FixedQty: toInt(r.FixedQty),
        }));

    return { receiver, senders };
}

const addCluster = async (req, res) => {
    const { receiver, senders, addedby } = req.body
    // console.log(receiver,senders,addedby);

    const check = await clusterruleExistingCheck(receiver.RuleName)
    if (check == 1) {
        return res.status(409).json(new ApiError(409, `${receiver.RuleName} Already Exist`))
    }
    // console.log(check);

    const result = await insertClusterRule(receiver, senders, addedby)
    res.status(200).json(new ApiResponse(200, result))


}

function splitReceiverSenderCluster(rows) {
    const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());
    const toInt = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
        return { receiver: null, senders: [] };
    }

    // receiver row = first row that has RuleName (or Brand/Dealer/Location)
    const receiverRow = rows.find((r) => norm(r.RuleName) !== "");
    if (!receiverRow) {
        return { receiver: null, senders: [] };
    }

    const receiver = {
        RuleName: norm(receiverRow.RuleName),
        Brand: norm(receiverRow.Brand),
        Dealer: norm(receiverRow.Dealer),
        Location: norm(receiverRow.Location),
        PartCategory: norm(receiverRow.PartCategory),
        ReceiverStockQuality: norm(receiverRow.ReceiverStockQuality),
        Operator: norm(receiverRow.Operator),
        FromRate: toInt(receiverRow.FromRate),
        ToRate: toInt(receiverRow.ToRate), // if not present -> null
    };

    const senders = rows
        .filter((r) => norm(r.SenderCluster) !== "")
        .map((r) => ({
            SenderCluster: norm(r.SenderCluster),
            SenderStockQuality: norm(r.SenderStockQuality),
            RateMin: toInt(r.RateMin),
            RateMax: toInt(r.RateMax),
            ExcessDays: toInt(r.ExcessDays),
            MaxDiscount: toInt(r.MaxDiscount),
        }));

    return { receiver, senders };
}

const uploadCluster = async (req, res) => {
    try {
        const { addedby } = req.body
        if (!addedby) {
            return res.status(400).json(new ApiError(400, `addedby is required`))
        }
        const file = req.file
        if (!file) {
            return res.status(400).json(new ApiError(400, `file is required`))
        }
        const { header, data } = await readExcel(file.path)
        fs.unlinkSync(file.path)
        // console.log(header,data);
        
        const { receiver, senders } = splitReceiverSenderCluster(data);
        // console.log(receiver, senders);

        const check = await clusterruleExistingCheck(receiver.RuleName)
        if (check == 1) {
            return res.status(409).json(new ApiError(409, `${receiver.RuleName} Already Exist`))
        }

        const output = await uploadClusterRule(receiver, senders, addedby)

        res.status(200).json(new ApiResponse(200, output))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }


}

const viewClusterRule = async (req, res) => {
    try {
        const { BrandId, ClusterCode, DealerId, RuleName } = req.body
        if (!BrandId) {
            return res.status(400).json(new ApiError(400, `BrandId is required`))
        }
        const result = await viewClusterRuleService(BrandId, ClusterCode, DealerId, RuleName)
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }
}

const editInternalRule = async (req, res) => {
  try {
    const { addedby, receiverId, receiver, senders } = req.body;

    if (!addedby || !receiverId) {
      return res.status(400).json(new ApiError(400, `addedby and receiverId are required`));
    }

    // receiver = JSON string OR object (handle both)
    const receiverStr = typeof receiver === "string" ? receiver : JSON.stringify(receiver ?? {});
    const sendersStr = typeof senders === "string" ? senders : JSON.stringify(senders ?? []);

    const result = await updateInternalRuleService(receiverId, receiverStr, sendersStr, addedby);

    return res.status(200).json(new ApiResponse(200, result));
  } catch (error) {
    return res.status(500).json(new ApiError(500, error?.message ?? error));
  }
};

const editClusterRule = async (req, res) => {
  try {
    const { addedby, receiverId, receiver, senders } = req.body;

    if (!addedby || !receiverId) {
      return res
        .status(400)
        .json(new ApiError(400, `addedby and receiverId are required`));
    }

    // receiver = JSON string OR object (handle both)
    const receiverStr =
      typeof receiver === "string" ? receiver : JSON.stringify(receiver ?? {});
    const sendersStr =
      typeof senders === "string" ? senders : JSON.stringify(senders ?? []);

    const result = await updateClusterRuleService(
      receiverId,
      receiverStr,
      sendersStr,
      addedby
    );

    return res.status(200).json(new ApiResponse(200, result));
  } catch (error) {
    return res.status(500).json(new ApiError(500, error?.message ?? error));
  }
};

export { addInternal, viewRule, getcluster, addCluster, uploadCluster, viewClusterRule , editInternalRule , editClusterRule }

