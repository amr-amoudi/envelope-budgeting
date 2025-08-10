import {Envelope} from "../types/types";
import {NextFunction} from "express";
import { Pool } from "pg";
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

// Create table if not exists
pool.query(`CREATE TABLE IF NOT EXISTS envelopes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    budget NUMERIC NOT NULL,
    spent NUMERIC NOT NULL DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

// Create or replace trigger function
pool.query(`
CREATE OR REPLACE FUNCTION before_update_spent_func()
RETURNS trigger AS $$
BEGIN
    IF NEW.spent >= 0 AND NEW.spent <= NEW.budget THEN
        RETURN NEW;
    ELSE
        NEW.spent := OLD.spent;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
`);

// Create trigger (no IF NOT EXISTS in PostgreSQL)
pool.query(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'before_update_spent'
    ) THEN
        CREATE TRIGGER before_update_spent
        BEFORE UPDATE ON envelopes
        FOR EACH ROW
        EXECUTE FUNCTION before_update_spent_func();
    END IF;
END;
$$;
`);

console.log("Successfully created table, function, and trigger for envelopes");
// Sanitize user input by removing unnecessary properties
function parseEnvelope(envelope: Envelope): Envelope {
    // returns refactored object
    return {
        ...envelope,
        budget: Number(envelope.budget),
        spent: Number(envelope.spent)
    };
}

function isNotNumber(value: any): boolean {
    return isNaN(Number(value)) || typeof value !== 'number';
}

function parseNumber(value: any): number {
    if (isNotNumber(value)) {
        const error = new Error(`Value must be a number`);
        (error as any).status = 400;
        throw error;
    }
    return Number(value);
}

async function getAllEnvelopes(): Promise<Envelope[]> {
    const result = await pool.query<Envelope>("SELECT * FROM envelopes");
    return result.rows.map(parseEnvelope);
}

async function createEnvelope(body: Omit<Envelope, 'id'>) {
    const {name, budget, spent} = body;

    if(name === undefined || budget === undefined || spent === undefined) {
        const error = new Error(`body should have all required properties [name, budget, spent].`);
        (error as any).status = 400;
    }

    if(isNotNumber(budget) || isNotNumber(spent)) {
        const error = new Error(`'budget' and 'spend' must be numbers`);
        (error as any).status = 400;
    }

    if(isNotNumber(body.spent) || isNotNumber(body.budget)) {
        const error = new Error(`spent and budget must be numbers`);
        (error as any).status = 400;
        throw error;
    }

    if(budget < spent){
        const error = new Error(`spent can't be greater than budget`);
        (error as any).status = 400;
        throw error;
    }

    const returnedValue = await pool.query<Envelope>("INSERT INTO envelopes (name, budget, spent) VALUES ($1, $2, $3) RETURNING *;", [body.name, Number(body.budget), Number(body.spent)]);

    if(returnedValue.rows.length === 0) {
        console.log(returnedValue)
        throw new Error("Failed to add new envelope");
    }

    return parseEnvelope(returnedValue.rows[0]);
}

// complete transaction
function completeTransaction(fromIndex: number, toIndex: number, value: number, envelopesArray: Envelope[] , next: NextFunction) {
    // if the user doesn't have enough money on the "from" object
    if(envelopesArray[fromIndex].budget - envelopesArray[fromIndex].spent - value < 0){
        const error = new Error(`Invalid transaction: You can’t transform more than what you don’t have.`);
        (error as any).status = 400;
        return next(error)
    }

    // complete transaction
    envelopesArray[fromIndex].budget = envelopesArray[fromIndex].budget - value;
    envelopesArray[toIndex].budget = envelopesArray[toIndex].budget + value;
    next()
}

// Get indexes for transaction between envelopes
function getTransferEnvelopesIndexes(from: string | number, to: string | number, envelopesArray: Envelope[]): {fromIndex : number | undefined, toIndex: number | undefined} {
    let searchType: keyof Envelope = isNaN(Number(to)) ? "name" : "id";

    if(searchType === "id"){
        from = Number(from);
        to = Number(to);
    }

    let transformInfo: {fromIndex: number | undefined, toIndex: number | undefined} = {
        fromIndex: undefined,
        toIndex: undefined
    }

    for(let i = 0; i < envelopesArray.length; i++) {
        if(envelopesArray[i][searchType] === from){
            transformInfo.fromIndex = i
        }

        if(envelopesArray[i][searchType] === to){
            transformInfo.toIndex = i
        }
    }

    // warning: one of the indexes could be "undefined" if it was not found
    return transformInfo;
}

async function deleteEnvelope(id: number) {
    const result = await pool.query("DELETE FROM envelopes WHERE id = $1 RETURNING *;", [id]);

    // if the envelope was not found
    if(result.rows.length === 0) {
        const error = new Error("Envelope not found");
        (error as any).status = 404;
        throw error;
    }

    console.log(result)
    return parseEnvelope(result.rows[0]);
}

async function updateEnvelope(id: number, body: Partial<Envelope>): Promise<Envelope> {
    const setClauses: string[] = [];

    if (body.name !== undefined) {
        setClauses.push(`name = '${body.name}'`)
    }

    if (body.budget !== undefined) {
        if(isNotNumber(body.budget) || Number(body.budget) < 0) {
            const error = new Error(`budget must be a positive number`);
            (error as any).status = 400;
            throw error;
        }
        setClauses.push(`budget = ${body.budget}`)
    }

    if (body.spent !== undefined) {
        if(isNaN(Number(body.spent)) || Number(body.spent) < 0) {
            const error = new Error(`spent must be a positive number`);
            (error as any).status = 400;
            throw error;
        }

        setClauses.push(`spent = CASE WHEN spent + ${body.spent} < budget THEN ${body.spent} else spent END`)
    }

    if (setClauses.length === 0) throw new Error("No fields to update");

    const query = `UPDATE envelopes SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *;`;
    const result = await pool.query<Envelope>(query, [id]);

    if(body.spent !== undefined && result.rows[0].spent != body.spent) {
        const error = new Error(`Spent amount cannot exceed budget`);
        (error as any).status = 400;
        throw error;
    }

    if (result.rows.length === 0) throw new Error("Failed to update envelope");

    return parseEnvelope(result.rows[0]);
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


export {
    createEnvelope,
    completeTransaction,
    getTransferEnvelopesIndexes,
    deleteEnvelope,
    updateEnvelope,
    getEnvelopeById,
    getAllEnvelopes
}

