import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import sql from 'mssql'


export const insertTemplate = async (name, TempDesc, Template, createdBy, trueOutput, falseOutput, trueRemark, falseRemark) => {
    const pool = await getPool1();
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const duplicateCheck = await transaction.request()
            .input("name", name)
            .input("Template", Template)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_ruletemplate	
                WHERE [Name] = @name OR [Template] = @Template 
            `);

        if (duplicateCheck.recordset.length > 0) {
            throw new ApiError(400, "Template with same name or template already exists");
        }
        const result = await transaction.request()
            .input("name", name)
            .input("tempDesc", TempDesc)
            .input("Template", Template)
            .input("createdBy", createdBy)
            .input("trueOutput", trueOutput)
            .input("falseOutput", falseOutput)
            .input("trueRemark", trueRemark)
            .input("falseRemark", falseRemark)
            .query(`
        INSERT INTO z_scope..aap_ruletemplate ([Name],[TempDesc],[Template],[CreatedBy],[trueOutput],[falseOutput],[trueRemark],[falseRemark])
VALUES (@name, @tempDesc, @Template, @createdBy, @trueOutput, @falseOutput, @trueRemark, @falseRemark)
      `);
        if (result.rowsAffected[0] === 0) {
            throw new ApiError(500, `Failed to create the template:${result}`);
        }
        await transaction.commit();
        return result.recordset;
    } catch (err) {
        await transaction.rollback();
        throw new ApiError(err.statusCode || 500, err.message || "internal server error");
    }
};

export const updateTemplate = async (templateId, name, tempDesc, template, createdBy, status, trueOutput, falseOutput, trueRemark, falseRemark) => {
    try {
        const pool = await getPool1();
        const duplicateCheck = await pool.request()
            .input("name", name)
            .input("template", template)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_ruletemplate
                WHERE [Name] = @name OR [template] = @template
            `);

        if (duplicateCheck.recordset.length > 0) {
            throw new ApiError(400, "template with same name or template already exists");
        }
        if (template) {
            const exists = await pool.request()
                .input("template", template)
                .input("templateId", templateId)
                .query(`
                SELECT Id 
                FROM z_scope..aap_ruletemplate 
                WHERE [Template] = @template AND Id != @templateId
            `);

            if (exists.recordset.length > 0) {
                throw new ApiError(400, "A template with this template expression already exists");
            }
        }
        const query = `
        UPDATE z_scope..aap_ruletemplate
SET 
    Name     = COALESCE(@name, Name),
    TempDesc = COALESCE(@tempDesc, TempDesc),
    Template = COALESCE(@template, Template),
    CreatedBy= COALESCE(@createdBy, CreatedBy),
    Status   = COALESCE(@status, Status),
    TrueOutput= COALESCE(@trueOutput, TrueOutput),
    FalseOutput= COALESCE(@falseOutput, FalseOutput),
    TrueRemark=  COALESCE(@trueRemark, TrueRemark),
    FalseRemark= COALESCE(@falseRemark, FalseRemark)
WHERE Id = @templateId
    `;
        const result = await pool.request()
            .input("templateId", templateId)
            .input("name", name)
            .input("tempDesc", tempDesc)
            .input("template", template)
            .input("createdBy", createdBy)
            .input("status", status)
            .input("trueOutput", trueOutput)
            .input("falseOutput", falseOutput)
            .input("trueRemark", trueRemark)
            .input("falseRemark", falseRemark)
            .query(query);
        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "No tempalte exists for this template id");
        }
        return result.recordset;
    }
    catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};

export const fetchTemplate = async (createdBy, startDate, endDate) => {
    const pool = await getPool1();
    try {
        const result = await pool.request()
            .input("createdBy", createdBy)
            .input("startDate", startDate)
            .input("endDate", endDate)
            .query(
                `SELECT *
FROM z_scope..aap_ruletemplate
WHERE (@createdBy IS NULL OR CreatedBy =@createdby)
  AND (@startDate IS NULL OR CreatedAt >= @startDate)
  AND (@endDate   IS NULL OR CreatedAt <= @endDate);
`
            )
        return result.recordset;
    }
    catch (err) {
        throw new ApiError(500, err.message);
    }
}

export const insertRule = async (transaction, name, description, expression, trueOutput, falseOutput, createdBy, trueRemark, falseRemark, ruleFor, RuleType) => {
    // const pool = await getPool1();
    // const transaction = pool.transaction();
    try {
        // await transaction.begin();
        // console.log(`transaction inside`,transaction);

        const duplicateCheck = await transaction.request()
            .input("name", name)
            .input("expression", expression)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_rulemaster
                WHERE [Name] = @name OR [Rule] = @expression
            `);
        // console.log(duplicateCheck.recordsets);

        if (duplicateCheck.recordset.length > 0) {
            throw new ApiError(409, "Rule with same name or expression already exists");
        }
        const result = await transaction.request()
            .input("name", name)
            .input("description", description)
            .input("expression", expression)
            .input("trueOutput", trueOutput)
            .input("falseOutput", falseOutput)
            .input("trueRemark", trueRemark)
            .input("falseRemark", falseRemark)
            .input("ruleFor", ruleFor)
            .input("RuleType", RuleType)
            .input("AddedBy", createdBy)
            .query(`
        INSERT INTO z_scope..aap_rulemaster ([Name],[RuleDesc],[Rule],[TrueOutput],[FalseOutput],TrueRemarks,FalseRemarks,RuleFor, RuleType , AddedBy)
        OUTPUT INSERTED.id
        VALUES (@name, @description, @expression, @trueOutput,@falseOutput, @trueRemark, @falseRemark , @ruleFor , @RuleType, @AddedBy)
      `);
        const ruleId = result.recordset[0].id;
        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "No rule exists for this rule id");
        }
        // console.log(ruleId);
        // await transaction.commit();
        return ruleId;
    } catch (err) {
        // await transaction.rollback();
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};

export const updateRule = async (ruleId, name, description, expression, trueOutput, falseOutput, trueRemark, falseRemark, ruleFor , status) => {
    try {
        const pool = await getPool1();
        // const duplicateExpresionCheck = await pool.request()
        //     // .input("name", name)
        //     .input("expression", expression)
        //     .query(`
        //         SELECT TOP 1 1 
        //         FROM z_scope..aap_rulemaster
        //         WHERE [Rule] = @expression
        //     `);

        // if (duplicateExpresionCheck.recordset.length > 0) {
        //     throw new ApiError(400, "Rule already exists");
        // }

        const duplicateNameCheck = await pool.request()
            // .input("name", name)
            .input("name", name)
            .input("ruleId", ruleId)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_rulemaster
                WHERE name = @name AND Id != @ruleId
            `);

        if (duplicateNameCheck.recordset.length > 0) {
            throw new ApiError(400, "Rule Name already exists");
        }
        if (expression) {
            const exists = await pool.request()
                .input("expression", expression)
                .input("ruleId", ruleId)
                .query(`
                SELECT Id 
                FROM z_scope..aap_rulemaster 
                WHERE [Rule] = @expression AND Id != @ruleId
            `);

            if (exists.recordset.length > 0) {
                throw new ApiError(400, "A rule with this expression already exists");
            }
        }

        const request = pool.request();
        request.input("RuleId", ruleId);
        request.input("name", name);
        request.input("description", description);
        request.input("expression", expression);
        request.input("trueOutput", trueOutput);
        request.input("falseOutput", falseOutput);
        request.input("trueRemark", trueRemark);
        request.input("falseRemark", falseRemark);
        request.input("RuleFor", ruleFor);
        request.input("Status", status);
        // request.input("RuleType", RuleType);

        const query = `
    UPDATE z_scope..aap_rulemaster
    SET 
        [Name]       = COALESCE(@name, [Name]),
        [RuleDesc]   = COALESCE(@description, [RuleDesc]),
        [Rule]       = COALESCE(@expression, [Rule]),
        [TrueOutput] = COALESCE(@trueOutput, [TrueOutput]),
        [FalseOutput]= COALESCE(@falseOutput, [FalseOutput]),
        TrueRemarks=COALESCE(@trueRemark,TrueRemarks),
        FalseRemarks=COALESCE(@falseRemark,FalseRemarks),
        RuleFor=COALESCE(@RuleFor,RuleFor), 
        Status=COALESCE(@Status,Status)
        --RuleType=COALESCE(@RuleType,RuleType),
        WHERE Id = @RuleId`;
        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "No rule exists for this rule id");
        }

        return result.recordset;
    }
    catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};

// export const insertRuleMapping = async (BrandId, RuleId, CreatedBy, DealerId, LocationId) => {

//     const pool = await getPool1();
//     const transaction = pool.transaction();
//     try {
//         await transaction.begin();
//         let brandCheck = await transaction.request()
//             .input("RuleId", RuleId)
//             .input("BrandId", BrandId)
//             .query(`
//                 SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
//                 WHERE RuleId = @RuleId AND BrandId = @BrandId 
//                   AND DealerId IS NULL AND LocationId IS NULL
//             `);

//         if (brandCheck.recordset.length > 0) {
//             throw new ApiError(400, `Rule already mapped at Brand level`, {
//                 mappingId: brandCheck.recordset[0].Id
//             });
//         }


//         if (DealerId) {
//             let dealerCheck = await transaction.request()
//                 .input("RuleId", RuleId)
//                 .input("BrandId", BrandId)
//                 .input("DealerId", DealerId)
//                 .query(`
//                     SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
//                     WHERE RuleId = @RuleId AND BrandId = @BrandId 
//                       AND DealerId = @DealerId AND LocationId IS NULL
//                 `);

//             if (dealerCheck.recordset.length > 0) {
//                 throw new ApiError(400, `Rule already mapped at Dealer level`, {
//                     mappingId: dealerCheck.recordset[0].Id
//                 });
//             }
//         }

//         if (DealerId && LocationId) {
//             let locationCheck = await transaction.request()
//                 .input("RuleId", RuleId)
//                 .input("BrandId", BrandId)
//                 .input("DealerId", DealerId)
//                 .input("LocationId", LocationId)
//                 .query(`
//                     SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
//                     WHERE RuleId = @RuleId AND BrandId = @BrandId 
//                       AND DealerId = @DealerId AND LocationId = @LocationId
//                 `);

//             if (locationCheck.recordset.length > 0) {
//                 throw new ApiError(400, `Rule already mapped at Location level`, {
//                     mappingId: locationCheck.recordset[0].Id
//                 });
//             }
//         }

//         const result = await transaction.request()
//             .input("BrandId", BrandId)
//             .input("DealerId", DealerId)
//             .input("LocationId", LocationId)
//             .input("RuleId", RuleId)
//             .input("CreatedBy", CreatedBy)
//             .query(`
//                 INSERT INTO z_scope..AAP_RuleMapping (BrandId, DealerId, LocationId, RuleId, CreatedBy)
//                 OUTPUT INSERTED.Id
//                 VALUES (@BrandId, @DealerId, @LocationId, @RuleId, @CreatedBy)
//             `);
//         await transaction.commit();
//         return { mappingId: result.recordset[0].Id };

//     } catch (err) {
//         await transaction.rollback();
//         throw new ApiError(err.statusCode || 500, err.message);
//     }
// };

export const insertRuleMapping = async (transaction, mappings) => {
    if (!Array.isArray(mappings) || mappings.length === 0) return;

    try {
        // const pool = await getPool1();

        // 👇 Table definition must match your real table columns
        const table = new sql.Table("AAP_RuleMapping"); // if needed: "dbo.AAP_RuleMapping"
        table.create = false; // table already exists

        table.columns.add("RuleId", sql.Int, { nullable: true });
        table.columns.add("BrandId", sql.Int, { nullable: true });
        table.columns.add("DealerId", sql.Int, { nullable: true });
        table.columns.add("LocationId", sql.Int, { nullable: true });
        table.columns.add("CreatedBy", sql.Int, { nullable: true });

        for (const row of mappings) {
            table.rows.add(
                row.RuleId,
                row.BrandId ?? null,
                row.DealerId ?? null,
                row.LocationId ?? null,
                row.createdBy
            );
        }

        await transaction.request().bulk(table);
    } catch (err) {
        throw new ApiError(
            err.statusCode || 500,
            err.message || "Error inserting rule mappings"
        );
    }
};

export const updateRuleMapping = async (id, BrandId, RuleId, DealerId, LocationId, Status) => {
    try {
        const pool = await getPool1();
        const request = pool.request();

        const existing = await request.input("Id", id).query(`
        SELECT * FROM z_scope..aap_rulemapping WHERE Id = @Id
    `);

        if (existing.recordset.length === 0) {
            throw new ApiError(404, "No mapping exists for this Id");
        }

        const current = existing.recordset[0];

        const finalBrandId = BrandId ?? current.BrandId;
        const finalRuleId = RuleId ?? current.RuleId;
        const finalDealerId = DealerId ?? current.DealerId;
        const finalLocationId = LocationId ?? current.LocationId;

        const brandCheck = await pool.request()
            .input("RuleId", finalRuleId)
            .input("BrandId", finalBrandId)
            .input("Id", id)
            .query(`
            SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping
            WHERE RuleId = @RuleId AND BrandId = @BrandId
              AND DealerId IS NULL AND LocationId IS NULL
              AND Id <> @Id
        `);

        if (brandCheck.recordset.length > 0) {
            throw new ApiError(400, "Rule already mapped at Brand level", { mappingId: brandCheck.recordset[0].Id });
        }

        if (finalDealerId) {
            const dealerCheck = await pool.request()
                .input("RuleId", finalRuleId)
                .input("BrandId", finalBrandId)
                .input("DealerId", finalDealerId)
                .input("Id", id)
                .query(`
                SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping
                WHERE RuleId = @RuleId AND BrandId = @BrandId
                  AND DealerId = @DealerId AND LocationId IS NULL
                  AND Id <> @Id
            `);

            if (dealerCheck.recordset.length > 0) {
                throw new ApiError(400, "Rule already mapped at Dealer level", { mappingId: dealerCheck.recordset[0].Id });
            }
        }

        if (finalDealerId && finalLocationId) {
            const locationCheck = await pool.request()
                .input("RuleId", finalRuleId)
                .input("BrandId", finalBrandId)
                .input("DealerId", finalDealerId)
                .input("LocationId", finalLocationId)
                .input("Id", id)
                .query(`
                SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping
                WHERE RuleId = @RuleId AND BrandId = @BrandId
                  AND DealerId = @DealerId AND LocationId = @LocationId
                  AND Id <> @Id
            `);

            if (locationCheck.recordset.length > 0) {
                throw new ApiError(400, "Rule already mapped at Location level", { mappingId: locationCheck.recordset[0].Id });
            }
        }

        const updates = [];
        const updateRequest = pool.request().input("Id", id);

        if (BrandId) {
            updates.push("BrandId = @BrandId");
            updateRequest.input("BrandId", BrandId);
        }
        if (RuleId) {
            updates.push("RuleId = @RuleId");
            updateRequest.input("RuleId", RuleId);
        }
        if (DealerId !== undefined) {
            updates.push("DealerId = @DealerId");
            updateRequest.input("DealerId", DealerId);
        }
        if (LocationId !== undefined) {
            updates.push("LocationId = @LocationId");
            updateRequest.input("LocationId", LocationId);
        }
        if (Status !== undefined) {
            updates.push("Status = @Status");
            updateRequest.input("Status", Status);
        }

        if (updates.length === 0) {
            throw new ApiError(400, "No fields provided to update");
        }

        const query = `
        UPDATE z_scope..aap_rulemapping
        SET ${updates.join(", ")}
        WHERE Id = @Id
    `;

        const result = await updateRequest.query(query);

        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "Update failed, mapping not found");
        }

        return { mappingId: id };
    } catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};

export const insertPriorityMapping = async (LocationId, RuleId, Priority, CreatedBy) => {
    const pool = await getPool1();
    const transaction = pool.transaction();
    try {
        await transaction.begin();

        if (Priority && LocationId) {
            const presult = await transaction.request()
                .input("LocationId", LocationId)
                .input("Priority", Priority)
                .query(`
            SELECT * FROM z_scope..AAP_LocationPriority 
            WHERE LocationId = @LocationId AND Priority = @Priority
        `);

            if (presult.recordset.length > 0) {
                await transaction.request()
                    .input("LocationId", LocationId)
                    .input("Priority", Priority)
                    .query(
                        `update z_scope..AAP_LocationPriority
                     set Priority=Priority+1
                     where LocationId=@LocationId  and Priority>=@Priority`
                    )
            }
        }
        const result = await transaction.request()
            .input("LocationId", LocationId)
            .input("RuleId", RuleId)
            .input("Priority", Priority)
            .input("CreatedBy", CreatedBy)
            .query(`
                INSERT INTO z_scope..AAP_LocationPriority (LocationId, RuleId, Priority, CreatedBy)
                OUTPUT INSERTED.Id
                VALUES (@LocationId, @RuleId, @Priority, @CreatedBy)
            `);
        await transaction.commit();
        return { mappingId: result.recordset[0].Id };
    } catch (err) {
        await transaction.rollback();
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};

export const updatePriorityMapping = async (LocationId, RuleId, Priority, Status) => {
    const pool = await getPool1();
    const transaction = pool.transaction();

    try {
        await transaction.begin();

        // 1. Fetch old priority
        const oldRes = await transaction.request()
            .input("LocationId", LocationId)
            .input("RuleId", RuleId)
            .query(`
                SELECT Priority 
                FROM z_scope..AAP_LocationPriority
                WHERE LocationId = @LocationId AND RuleId = @RuleId
            `);

        if (oldRes.recordset.length === 0) {
            throw new ApiError(404, "No priority mapping exists for this LocationId and RuleId");
        }

        const oldPriority = oldRes.recordset[0].Priority;

        // 2. Shift priorities if needed
        if (Priority !== undefined && Priority !== oldPriority) {
            if (Priority > oldPriority) {
                // moving down (e.g., 3 -> 6)
                await transaction.request()
                    .input("LocationId", LocationId)
                    .input("oldPriority", oldPriority)
                    .input("newPriority", Priority)
                    .query(`
                        UPDATE z_scope..AAP_LocationPriority
                        SET Priority = Priority - 1
                        WHERE LocationId = @LocationId
                          AND Priority > @oldPriority
                          AND Priority <= @newPriority
                    `);
            } else {
                // moving up (e.g., 6 -> 3)
                await transaction.request()
                    .input("LocationId", LocationId)
                    .input("oldPriority", oldPriority)
                    .input("newPriority", Priority)
                    .query(`
                        UPDATE z_scope..AAP_LocationPriority
                        SET Priority = Priority + 1
                        WHERE LocationId = @LocationId
                          AND Priority >= @newPriority
                          AND Priority < @oldPriority
                    `);
            }
        }

        // 3. Update target record
        const updateRequest = transaction.request()
            .input("LocationId", LocationId)
            .input("RuleId", RuleId)
            .input("Priority", Priority)
            .input("Status", Status);

        const updateQuery = `
    UPDATE z_scope..AAP_LocationPriority
    SET 
        Priority = COALESCE(@Priority, Priority),
        Status   = COALESCE(@Status, Status)
    WHERE LocationId = @LocationId AND RuleId = @RuleId
`;

        const result = await updateRequest.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "Update failed — record not found after priority shift");
        }

        await transaction.commit();
        return result.recordset;

    } catch (err) {
        await transaction.rollback();
        throw new ApiError(err.statusCode || 500, err.message || "server error");
    }
};


export const fetchRuleMappings = async (BrandId, LocationId, DealerId) => {
    try {
        const pool = await getPool1();
        let query = `    
        select li.Brand,li.Dealer,li.Location,mp.RuleID,r.Name,r.RuleDesc,r.[Rule],r.TrueOutput,r.FalseOutput from z_scope..AAP_RuleMapping mp
        Left join z_scope..AAP_RuleMaster r on mp.RuleID=r.id
        left join LocationInfo li on mp.LocationId=li.LocationID 
        WHERE li.BrandId = @BrandId`;

        const request = pool.request().input("BrandId", BrandId);

        if (LocationId) {
            query += " AND li.LocationId = @LocationId";
            request.input("LocationId", LocationId);
        }

        if (DealerId) {
            query += " AND li.DealerId = @DealerId";
            request.input("DealerId", DealerId);
        }

        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        throw new ApiError(500, err.message);
    }
};

export const fetchPriorityMappings = async (LocationId) => {
    try {
        const pool = await getPool1();
        const result = await pool.request()
            .input("LocationId", LocationId)
            .query(`
            SELECT lp.id,li.Location,rm.Name,lp.priority,CreatedBy,lp.CreatedAt,lp.Status FROM z_scope..AAP_LocationPriority lp
            inner join aap_rulemaster rm
            on lp.ruleid=rm.Id
			inner join LocationInfo li
			on lp.locationid=li.LocationID
            WHERE lp.LocationId = @LocationId
            ORDER BY Priority ASC
        `);
        return result.recordset;
    } catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "internal server error");
    }
};

export const fetchAllRules = async () => {
    try {
        const pool = await getPool1();
        const result = await pool.request()
            .query(`
           select Id,Name from z_scope..AAP_RuleMaster
        `);
        return result.recordset;
    } catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "internal server error");
    }
};

export const fetchRuleOutput = async () => {
    try {
        const pool = await getPool1();
        const result = await pool.request()
            .query(`
           select Id,Condition from z_scope..AAP_RuleOutput
        `);
        return result.recordset;
    } catch (err) {
        throw new ApiError(err.statusCode || 500, err.message || "internal server error");
    }
};

export const insertLocationWisePriority = async (transaction, ruleId, userId) => {
    // const pool = await getPool1()
    try {
        const checkQuery = `select 1 from AAP_RuleMaster where Id = @Id `
        const result = await transaction.request().input('Id', sql.Int, ruleId).query(checkQuery)
        // console.log(result);
        if (result.rowsAffected == 1) {
            await transaction.request()
                .input('RuleId', ruleId)
                .input('AddedBy', userId)
                .execute(`dbo.AAP_SetLocationPriority`)
        }
        else {
            throw new ApiError(500, `RuleId doesn't exists -> ${ruleId}`)
        }
    } catch (error) {
        throw new ApiError(500, error.message)
    }

}

export const viewRulesService = async (BrandId, DealerId, LocationId, RuleId) => {
    try {
        const pool = await getPool1()
        const query = `select vcbrand Brand ,  vcName Dealer, li.Location ,rm.Name, rm.[Rule] , lp.priority   , lp.Status , rm.id , lp.LocationId , rm.RuleDesc , rm.TrueOutput , rm.FalseOutput , rm.TrueRemarks , rm.FalseRemarks , rm.RuleFor , rm.RuleType
                        from AAP_RuleMaster rm
                        JOIN AAP_RuleMapping rmp on rm.id = rmp.ruleid
                        JOIN AAP_LocationPriority lp on lp.ruleid = rm.Id
                        JOIN Brand_Master bm on bm.bigid = rmp.BrandId
                        JOIN Dealer_Master dm on dm.bigid = rmp.DealerId
                        JOIN LocationInfo li on li.locationid = rmp.locationid 
                        where (@BrandId IS NULL OR rmp.BrandId = @BrandId)
                        AND (@DealerId IS NULL OR rmp.DealerId = @DealerID)
                        AND (@LocationId IS NULL OR rmp.LocationId = @LocationId)
                        AND (@RuleID IS NULL OR rmp.RuleID = @RuleID)
                        order by lp.locationid , lp.priority`
        const result = await pool.request()
            .input('BrandId', sql.Int, BrandId)
            .input('DealerId', sql.Int, DealerId)
            .input('LocationId', sql.Int, LocationId)
            .input('RuleId', sql.Int, RuleId)
            .query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message);

    }
}

export const viewRuleByIdService = async (Id) => {
    try {
        const pool = await getPool1()
        const query = `use z_scope
        select rm.Id , Name , RuleDesc , [Rule] , TrueOutput , FalseOutput , TrueRemarks , FalseRemarks , RuleFor , RuleType , rmp.BrandId , DealerId , rmp.LocationId  from AAP_RuleMaster rm
        JOIN AAP_RuleMapping rmp on rm.id = rmp.ruleid
        where rm.Id = @Id
        group by rm.Id , Name , RuleDesc , [Rule] , TrueOutput , FalseOutput , TrueRemarks , FalseRemarks , RuleFor , RuleType , rmp.BrandId , DealerId , rmp.LocationId`

        const result = await pool.request().input('Id', sql.Int, Id).query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error)
    }
}