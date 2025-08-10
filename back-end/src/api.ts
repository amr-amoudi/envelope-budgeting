import express from "express";
import {
    createEnvelope,
    completeTransaction,
    getTransferEnvelopesIndexes,
    deleteEnvelope,
    updateEnvelope,
    getEnvelopeById, getAllEnvelopes
} from "./util";
const api: express.Router = express.Router();
import type { Envelope, Err } from "../types/types";

// this will hold all envelops
let allEnvelopes: Envelope[] = [

]

api.param("id", (req: express.Request, _: express.Response, next: express.NextFunction, id : number) => {
    const convertIdToNumber = Number(id);

    if(isNaN(convertIdToNumber)){
        const error = new Error(`'${id}' is not a number, must be a number`);
        (error as any).status = 400;
        return next(error)
    }

    req.idParam = { id:convertIdToNumber };

    next()
})

// get envelope by specific id
api.get("/envelope/:id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { id } = req.idParam;
    try {
        const foundEnvelope = await getEnvelopeById(id);
        res.status(200).send(foundEnvelope);
    }catch (e) {
        return next(e)
    }
})

// update envelopes
api.put("/envelope/:id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { id } = req.idParam;

    try {
        const newEnvelope: Envelope = await updateEnvelope(id, req.body);
        res.status(201).send(newEnvelope);
    }catch (e){
        return next(e);
    }
})

// delete envelope
api.delete("/envelope/:id", async (req: express.Request, res: express.Response) => {
    const {id} = req.idParam;

    try {
        await deleteEnvelope(id)
        res.status(204).send({message: "Envelope deleted successfully."});
    }catch (e) {
        return res.status((e as any).status).send({error: (e as Error).message});
    }
})

// Transfer money between envelopes
api.post("/envelope/:from/:to", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {from, to} = req.params;
    // check if "to" and "from" don't have the same data type
    if ((!isNaN(Number(to)) !== !isNaN(Number(from)))) {
        const error = new Error(`'from' and 'to' should be the same value type`);
        (error as any).status = 400;
        return next(error);
    }

    // get "to" and "from" indexes
    const {fromIndex, toIndex} = getTransferEnvelopesIndexes(from, to, allEnvelopes);
    // get the amount of money that is ganna be transferred
    const {value} = req.headers;

    if(!Number(value)){
        const error = new Error(`value must be a number`);
        (error as any).status = 400;
        return next(error)
    }
    // if the user didn't pass a value
    if(value === undefined || value === null){
        const error = new Error("enter value to transform");
        (error as any).status = 400;
        return next(error)
    }

    // could be undefined if "getTransferEnvelopesIndexes" didn't find the envelope
    if(fromIndex === undefined || toIndex === undefined){
        const error = new Error(`can't find envelope ${fromIndex === undefined ? from : to}`);
        (error as any).status = 400;
        return next(error)
    }

    completeTransaction(fromIndex, toIndex, Number(value), allEnvelopes, next)

    res.status(200).send({from: allEnvelopes[fromIndex], to: allEnvelopes[toIndex]});
})

// create new envelope
api.post("/envelope", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const result: Envelope = await createEnvelope(req.body);
        res.status(201).send({ new_envelope : result, message : "successfully added" });
    }catch (error) {
        const err = new Error((error as Error).message);
        (err as any).status = 500;
        return next(err);
    }
})

// get all envelopes
api.get("/envelope", async (_: express.Request, res: express.Response, next: express.NextFunction) => {
    try{
        const envelopes = await getAllEnvelopes()
        res.send(envelopes);
    }catch (e){
        const error = new Error((e as Error).message);
        (error as any).status = 500;
        return next(error);
    }
})

// error handling middleware
api.use((err: Err , _: express.Request, res: express.Response, __: express.NextFunction) => {
    const status = err.status || 500;
    console.log(err,status)
    res.status(status).send({error:err.message});
})

export {api};