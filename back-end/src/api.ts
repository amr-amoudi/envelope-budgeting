import express from "express";
import {Envelope} from "../types/envelope";
import {
        refactorBody,
        addToNewEnvelope,
        compliteTransaction,
        getTransferEnvelopesIndexes,
        deleteEnvelope,
        updateEnvelope,
        findEnvelope
} from "./util";
import { customAlphabet } from "nanoid";
const api: express.Router = express.Router();


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

    // gets the envelope using findEnvelope
    const result: {envelope: Envelope, index: number} | undefined = findEnvelope(convertIdToNumber, allEnvelopes)

    // if findEnvelope returns undefined it will throw an error
    if(!result){
        const error = new Error(`${id} not found`);
        (error as any).status = 404;
        return next(error)
    }

    req.idParam = {id:convertIdToNumber, envelopeObj:result.envelope, index: result.index};

    next()
})

// get envelope by specific id
api.get("/envelope/:id", (req: express.Request, res: express.Response) => {
    const {envelopeObj} = req.idParam;

    res.status(200).send(envelopeObj);
})

// update envelopes
api.put("/envelope/:id", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {envelopeObj, index} = req.idParam;

    const body: Envelope = updateEnvelope(req.body, envelopeObj);

    if ((isNaN(Number(req.body.spent)) || isNaN(Number(req.body.budget)))) {
        const error = new Error(`spent and budget should be numbers`);
        (error as any).status = 400;
        return next(error);
    }

    // check if user over spend their envelope
    if(body.spent > body.budget || body.spent > envelopeObj.budget){
        const error = new Error(`you over spent`);
        (error as any).status = 400;
        return next(error)
    }

    allEnvelopes[index] = body;

    res.status(201).send(allEnvelopes[index]);
})

// delete envelope
api.delete("/envelope/:id", (req: express.Request, res: express.Response) => {
    const {id} = req.idParam;

    allEnvelopes = deleteEnvelope(id, allEnvelopes)

    res.status(204).send({message: "Envelope deleted successfully."});
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

    compliteTransaction(fromIndex, toIndex, Number(value), allEnvelopes, next)

    res.status(200).send({from: allEnvelopes[fromIndex], to: allEnvelopes[toIndex]});
})

// create new envelope
api.post("/envelope", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = customAlphabet("0123456789", 10)
    const reqBody: Envelope = {...req.body, id: id()};

    if(reqBody.name === undefined || reqBody.budget === undefined || reqBody.spent === undefined) {
        const error = new Error(`body should have all required properties [id, name, budget, spent].`);
        (error as any).status = 400;
        return next(error)
    }

    const refactoredBody: Envelope = refactorBody(reqBody)

    if(isNaN(refactoredBody.id) || isNaN(refactoredBody.spent) || isNaN(reqBody.budget)) {
        const error = new Error(`'id', 'budget' and 'spend' should be numbers`);
        (error as any).status = 400;
        return next(error)
    }

    addToNewEnvelope(refactoredBody, allEnvelopes);

    res.status(201).send({ new_envelope : refactoredBody, message : "successfully added" });
})

// get all envelopes
api.get("/envelope", (_: express.Request, res: express.Response, next: express.NextFunction) => {
    if(allEnvelopes.length === 0){
        const error = new Error("there are no envelopes");
        (error as any).status = 400;
        return next(error)
    }

    res.send(allEnvelopes);
})

// error handling middleware
api.use((err: any , _: express.Request, res: express.Response, __: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).send({error:err.message});
})



export {api};