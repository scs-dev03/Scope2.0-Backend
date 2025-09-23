import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const insertRule = async (name, description, expression, trueOutput, falseOutput) => {
    if (!name || !description || !expression || !trueOutput || !falseOutput) {
        throw new ApiError(400, "name, description, expression, output is compulsory");
    }
    const pool = await getPool1();
    try {
        const duplicateCheck = await pool.request()
            .input("name", name)
            .input("expression", expression)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_rulemaster
                WHERE [Name] = @name OR [Rule] = @expression
            `);

        if (duplicateCheck.recordset.length > 0) {
            throw new ApiError(400, "Rule with same name or expression already exists");
        }
        const result = await pool.request()
            .input("name", name)
            .input("description", description)
            .input("expression", expression)
            .input("trueOutput", trueOutput)
            .input("falseOutput", falseOutput)
            .query(`
        INSERT INTO z_scope..aap_rulemaster ([Name],[RuleDesc],[Rule],[TrueOutput],[FalseOutput])
VALUES (@name, @description, @expression, @trueOutput, @falseOutput)
      `);
       if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "No rule exists for this rule id");
        }
        return result.recordset;
    } catch (err) {
        throw new ApiError(500, err.message);
    }
};

export const updateRule = async (ruleId, name, description, expression, trueOutput, falseOutput) => {
    if (!ruleId) {
        throw new ApiError(400, "Rule Id is mandatory for updating the rule");
    }
    try {
        const pool = await getPool1();
        const duplicateCheck = await pool.request()
            .input("name", name)
            .input("expression", expression)
            .query(`
                SELECT TOP 1 1 
                FROM z_scope..aap_rulemaster
                WHERE [Name] = @name OR [Rule] = @expression
            `);

        if (duplicateCheck.recordset.length > 0) {
            throw new ApiError(400, "Rule with same name or expression already exists");
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

        let updates = [];
        const request = pool.request();
        request.input("RuleId", ruleId);

        if (name) {
            updates.push("[Name] = @name");
            request.input("name", name);
        }
        if (description) {
            updates.push("[RuleDesc] = @description");
            request.input("description", description);
        }
        if (expression) {
            updates.push("[Rule] = @expression");
            request.input("expression", expression);
        }
        if (trueOutput) {
            updates.push("[TrueOutput] = @trueOutput");
            request.input("trueOutput", trueOutput);
        }
        if (falseOutput) {
            updates.push("[FalseOutput] = @falseOutput");
            request.input("falseOutput", falseOutput);
        }

        if (updates.length === 0) {
            throw new ApiError(400, "No fields provided to update");
        }

        const query = `
        UPDATE z_scope..aap_rulemaster
        SET ${updates.join(", ")}
        WHERE Id = @RuleId
    `;

        const result = await request.query(query);
        if (result.rowsAffected[0] === 0) {
            throw new ApiError(404, "No rule exists for this rule id");
        }

        return result.recordset;
    }
    catch (err) {
        throw new ApiError(500, err.message);
    }
};

export const insertRuleMapping = async (BrandId, RuleId, CreatedBy, DealerId = null, LocationId = null) => {
    if (!BrandId || !RuleId || !CreatedBy) {
        throw new ApiError(400, "BrandId, RuleId, and CreatedBy are mandatory");
    }

    const pool = await getPool1();
    try {
        
        let brandCheck = await pool.request()
            .input("RuleId", RuleId)
            .input("BrandId", BrandId)
            .query(`
                SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
                WHERE RuleId = @RuleId AND BrandId = @BrandId 
                  AND DealerId IS NULL AND LocationId IS NULL
            `);

        if (brandCheck.recordset.length > 0) {
            throw new ApiError(400, `Rule already mapped at Brand level`, {
                mappingId: brandCheck.recordset[0].Id
            });
        }


        if (DealerId) {
            let dealerCheck = await pool.request()
                .input("RuleId", RuleId)
                .input("BrandId", BrandId)
                .input("DealerId", DealerId)
                .query(`
                    SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
                    WHERE RuleId = @RuleId AND BrandId = @BrandId 
                      AND DealerId = @DealerId AND LocationId IS NULL
                `);

            if (dealerCheck.recordset.length > 0) {
                throw new ApiError(400, `Rule already mapped at Dealer level`, {
                    mappingId: dealerCheck.recordset[0].Id
                });
            }
        }

        if (DealerId && LocationId) {
            let locationCheck = await pool.request()
                .input("RuleId", RuleId)
                .input("BrandId", BrandId)
                .input("DealerId", DealerId)
                .input("LocationId", LocationId)
                .query(`
                    SELECT TOP 1 Id FROM z_scope..AAP_RuleMapping 
                    WHERE RuleId = @RuleId AND BrandId = @BrandId 
                      AND DealerId = @DealerId AND LocationId = @LocationId
                `);

            if (locationCheck.recordset.length > 0) {
                throw new ApiError(400, `Rule already mapped at Location level`, {
                    mappingId: locationCheck.recordset[0].Id
                });
            }
        }

        const result = await pool.request()
            .input("BrandId", BrandId)
            .input("DealerId", DealerId)
            .input("LocationId", LocationId)
            .input("RuleId", RuleId)
            .input("CreatedBy", CreatedBy)
            .query(`
                INSERT INTO z_scope..AAP_RuleMapping (BrandId, DealerId, LocationId, RuleId, CreatedBy)
                OUTPUT INSERTED.Id
                VALUES (@BrandId, @DealerId, @LocationId, @RuleId, @CreatedBy)
            `);

        return {mappingId: result.recordset[0].Id };

    } catch (err) {
        if (err instanceof ApiError && err.data?.mappingId) {
            throw err;
        }
        throw new ApiError(err.statusCode || 500, err.message);
    }
};

export const updateRuleMapping = async (id, BrandId, RuleId, DealerId, LocationId, Status) => {
    if (!id) {
        throw new ApiError(400, "Mapping Id is mandatory for updating");
    }
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

        return {mappingId: id };
    } catch (err) {
        throw new ApiError(500, err.message);
    }
};

export const insertPriorityMapping = async (LocationId, RuleId, Priority, CreatedBy) => {
    if (!LocationId || !RuleId || !Priority || !CreatedBy) {
        throw new ApiError(400, "LocationId, RuleId, Priority, and CreatedBy are mandatory");
    }
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
                  .input("LocationId",LocationId)
                  .input("Priority",Priority)
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
        return {mappingId: result.recordset[0].Id };
    } catch (err) {
        await transaction.rollback();
        throw new ApiError(500, err.message);
    }
};

export const updatePriorityMapping = async (LocationId, RuleId, Priority, Status) => {
    if (!LocationId || !RuleId) {
        throw new ApiError(400, "LocationId and RuleId are mandatory for updating");
    }

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
            .input("RuleId", RuleId);

        let updates = [];
        if (Priority !== undefined) {
            updates.push("Priority = @Priority");
            updateRequest.input("Priority", Priority);
        }
        if (Status !== undefined) {
            updates.push("Status = @Status");
            updateRequest.input("Status", Status);
        }

        if (updates.length === 0) {
            throw new ApiError(400, "No fields provided to update");
        }

        const updateQuery = `
            UPDATE z_scope..AAP_LocationPriority
            SET ${updates.join(", ")}
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
        throw new ApiError(500, err.message);
    }
};


export const fetchRuleMappings = async (BrandId, LocationId, DealerId) => {
    if (!BrandId) {
        throw new ApiError(400, "BrandId is mandatory for fetching rule mappings");
    }
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
    if (!LocationId) {
        throw new ApiError(400, "LocationId is mandatory for fetching priority mappings");
    }
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
        throw new ApiError(500, err.message);
    }
};

