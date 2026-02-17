import { getPool } from "../../db/db.js"
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js"

const uploadInternalRule = async (receiver, sender, addedby) => {
    try {
        const pool = await getPool()
        const jsonReceiver = JSON.stringify(receiver)
        const jsonSender = JSON.stringify(sender)
        // console.log(jsonReceiver,jsonSender);


        const result = await pool.request()
            .input('jsonr', sql.NVarChar, jsonReceiver)
            .input('jsons', sql.NVarChar, jsonSender)
            .input('AddedBy', sql.Int, addedby)
            .execute('dbo.CreateInternalRule_VB')

        return result

    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const insertInternalRule = async (receiver, sender, addedby) => {
    let transaction;
    try {
        const pool = await getPool()
        transaction = pool.transaction()

        const receiverobj = JSON.parse(receiver)
        const senderobj = JSON.parse(sender)

        // const result = await pool.request().query(`use z_scope select top 1 from AAP_InternalReceiver where RuleName = '${receiverobj.RuleName}'`)


        await transaction.begin()


        const query = `use z_scope insert into AAP_InternalReceiver(RuleName,LocationId,ParttypeId , PartQuality , Operator , FromRate , ToRate , Addedby)
        OUTPUT inserted.id                
        values(@RuleName,@LocationId,@PartTypeId,@PartQualityId,@Operator,@FromRate,@ToRate,@AddedBy)`


        const result = await transaction.request()
            .input('RuleName', sql.VarChar, receiverobj.RuleName)
            .input('LocationId', sql.Int, receiverobj.LocationId)
            .input('PartTypeId', sql.Int, receiverobj.PartTypeId)
            .input('PartQualityId', sql.Int, receiverobj.ReceiverPartQualityId)
            .input('Operator', sql.VarChar, receiverobj.Operator)
            .input('FromRate', sql.Int, receiverobj.FromRate)
            .input('ToRate', sql.Int, receiverobj.ToRate)
            .input('AddedBy', sql.Int, addedby)
            .query(query)

        const receiverId = result.recordset[0].id
        // console.log(receiverId);


        // console.log(senderobj);
        const senderPayload = senderobj.map(x => ({
            ReceiverId: receiverId,
            AddedBy: addedby,

            // schema fields (keep both id + text variants if they exist)
            SenderLocationId: x.SenderLocationId ?? null,
            SenderStockQualityId: x.SenderStockQualityId ?? null,

            // SenderLocation: x.SenderLocation ?? null,
            // SenderStockQuality: x.SenderStockQuality ?? null,

            RateMin: x.RateMin ?? null,
            RateMax: x.RateMax ?? null,
            ExcessDays: x.ExcessDays ?? null,

            TransferQtyType: x.TransferQtyType ?? null,
            // TransferType: x.TransferType ?? null,

            FixedQty: x.FixedQty ?? null,
        }));
        // console.log(senderPayload);
        if (senderPayload.length > 0) {
            const VALUES = senderPayload
                .map((_, i) =>
                    `(@ReceiverId${i}, @LocationId${i}, @PartQuality${i}, @FromRate${i}, @ToRate${i}, @ExcessDays${i}, @TransferQtyType${i}, @FixedQty${i}, @AddedBy${i})`
                )
                .join(',\n');

            const senderInsertQuery = `
        USE z_scope;
        INSERT INTO AAP_InternalSender
          (ReceiverId, LocationId, PartQuality, FromRate, ToRate, ExcessDays, TransferQtyType, FixedQty, AddedBy)
        VALUES
          ${VALUES};
      `;

            const req = transaction.request();
            senderPayload.forEach((s, i) => {
                req.input(`ReceiverId${i}`, sql.Int, s.ReceiverId);
                req.input(`LocationId${i}`, sql.Int, s.SenderLocationId);
                req.input(`PartQuality${i}`, sql.Int, s.SenderStockQualityId);
                req.input(`FromRate${i}`, sql.Int, s.RateMin);
                req.input(`ToRate${i}`, sql.Int, s.RateMax);
                req.input(`ExcessDays${i}`, sql.Int, s.ExcessDays);
                req.input(`TransferQtyType${i}`, sql.Int, s.TransferQtyType);
                req.input(`FixedQty${i}`, sql.Int, s.FixedQty);
                req.input(`AddedBy${i}`, sql.Int, s.AddedBy);
            });

            await req.query(senderInsertQuery);
            await transaction.commit();

            return {
                receiverId,
                sendersInserted: senderPayload.length,
                senderPayload,
            };
        }
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (_) { }
        }
        console.log(error);
        throw new ApiError(500, error.message)

    }

}

const viewRuleService = async (BrandId, DealerId, LocationId, RuleName) => {
    try {
        const pool = await getPool()
        const query = `use z_scope 
                select ir.id , a.Brand , a.Dealer , a.Location ,ir.RuleName , ptm.Description , pqm.Quality , ir.Operator , ir.FromRate , ir.ToRate, ir.Status , a.BrandId , a.DealerId , a.LocationId , ir.PartQuality , ir.PartTypeId from AAP_InternalReceiver ir
                join (
                select locationId , location , Brand , Dealer , BrandId , DealerId
                from locationinfo 
                where (@BrandId is null OR BrandId = @BrandId)
                AND (@DealerId is null OR DealerId = @DealerId)
                AND (@LocationId is null or LocationId = @LocationId)
                and  status = 1
                ) a on a.locationid = ir.locationid
                LEFT JOIN parttypemaster ptm on ptm.parttypeid = ir.parttypeid
                left JOIN PartQualityMaster pqm on pqm.id = ir.partquality
                where (@RuleName is null or ir.Rulename = @RuleName)`

        const result = await pool.request()
            .input('BrandId', sql.Int, BrandId)
            .input('DealerId', sql.Int, DealerId)
            .input('LocationId', sql.Int, LocationId)
            .input('RuleName', sql.VarChar, RuleName)
            .query(query)

        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const ruleExistingCheck = async (RuleName) => {
    try {
        const pool = await getPool()
        const existing = await pool.request().input('RuleName', sql.VarChar, RuleName).query(`use z_scope SELECT CASE WHEN EXISTS (SELECT 1 FROM AAP_InternalReceiver WHERE RuleName = @RuleName AND Status = 1) THEN 1 ELSE 0 END AS RuleExists`)
        // console.log(existing);

        return existing.recordset[0].RuleExists
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const clusterruleExistingCheck = async (RuleName) => {
    try {
        const pool = await getPool()
        const existing = await pool.request().input('RuleName', sql.VarChar, RuleName).query(`use z_scope SELECT CASE WHEN EXISTS (SELECT 1 FROM AAP_ClusterReceiver WHERE RuleName = @RuleName AND Status = 1) THEN 1 ELSE 0 END AS RuleExists`)
        // console.log(existing);

        return existing.recordset[0].RuleExists
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const getClusterService = async (LocationId) => {
    try {
        const pool = await getPool()
        const query = `use z_scope 
        select cm.Cluster , lm.LocationID , cm.tcode ClusterCode  from Clust_ClusterLocMapping lm 
        join Clust_ClusterMaster cm on cm.tCode = lm.ClusterCode
        where LocationID = @LocationId`
        const result = await pool.request().input('LocationId', sql.Int, LocationId).query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const insertClusterRule = async (receiver, sender, addedby) => {
    let transaction;
    try {
        const pool = await getPool()
        transaction = pool.transaction()

        // const receiverobj = JSON.parse(receiver)
        // const senderobj = JSON.parse(sender)

        // const result = await pool.request().query(`use z_scope select top 1 from AAP_InternalReceiver where RuleName = '${receiverobj.RuleName}'`)


        await transaction.begin()


        const query = `use z_scope insert into AAP_ClusterReceiver(RuleName,LocationId,ParttypeId , PartQuality , Operator , FromRate , ToRate , Addedby)
        OUTPUT inserted.id                
        values(@RuleName,@LocationId,@PartTypeId,@PartQualityId,@Operator,@FromRate,@ToRate,@AddedBy)`


        const result = await transaction.request()
            .input('RuleName', sql.VarChar, receiver.RuleName)
            .input('LocationId', sql.Int, receiver.LocationId)
            .input('PartTypeId', sql.Int, receiver.PartTypeId)
            .input('PartQualityId', sql.Int, receiver.ReceiverPartQualityId)
            .input('Operator', sql.VarChar, receiver.Operator)
            .input('FromRate', sql.Int, receiver.FromRate)
            .input('ToRate', sql.Int, receiver.ToRate)
            .input('AddedBy', sql.Int, addedby)
            .query(query)

        const receiverId = result.recordset[0].id
        // console.log(receiverId);


        // console.log(senderobj);
        const senderPayload = sender.map(x => ({
            ReceiverId: receiverId,
            AddedBy: addedby,

            // schema fields (keep both id + text variants if they exist)
            ClusterId: x.ClusterId ?? null,
            SenderStockQualityId: x.SenderStockQualityId ?? null,

            // SenderLocation: x.SenderLocation ?? null,
            // SenderStockQuality: x.SenderStockQuality ?? null,

            RateMin: x.RateMin ?? null,
            RateMax: x.RateMax ?? null,
            ExcessDays: x.ExcessDays ?? null,
            MaxDiscount: x.MaxDiscount ?? null

            // TransferQtyType: x.TransferQtyType ?? null,
            // TransferType: x.TransferType ?? null,
            // FixedQty: x.FixedQty ?? null,
        }));
        // console.log(senderPayload);
        if (senderPayload.length > 0) {
            const VALUES = senderPayload
                .map((_, i) =>
                    `(@ReceiverId${i}, @ClusterId${i}, @PartQuality${i}, @FromRate${i}, @ToRate${i}, @ExcessDays${i}, @MaxDiscount${i}, @AddedBy${i})`
                )
                .join(',\n');

            const senderInsertQuery = `
        USE z_scope;
        INSERT INTO AAP_ClusterSender
          (ReceiverId, ClusterId, StockQuality, FromRate, ToRate, ExcessDays,MaxDiscount, AddedBy)
        VALUES
          ${VALUES};
      `;

            const req = transaction.request();
            senderPayload.forEach((s, i) => {
                req.input(`ReceiverId${i}`, sql.Int, s.ReceiverId);
                req.input(`ClusterId${i}`, sql.Int, s.ClusterId);
                req.input(`PartQuality${i}`, sql.Int, s.SenderStockQualityId);
                req.input(`FromRate${i}`, sql.Int, s.RateMin);
                req.input(`ToRate${i}`, sql.Int, s.RateMax);
                req.input(`ExcessDays${i}`, sql.Int, s.ExcessDays);
                req.input(`MaxDiscount${i}`, sql.Int, s.MaxDiscount);
                // req.input(`TransferQtyType${i}`, sql.Int, s.TransferQtyType);
                // req.input(`FixedQty${i}`, sql.Int, s.FixedQty);
                req.input(`AddedBy${i}`, sql.Int, s.AddedBy);
            });

            await req.query(senderInsertQuery);
            await transaction.commit();

            return {
                receiverId,
                sendersInserted: senderPayload.length,
                senderPayload,
            };
        }
    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (_) { }
        }
        console.log(error);
        throw new ApiError(500, error.message)

    }

}

const uploadClusterRule = async (receiver, sender, addedby) => {
    try {
        const pool = await getPool()
        const jsonReceiver = JSON.stringify(receiver)
        const jsonSender = JSON.stringify(sender)
        // console.log(jsonReceiver,jsonSender);


        const result = await pool.request()
            .input('jsonr', sql.NVarChar, jsonReceiver)
            .input('jsons', sql.NVarChar, jsonSender)
            .input('AddedBy', sql.Int, addedby)
            .execute('dbo.CreateClusterRule_VB')

        return result

    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const viewClusterRuleService = async (BrandId, ClusterCode, DealerId, RuleName) => {
    try {
        const pool = await getPool()
        const query = `use z_scope
            select cr.Id , cr.RuleName , a.Brand , a.Dealer , a.Location , ptm.Description , pqm.Quality , cr.FromRate , cr.ToRate , cr.Operator , cr.Status , a.BrandId , a.DealerId , a.LocationId ,cr.PartQuality,cr.PartTypeId from AAP_ClusterReceiver cr
            join AAP_ClusterSender cs on cs.ReceiverId = cr.Id
            JOIN 
            (
            select LocationID, Brand , Dealer , Location , BrandId , DealerId from LocationInfo 
            where (@BrandId IS NULL OR BrandID = @BrandId) AND (@DealerId IS NULL OR DealerID = @DealerId) and Status = 1
            )a on a.LocationID = cr.LocationId
            JOIN 
            (
            select tcode from Clust_ClusterLocMapping
            where (@ClusterId IS NULL OR tCode = @ClusterId) and Status = 1
            )b on b.tCode = cs.ClusterId
            LEFT JOIN parttypemaster ptm on ptm.parttypeid = cr.parttypeid
            left JOIN PartQualityMaster pqm on pqm.id = cr.partquality
            Where (@RuleName IS NULL OR cr.RuleName = @RuleName)
            group by cr.Id , cr.RuleName , a.Brand , a.Dealer , a.Location , cr.FromRate , cr.ToRate , cr.Operator , cr.Status , a.BrandId , a.DealerId , a.LocationId , ptm.Description , pqm.Quality ,cr.PartQuality,cr.PartTypeId`
        const result = await pool.request()
            .input('BrandId', sql.Int, BrandId)
            .input('DealerId', sql.Int, DealerId)
            .input('ClusterId', sql.Int, ClusterCode)
            .input('RuleName', sql.VarChar, RuleName)
            .query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error)
    }
}

const updateInternalRuleService = async (receiverId, receiver, sender, addedby) => {
    let transaction;

    try {
        const pool = await getPool();
        transaction = pool.transaction();
        await transaction.begin();

        const receiverobj = JSON.parse(receiver || "{}");
        const senderobj = JSON.parse(sender || "[]");

        // 1) Ensure receiver exists
        const existsRes = await transaction.request()
            .input("ReceiverId", sql.Int, receiverId)
            .query(`
        USE z_scope;
        SELECT TOP 1 Id FROM AAP_InternalReceiver WHERE Id = @ReceiverId
      `);

        if (!existsRes.recordset?.length) {
            await transaction.rollback();
            throw new ApiError(404, `ReceiverId ${receiverId} not found`);
        }

        // 2) Update AAP_InternalReceiver (partial update)
        const receiverUpdate = buildReceiverUpdateQuery(receiverobj);
        if (receiverUpdate.hasAnyField) {
            const req1 = transaction.request().input("ReceiverId", sql.Int, receiverId);

            // bind only fields that are being updated
            receiverUpdate.bindings.forEach(b => {
                req1.input(b.name, b.type, b.value);
            });

            await req1.query(receiverUpdate.sql);
        }

        // 3) Update AAP_InternalSender (partial update)
        // Expected sender payload objects:
        // { senderId?, SenderLocationId?, SenderStockQualityId?, RateMin?, RateMax?, ExcessDays?, TransferQtyType?, FixedQty? }
        let senderUpdates = [];
        if (Array.isArray(senderobj) && senderobj.length > 0) {
            for (let i = 0; i < senderobj.length; i++) {
                const s = senderobj[i] || {};

                const senderUpdate = buildSenderUpdateQuery(s, {
                    receiverId,
                    senderId: s.senderId ?? s.Id ?? null, // support either key
                });

                if (!senderUpdate.hasAnyField) continue; // nothing to update for this sender payload

                const req2 = transaction.request()
                    .input("ReceiverId", sql.Int, receiverId);

                if (senderUpdate.senderId != null) {
                    req2.input("SenderId", sql.Int, senderUpdate.senderId);
                }

                senderUpdate.bindings.forEach(b => req2.input(b.name, b.type, b.value));

                const updRes = await req2.query(senderUpdate.sql);
                senderUpdates.push({
                    index: i,
                    senderId: senderUpdate.senderId,
                    rowsAffected: updRes?.rowsAffected?.[0] ?? 0,
                });
            }
        }

        await transaction.commit();

        return {
            receiverId,
            receiverUpdated: receiverUpdate?.hasAnyField ? true : false,
            senderUpdates,
        };

    } catch (error) {
        if (transaction) {
            try { await transaction.rollback(); } catch (_) { }
        }
        throw new ApiError(500, error?.message ?? error);
    }
};

const updateClusterRuleService = async (receiverId, receiver, sender, addedby) => {
  let transaction;

  try {
    const pool = await getPool();
    transaction = pool.transaction();
    await transaction.begin();

    const receiverobj = JSON.parse(receiver || "{}");
    const senderobj = JSON.parse(sender || "[]");

    // 1) Ensure receiver exists
    const existsRes = await transaction
      .request()
      .input("ReceiverId", sql.Int, receiverId)
      .query(`
        USE z_scope;
        SELECT TOP 1 Id FROM AAP_ClusterReceiver WHERE Id = @ReceiverId
      `);

    if (!existsRes.recordset?.length) {
      await transaction.rollback();
      throw new ApiError(404, `ReceiverId ${receiverId} not found`);
    }

    // 2) Update AAP_ClusterReceiver (partial update)
    const receiverUpdate = buildClusterReceiverUpdateQuery(receiverobj);
    if (receiverUpdate.hasAnyField) {
      const req1 = transaction.request().input("ReceiverId", sql.Int, receiverId);

      receiverUpdate.bindings.forEach((b) => {
        req1.input(b.name, b.type, b.value);
      });

      await req1.query(receiverUpdate.sql);
    }

    // 3) Update AAP_ClusterSender (partial update)
    // Expected sender payload objects:
    // { senderId?, ClusterId?, SenderStockQualityId?, RateMin?, RateMax?, ExcessDays?, MaxDiscount? }
    let senderUpdates = [];
    if (Array.isArray(senderobj) && senderobj.length > 0) {
      for (let i = 0; i < senderobj.length; i++) {
        const s = senderobj[i] || {};

        const senderUpdate = buildClusterSenderUpdateQuery(s, {
          receiverId,
          senderId: s.senderId ?? s.Id ?? null, // support either key
        });

        if (!senderUpdate.hasAnyField) continue;

        const req2 = transaction.request().input("ReceiverId", sql.Int, receiverId);

        if (senderUpdate.senderId != null) {
          req2.input("SenderId", sql.Int, senderUpdate.senderId);
        }

        senderUpdate.bindings.forEach((b) => req2.input(b.name, b.type, b.value));

        const updRes = await req2.query(senderUpdate.sql);

        senderUpdates.push({
          index: i,
          senderId: senderUpdate.senderId,
          rowsAffected: updRes?.rowsAffected?.[0] ?? 0,
        });
      }
    }

    await transaction.commit();

    return {
      receiverId,
      receiverUpdated: receiverUpdate?.hasAnyField ? true : false,
      senderUpdates,
    };
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {}
    }
    throw new ApiError(500, error?.message ?? error);
  }
};

const buildClusterReceiverUpdateQuery = (r = {}) => {
  const sets = [];
  const bindings = [];

  const add = (col, param, type, value) => {
    if (value === undefined) return; // only update if key is present
    sets.push(`${col} = @${param}`);
    bindings.push({ name: param, type, value: value ?? null });
  };

  add("RuleName", "RuleName", sql.VarChar, r.RuleName);
  add("LocationId", "LocationId", sql.Int, r.LocationId);
  add("ParttypeId", "PartTypeId", sql.Int, r.PartTypeId);
  add("PartQuality", "PartQualityId", sql.Int, r.ReceiverPartQualityId);
  add("Operator", "Operator", sql.VarChar, r.Operator);
  add("FromRate", "FromRate", sql.Int, r.FromRate);
  add("ToRate", "ToRate", sql.Int, r.ToRate);
  add("Status", "Status", sql.Bit, r.Status);

  // if your table has audit columns, keep this. else remove these 2 lines.
//   add("AddedBy", "AddedBy", sql.Int, r.UpdatedBy);
  // UpdatedAt = GETDATE() handled directly if any updates happen

  const hasAnyField = sets.length > 0;

  const sqlText = hasAnyField
    ? `
      USE z_scope;
      UPDATE AAP_ClusterReceiver
      SET ${sets.join(", ")}--, UpdatedAt = GETDATE()
      WHERE Id = @ReceiverId;
    `
    : "";

  return { hasAnyField, sql: sqlText, bindings };
};

// ---------- Sender Partial Update Builder ----------
const buildClusterSenderUpdateQuery = (s = {}, ctx = {}) => {
  const { receiverId, senderId } = ctx;

  const sets = [];
  const bindings = [];

  const add = (col, param, type, value) => {
    if (value === undefined) return;
    sets.push(`${col} = @${param}`);
    bindings.push({ name: param, type, value: value ?? null });
  };

  // only update if these keys are present
  add("ClusterId", "ClusterId", sql.Int, s.ClusterId);
  add("StockQuality", "SenderStockQualityId", sql.Int, s.SenderStockQualityId);
  add("FromRate", "RateMin", sql.Int, s.RateMin);
  add("ToRate", "RateMax", sql.Int, s.RateMax);
  add("ExcessDays", "ExcessDays", sql.Int, s.ExcessDays);
  add("MaxDiscount", "MaxDiscount", sql.Int, s.MaxDiscount);
  add("Status", "Status", sql.Bit, s.Status);

  const hasAnyField = sets.length > 0;

  // IMPORTANT:
  // If senderId is present -> update that specific row
  // If senderId is missing -> nothing to update (return hasAnyField=false) OR you can choose to throw error
  if (!senderId) return { hasAnyField: false, sql: "", bindings, senderId: null };

  const sqlText = hasAnyField
    ? `
      USE z_scope;
      UPDATE AAP_ClusterSender
      SET ${sets.join(", ")}--, UpdatedAt = GETDATE()
      WHERE Id = @SenderId AND ReceiverId = @ReceiverId;
    `
    : "";

  return { hasAnyField, sql: sqlText, bindings, senderId };
};

function buildReceiverUpdateQuery(receiverobj) {
  const setClauses = [];
  const bindings = [];

  // only update if value != null (null/undefined => skip)
  if (receiverobj.RuleName != null) {
    setClauses.push("RuleName = @RuleName");
    bindings.push({ name: "RuleName", type: sql.VarChar, value: receiverobj.RuleName });
  }
  if (receiverobj.LocationId != null) {
    setClauses.push("LocationId = @LocationId");
    bindings.push({ name: "LocationId", type: sql.Int, value: receiverobj.LocationId });
  }
  if (receiverobj.PartTypeId != null) {
    setClauses.push("ParttypeId = @PartTypeId");
    bindings.push({ name: "PartTypeId", type: sql.Int, value: receiverobj.PartTypeId });
  }
  if (receiverobj.ReceiverPartQualityId != null) {
    setClauses.push("PartQuality = @PartQualityId");
    bindings.push({ name: "PartQualityId", type: sql.Int, value: receiverobj.ReceiverPartQualityId });
  }
  if (receiverobj.Operator != null) {
    setClauses.push("Operator = @Operator");
    bindings.push({ name: "Operator", type: sql.VarChar, value: receiverobj.Operator });
  }
  if (receiverobj.FromRate != null) {
    setClauses.push("FromRate = @FromRate");
    bindings.push({ name: "FromRate", type: sql.Int, value: receiverobj.FromRate });
  }
  if (receiverobj.ToRate != null) {
    setClauses.push("ToRate = @ToRate");
    bindings.push({ name: "ToRate", type: sql.Int, value: receiverobj.ToRate });
  }
  if (receiverobj.AddedBy != null) {
    // if you allow updating AddedBy; if not, remove this
    setClauses.push("Addedby = @AddedBy");
    bindings.push({ name: "AddedBy", type: sql.Int, value: receiverobj.AddedBy });
  }
  if (receiverobj.Status != null) {
    // if you allow updating AddedBy; if not, remove this
    setClauses.push("Status = @Status");
    bindings.push({ name: "Status", type: sql.Bit, value: receiverobj.Status });
  }

  return {
    hasAnyField: setClauses.length > 0,
    bindings,
    sql: `
      USE z_scope;
      UPDATE AAP_InternalReceiver
      SET ${setClauses.join(", ")}
      WHERE Id = @ReceiverId;
    `,
  };
}

function buildSenderUpdateQuery(senderObj, { receiverId, senderId }) {
  const setClauses = [];
  const bindings = [];

  if (senderObj.SenderLocationId != null) {
    setClauses.push("LocationId = @LocationId");
    bindings.push({ name: "LocationId", type: sql.Int, value: senderObj.SenderLocationId });
  }
  if (senderObj.SenderStockQualityId != null) {
    setClauses.push("PartQuality = @PartQuality");
    bindings.push({ name: "PartQuality", type: sql.Int, value: senderObj.SenderStockQualityId });
  }
  if (senderObj.RateMin != null) {
    setClauses.push("FromRate = @FromRate");
    bindings.push({ name: "FromRate", type: sql.Int, value: senderObj.RateMin });
  }
  if (senderObj.RateMax != null) {
    setClauses.push("ToRate = @ToRate");
    bindings.push({ name: "ToRate", type: sql.Int, value: senderObj.RateMax });
  }
  if (senderObj.ExcessDays != null) {
    setClauses.push("ExcessDays = @ExcessDays");
    bindings.push({ name: "ExcessDays", type: sql.Int, value: senderObj.ExcessDays });
  }
  if (senderObj.TransferQtyType != null) {
    setClauses.push("TransferQtyType = @TransferQtyType");
    bindings.push({ name: "TransferQtyType", type: sql.Int, value: senderObj.TransferQtyType });
  }
  if (senderObj.FixedQty != null) {
    setClauses.push("FixedQty = @FixedQty");
    bindings.push({ name: "FixedQty", type: sql.Int, value: senderObj.FixedQty });
  }
  if (senderObj.Status != null) {
    // if you allow updating AddedBy; if not, remove this
    setClauses.push("Status = @Status");
    bindings.push({ name: "Status", type: sql.Bit, value: senderObj.Status });
  }
  // nothing to update
  if (setClauses.length === 0) {
    return { hasAnyField: false, bindings: [], sql: "", senderId };
  }

  // If senderId present -> update a specific sender row
  // Else -> update all sender rows for that receiver
  const whereClause = senderId != null
    ? "ReceiverId = @ReceiverId AND Id = @SenderId"
    : "ReceiverId = @ReceiverId";

  const sqlText = `
    USE z_scope;
    UPDATE AAP_InternalSender
    SET ${setClauses.join(", ")}
    WHERE ${whereClause};
  `;

  return {
    hasAnyField: true,
    senderId,
    bindings,
    sql: sqlText,
  };
}



export { uploadInternalRule, insertInternalRule, viewRuleService, ruleExistingCheck, getClusterService, clusterruleExistingCheck, insertClusterRule, uploadClusterRule, viewClusterRuleService , updateInternalRuleService, updateClusterRuleService}