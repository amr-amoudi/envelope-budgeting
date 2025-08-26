import {Envelope, Transaction, TransactionWithEnvelopeName, Transfer} from "../types/types";
import { Pool } from "pg";
import dotenv from 'dotenv';
import initDB from "./initDB";
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

initDB(pool)
    .then(_ => console.log("database initialized successfully."))

// Sanitize user input by removing unnecessary properties
function parseEnvelope(envelope: Envelope): Envelope {
    check(envelope.budget, `envelope must have all required properties [name, budget, spent]`, 400);
    check(envelope.spent, `envelope must have all required properties [name, budget, spent]`, 400);

    if(isNotNumber(envelope.spent) || isNotNumber(envelope.budget)) {
        const error = new Error(`spent and budget must be numbers`);
        (error as any).status = 400;
        throw error;
    }

    // returns refactored object
    return {
        ...envelope,
        budget: Number(envelope.budget),
        spent: Number(envelope.spent)
    };
}

function isNotNumber<T>(value: T): boolean {
    return isNaN(Number(value));
}

function check<T>(value: T, errorMessage?: string, errorStatusCode?: number, expectedType?: string, customCheck?: () => boolean): T | Error {
    if(Array.isArray(value)) {
        value.forEach((currentValue) => {
            try {
                check(currentValue, errorMessage, errorStatusCode, expectedType, customCheck);
            }catch (e) {
                throw e
            }
        })

        return value
    }

    if(value === undefined){
        console.log(value, "value is undefined");
        const error = new Error(errorMessage || `value doesn't exist`);
        (error as any).status = errorStatusCode || 400;
        throw error;
    }

    if(expectedType === undefined){
        return value
    }

    if(typeof value !== expectedType){
        console.log("value is: " + value, "and the expected type is: " + expectedType, `value doesn't equal expected type ${typeof value} !== ${expectedType}`);

        // check if the
        const error = new Error(errorMessage || `type of "${value}" must be a ${expectedType}`);
        (error as any).status = errorStatusCode || 400;
        throw error;
    }

    // if user passes custom check
    if(customCheck !== undefined){

        // run it
        const result: boolean = customCheck();

        if(!result){
            console.log(value, result, "custom check failed")
            // if it returned false
            const error = new Error(errorMessage || `type of "${value}" must be a ${expectedType}`);
            (error as any).status = errorStatusCode || 400;
            throw error;
        }else {
            return value
        }
    }

    return value;
}

async function getAllEnvelopes(): Promise<Envelope[]> {
    const result = await pool.query<Envelope>("SELECT * FROM envelopes");
    return result.rows.map(parseEnvelope);
}

// find envelope by id
async function getEnvelopeById(id: number): Promise<Envelope> {
    const foundEnvelope = await pool.query<Envelope>(
        "SELECT * FROM envelopes WHERE id = $1", [id]);

    // throw an error if the envelope is not found
    if(foundEnvelope.rows.length === 0) {
        const error = new Error("Envelope not found");
        (error as any).status = 404;
        throw error;
    }

    return parseEnvelope(foundEnvelope.rows[0]);
}

async function createEnvelope(body: Omit<Envelope, 'id' | 'createdAt'>) {
    const {name, budget, spent} = parseEnvelope(body as Envelope);

    if(name === undefined) {
        const error = new Error(`body must have all required properties [name, budget, spent].`);
        (error as any).status = 400;
    }

    if(budget < spent){
        const error = new Error(`spent can't be greater than budget`);
        (error as any).status = 400;
        throw error;
    }

    const returnedValue = await pool.query<Envelope>("INSERT INTO envelopes (name, budget, spent) VALUES ($1, $2, $3) RETURNING *;", [body.name, budget, spent]);

    if(returnedValue.rows.length === 0) {
        throw new Error("Failed to add new envelope");
    }

    return parseEnvelope(returnedValue.rows[0]);
}

async function deleteEnvelope(id: number) {
    check(id, "id must be a positive number", 400, "number", () => id >= 0);
    const result = await pool.query("DELETE FROM envelopes WHERE id = $1 RETURNING *;", [id]);

    // if the envelope was not found
    if(result.rows.length === 0) {
        const error = new Error("Envelope not found");
        (error as any).status = 404;
        throw error;
    }

    return parseEnvelope(result.rows[0]);
}

async function updateEnvelope(id: number, body: Partial<Envelope>): Promise<Envelope> {
    const queries: string[] = [];
    const values: any[] = []

    if (body.name !== undefined) {
        queries.push(`name = $${values.length + 1}`)
        values.push(body.name)
    }

    if (body.budget !== undefined) {
        check(body.budget, "budget must be a positive number", 400, "number", () => body.budget! >= 0)
        queries.push(`budget = $${values.length + 1}`)
        values.push(body.budget)
    }

    if (body.spent !== undefined) {
        check(body.spent, "spent must be a positive number", 400, "number", () => body.spent! >= 0);
        queries.push(`spent = CASE WHEN $${values.length + 1} < budget THEN $${values.length + 1} else spent END`)
        values.push(body.spent)
    }

    if (queries.length === 0) throw new Error("No fields to update");

    const result = await pool.query(`
        UPDATE envelopes
        SET ${queries.join(', ')}
        WHERE id = $${values.length + 1} RETURNING *;
    `, [...values, id])

    if (result.rowCount === 0) {
        const error = new Error("envelope not found");
        (error as any).status = 404;
        throw error;
    }

    if(body.spent !== undefined && result.rows[0].spent != body.spent) {
        const error = new Error(`spent amount cannot exceed budget`);
        (error as any).status = 400;
        throw error;
    }


    return parseEnvelope(result.rows[0]);
}


////////////////
// transfers///
///////////////

async function getAllTransfers(): Promise<Transfer[]> {
    const result = await pool.query(`
        SELECT tr.id as "id",
               tr.amount as "amount",
               tr.date as "date",
               t.id as "to_id",
               f.id as "from_id",
               t.name as "to_name",
               f.name as "from_name"
        FROM transfers tr
                 JOIN envelopes t on t.id = tr."to"
                 JOIN envelopes f on f.id = tr."from"
    `);
    return result.rows;
}

async function getTransferById(id: number): Promise<Transfer> {
    check(id, "id must be defined", 400);
    check(id, "id must be a positive Number", 400, "number", () => id >= 0)

    const result = await pool.query<Transfer>(`
                SELECT tr.id as "id",
                       tr.amount as "amount",
                       tr.date as "date",
                       t.id as "to_id",
                       f.id as "from_id",
                       t.name as "to_name",
                       f.name as "from_name"
                FROM transfers tr
                         JOIN envelopes t on t.id = tr."to"
                         JOIN envelopes f on f.id = tr."from"
                WHERE tr.id = $1;`,
        [id]);

    if(result.rows.length === 0) {
        const error = new Error(`no transfers found`);
        (error as any).status = 404;
        throw error;
    }

    return result.rows[0];
}

async function deleteTransfer(id: number): Promise<Transfer> {
    check(id, "id must be defined", 400);
    check(id, "id must be a positive Number", 400, "number", () => id >= 0)

    const result = await pool.query<Transfer>(`DELETE FROM transfers WHERE id = $1 RETURNING *;`, [id]);

    if(result.rows.length === 0) {
        const error = new Error(`No transfers found`);
        (error as any).status = 400;
        throw error;
    }

    return result.rows[0]
}

async function createNewTransfer(from: number, to: number , amount: number ): Promise<Transfer> {
    check([from, to], "from and to must be defined", 400);
    check([from, to], "'from' and 'to' must be a positive number", 400, "number", () => from >= 0 && to >= 0);

    // if the user doesn't have enough budget it will throw an error from the trigger "make_transfer_func"
    const result = await pool.query(`
                WITH i AS (
                INSERT INTO transfers (amount, "to", "from")
                SELECT $3, $2, $1
                    WHERE EXISTS (
                SELECT 1 FROM envelopes WHERE id = $1
                    )
                    AND EXISTS (
                    SELECT 1 FROM envelopes WHERE id = $2
                    )
                    RETURNING id, amount, date, "to", "from"
                    )
                SELECT
                    i.id,
                    i.amount,
                    i.date,
                    t.id   AS to_id,
                    f.id   AS from_id,
                    t.name AS to_name,
                    f.name AS from_name
                FROM i
                         JOIN envelopes t ON t.id = i."to"
                         JOIN envelopes f ON f.id = i."from";
        `, [from, to, amount])

    return result.rows[0];
}


////////////////////
// Transactions ///
//////////////////

async function getAllTransactions(envelope_id: number): Promise<TransactionWithEnvelopeName[]> {
    // check if envelope exists
    await getEnvelopeById(envelope_id);

    const result = await pool.query<TransactionWithEnvelopeName>(`
        SELECT t.*, e.name as envelope_name FROM transactions t
        JOIN envelopes e ON e.id = t.for_id
        WHERE e.id = $1;
    `, [envelope_id])

    return result.rows;
}

async function getTransactionById(id: number, envelope_id: number): Promise<TransactionWithEnvelopeName> {
    // check if envelope exists
    await getEnvelopeById(envelope_id);

    const result = await pool.query<TransactionWithEnvelopeName>(`
        SELECT t.*, e.name as envelope_name FROM transactions t
        JOIN envelopes e ON e.id = t.for_id WHERE t.id = $1 AND t.for_id = $2;
    `, [id, envelope_id])

    if(result.rows.length === 0) {
        const error = new Error(`transaction not found`);
        (error as any).status = 404;
        throw error;
    }

    return result.rows[0];
}

async function deleteTransactionById(id: number): Promise<Transaction> {
    const result = await pool.query(`DELETE FROM transactions WHERE id = $1 RETURNING *;`, [id]);

    if(result.rows.length === 0) {
        const error = new Error(`transactions not found`);
        (error as any).status = 404;
        throw error;
    }

    return result.rows[0];
}

async function deleteAllTransactions(envelope_id: number): Promise<Transaction[]> {
    // check if envelope exists
    await getEnvelopeById(envelope_id);

    const result = await pool.query(`DELETE FROM transactions WHERE for_id = $1 RETURNING *;`, [envelope_id]);

    if(result.rows.length === 0) {
        const error = new Error(`transaction not found`);
        (error as any).status = 404;
        throw error;
    }

    return result.rows;
}

async function createTransaction(passedFor_id: number, passedAmount: number, name: string): Promise<TransactionWithEnvelopeName> {
    const for_id = Number(passedFor_id), amount = Number(passedAmount);
    check([for_id, amount], "'for_id' and 'amount' must be positive numbers", 400, "number", () => for_id >= 0 && amount >= 0);
    check(name, "name must be defined", 400, "string", () => name.length > 0);
    // check if envelope exists
    await getEnvelopeById(for_id);

    const result = await pool.query<TransactionWithEnvelopeName>(`
        WITH T as (
            INSERT INTO transactions (for_id, amount, name) VALUES ($1, $2, $3) RETURNING *
        )    
        SELECT T.*, e.name as envelope_name FROM T
        JOIN envelopes e on e.id = t.for_id;
    `, [for_id, amount, name])

    return result.rows[0];
}

async function updateTransaction(transaction_id: number, body: { name: string | null, amount: number | null, for_id: number | null}): Promise<TransactionWithEnvelopeName> {
    const queries: string[] = [];
    const values: any[] = []

    if( body.name ) {
        queries.push(`name=$${values.length + 1}`);
        values.push(body.name);
    }

    if( body.for_id ) {
        check(body.for_id, 'for_id must be a positive number', 400, "number", () => body.for_id! >= 0);
        queries.push(`for_id=$${values.length + 1}`);
        values.push(body.for_id);
    }

    if( body.amount ) {
        check(body.amount, 'amount must be a positive number', 400, "number", () => body.amount! >= 0);
        queries.push(`amount=$${values.length + 1}`);
        values.push(body.amount);
    }

    const result = await pool.query(`
        UPDATE transactions
        SET ${queries.join(', ')}
        WHERE id = $${values.length + 1} RETURNING *;
    `, [...values, transaction_id])

    return result.rows[0];
}

export {
    createEnvelope,
    deleteEnvelope,
    updateEnvelope,
    getEnvelopeById,
    getAllEnvelopes,
    getAllTransfers,
    getTransferById,
    deleteTransfer,
    createNewTransfer,
    getAllTransactions,
    getTransactionById,
    deleteTransactionById,
    deleteAllTransactions,
    createTransaction,
    updateTransaction
}