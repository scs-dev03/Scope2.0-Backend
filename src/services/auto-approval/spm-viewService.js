import { getPool1 } from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

const viewPartyService = async (LocationId, Status) => {
  try {
    const pool = await getPool1()
    const query = `use [z_scope] select Id,  PartyName , PartyCode , CreatedAt , Status from AAP_SPMPartyMaster where LocationId = @LocationId and (@Status is NULL OR Status = @Status)  `
    const result = await pool.request()
      .input('LocationId', sql.Int, LocationId)
      .input('Status', sql.Bit, Status ?? null).query(query)
    return result.recordset
  }
  catch (error) {
    throw new ApiError(500, error.message, []);

  }
}

const viewAdvisorService = async (LocationId) => {
  try {
    const pool = await getPool1()
    const query = `use [z_scope] select Id, Advisor , PhoneNo , Email , CreatedAt , Status from AAP_SPMAdvisorMaster where LocationId = @LocationId`
    const result = await pool.request().input('LocationId', sql.Int, LocationId).query(query)
    return result.recordset
  }
  catch (error) {
    throw new ApiError(500, error.message, []);

  }
}

const updatePartyService = async (Id, PartyName, PartyCode, status) => {
  try {
    const pool = await getPool1();

    const idInt = Number(Id);
    if (!Number.isInteger(idInt)) {
      throw new ApiError(400, 'Invalid Id', []);
    }

    const req = pool.request().input('Id', sql.Int, idInt);
    const setParts = [];

    if (PartyName !== null && PartyName !== undefined) {
      req.input('PartyName', sql.VarChar(30), String(PartyName).trim());
      setParts.push('PartyName = @PartyName');
    }

    if (PartyCode !== null && PartyCode !== undefined) {
      req.input('PartyCode', sql.VarChar(30), String(PartyCode).trim());
      setParts.push('PartyCode = @PartyCode');
    }

    if (status !== null && status !== undefined) {
      req.input('Status', sql.Bit, Number(status) ? 1 : 0);
      setParts.push('Status = @Status');
    }

    if (setParts.length === 0) return 0;

    const query = `
      UPDATE [z_scope].dbo.AAP_SPMPartyMaster WITH (ROWLOCK)
      SET ${setParts.join(', ')}
      WHERE Id = @Id;

      SELECT Id, PartyName, PartyCode, Status
      FROM [z_scope].dbo.AAP_SPMPartyMaster
      WHERE Id = @Id;
    `;

    const result = await req.query(query);

    return {
      updatedCount: result.rowsAffected?.[0] ?? 0,
      updatedRow: result.recordsets?.[1]?.[0] || result.recordset?.[0] || null
    };
  } catch (error) {
    throw new ApiError(500, 'Unable to Update Party', [error.message]);
  }
};

const updateAdvisorService = async (
  { Id, Advisor = null, PhoneNo = null, Email = null, Status = null },
  tableName = 'dbo.AAP_SPMAdvisorMaster'
) => {
  try {
    const pool = await getPool1();

    // --- validate Id ---
    const idInt = Number(Id);
    if (!Number.isInteger(idInt) || idInt <= 0) {
      throw new ApiError(400, 'Invalid Id', []);
    }

    // --- normalize helpers ---
    const normAdvisor = v =>
      v == null ? null : String(v).trim();
    const normPhone = v => {
      if (v == null) return null;
      const s = String(v).replace(/\D+/g, '').trim(); // digits only
      return s; // keep empty string if caller passes "", we only skip null/undefined
    };
    const normEmail = v =>
      v == null ? null : String(v).trim().toLowerCase();

    // --- normalize inputs (null/undefined => skip) ---
    const advisorVal = normAdvisor(Advisor);
    const phoneVal = normPhone(PhoneNo);
    const emailVal = normEmail(Email);

    // Status: if provided (including 0), coerce to BIT 0/1
    const statusProvided = Status !== null && Status !== undefined;
    const statusBit = statusProvided ? (Number(Status) ? 1 : 0) : null;

    // --- build dynamic SET list for only provided (non-null/undefined) fields ---
    const req = pool.request().input('Id', sql.Int, idInt);
    const setParts = [];

    if (Advisor !== null && Advisor !== undefined) {
      req.input('Advisor', sql.VarChar(100), advisorVal);
      setParts.push('Advisor = @Advisor');
    }
    if (PhoneNo !== null && PhoneNo !== undefined) {
      req.input('PhoneNo', sql.VarChar(20), phoneVal);
      setParts.push('PhoneNo = @PhoneNo');
    }
    if (Email !== null && Email !== undefined) {
      req.input('Email', sql.VarChar(320), emailVal);
      setParts.push('Email = @Email');
    }
    if (statusProvided) {
      req.input('Status', sql.Bit, statusBit);
      setParts.push('Status = @Status');
    }

    if (setParts.length === 0) {
      // nothing to update
      return { updatedCount: 0, updatedRow: null };
    }

    const query = `
      UPDATE [z_scope].${tableName} WITH (ROWLOCK)
      SET ${setParts.join(', ')}
      WHERE Id = @Id;

      SELECT Id, LocationId, Advisor, PhoneNo, Email, Status, CreatedBy, CreatedAt
      FROM [z_scope].${tableName}
      WHERE Id = @Id;
    `;

    const result = await req.query(query);

    return {
      updatedCount: result.rowsAffected?.[0] ?? 0,
      updatedRow: result.recordsets?.[1]?.[0] || result.recordset?.[0] || null
    };
  } catch (error) {
    throw new ApiError(500, 'Unable to Update Advisor', [error.message]);
  }
};

const existingPartyNameandCodeService = async (Id)=>{
try {
    const pool = await getPool1()
    const query = `select PartyName , PartyCode from z_scope..AAP_SPMPartyMaster where LocationId = (select LocationId from z_scope..AAP_SPMPartyMaster where Id = @Id)`
    const result = await pool.request().input(`Id`,sql.Int,Id).query(query)
    return result.recordset
} catch (error) {
  throw new ApiError(500,`Failed to get Existing PartyName and Code`,[],error.message)
}
}



export { viewPartyService, viewAdvisorService, updatePartyService, updateAdvisorService , existingPartyNameandCodeService }