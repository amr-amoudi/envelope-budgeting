import express, {NextFunction} from "express";
import {Envelope} from "../types/envelope";

const bodyParser = require("body-parser");
const app: express.Express = express();
const PORT: number = 3000;


/**
 * to do:
 *  2: adding modularity
 *  3: front-end
 * **/


// Extend Express Request type to include `idParam`
declare global {
    namespace Express {
        interface Request {
            idParam: {
                id: number;
                envelopeObj: Envelope;
                index: number;
            }
        }
    }
}

app.use(bodyParser.json());

// this will hold all envelops
let allEnvelopes: Envelope[] = [

]

// find envelope by id (number)
function findEnvelope(id: number): { envelope: Envelope, index: number } | undefined {
    const foundEnvelope: number = allEnvelopes.findIndex(envelope => envelope.id === id);

    // if envelope was not found it will return undefined
    if(foundEnvelope === -1) {
        return undefined;
    }

    // else will return index which is the index of the envelope
    // and envelope which is the envelope object
    return {index: foundEnvelope, envelope: allEnvelopes[foundEnvelope]}
}


app.param("id", (req: express.Request, res: express.Response, next: express.NextFunction, id : number) => {
    const convertIdToNumber = Number(id);

    if(isNaN(convertIdToNumber)){
        const error = new Error(`'${id}' is not a number, must be a number`);
        (error as any).status = 400;
        return next(error)
    }

    // gets the envelope using findEnvelope
    const result: {envelope: Envelope, index: number} | undefined = findEnvelope(convertIdToNumber)

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
app.get("/api/envelope/:id", (req: express.Request, res: express.Response) => {
    const {envelopeObj} = req.idParam;

    res.status(200).send(envelopeObj);
})

function updateEnvelope(body: Partial<Envelope>, envelope: Envelope): Envelope {
    return {
        id: envelope.id,
        name: body.name || envelope.name,
        budget: body.budget || envelope.budget,
        spent: body.spent || envelope.spent
    };
}

// update envelopes
app.put("/api/envelope/:id", (req: express.Request, res: express.Response, next: NextFunction) => {
    const {envelopeObj, index} = req.idParam;

    const body: Envelope = updateEnvelope(req.body, envelopeObj);

    // check if user over spend their envelope
    if(body.spent > body.budget || body.spent > envelopeObj.budget){
        const error = new Error(`you over spent`);
        (error as any).status = 400;
        return next(error)
    }

    allEnvelopes[index] = {...body};

    res.status(201).send(allEnvelopes[index]);
})

function deleteEnvelope(envelopeId: number) {
    allEnvelopes = allEnvelopes.filter((envelope: Envelope) => envelope.id !== envelopeId)
}

// delete envelope
app.delete("/api/envelope/:id", (req: express.Request, res: express.Response) => {
    const {id} = req.idParam;

    deleteEnvelope(id)

    res.status(204).send({message: "Envelope deleted successfully."});
})

// Get indexes for transaction between envelopes
function getTransferEnvelopesIndexes(from: string | number, to: string | number): {fromIndex : number | undefined, toIndex: number | undefined} {
    let searchType: keyof Envelope = isNaN(Number(to)) ? "name" : "id";

    if(searchType === "id"){
        from = Number(from);
        to = Number(to);
    }

    let transformInfo: {fromIndex: number | undefined, toIndex: number | undefined} = {
        fromIndex: undefined,
        toIndex: undefined
    }

    for(let i = 0; i < allEnvelopes.length; i++) {
        if(allEnvelopes[i][searchType] === from){
            transformInfo.fromIndex = i
        }

        if(allEnvelopes[i][searchType] === to){
            transformInfo.toIndex = i
        }
    }

    // warning: one of the indexes could be "undefined" if it was not found
    return transformInfo;
}

// complite transaction
function compliteTransaction(fromIndex: number, toIndex: number, value: number,next: express.NextFunction) {
    // if the user doesn't have enough money on the "from" object
    if(allEnvelopes[fromIndex].budget - allEnvelopes[fromIndex].spent - value < 0){
        const error = new Error(`Invalid transaction: You can’t transform more than what you don’t have.`);
        (error as any).status = 400;
        return next(error)
    }

    // complete transaction
    allEnvelopes[fromIndex].budget = allEnvelopes[fromIndex].budget - value;
    allEnvelopes[toIndex].budget = allEnvelopes[toIndex].budget + value;
    next()
}

// Transfer money between envelopes
app.post("/api/envelope/:from/:to", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {from, to} = req.params;
    // check if "to" and "from" don't have the same data type
    if ((!isNaN(Number(to)) !== !isNaN(Number(from)))) {
        const error = new Error(`'from' and 'to' should be the same value type`);
        (error as any).status = 400;
        return next(error);
    }

    // get "to" and "from" indexes
    const {fromIndex, toIndex} = getTransferEnvelopesIndexes(from, to);
    // get the amount of money that is ganna be transferred
    const {value} = req.headers;

    if(!Number(value)){
        const error = new Error(`value must be a number`);
        (error as any).status = 400;
        return next(error)
    }
    // if the user didn't pass a value throw an error
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

    compliteTransaction(fromIndex, toIndex, Number(value), next)

    res.status(200).send({from: allEnvelopes[fromIndex], to: allEnvelopes[toIndex]});
})

function addToNewEnvelope(body: Envelope ) {
    allEnvelopes.push(body);
}

// Sanitize user input by removing unnecessary properties
function refactorBody(body: Envelope) {
    let returnedBody: Envelope = {
        id: Number(body.id),
        name: body.name,
        budget: Number(body.budget),
        spent: Number(body.spent),
    };

    // returns refactored object
    return returnedBody;
}

// create new envelope
app.post("/api/envelope", (req: express.Request, res: express.Response, next: NextFunction) => {
    const reqBody: Envelope = req.body;

    if(reqBody.id === undefined || reqBody.name === undefined || reqBody.budget === undefined || reqBody.spent === undefined) {
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

    addToNewEnvelope(refactoredBody);

    res.status(201).send({ new_envelop:refactoredBody, message:"successfully added" });
})

// get all envelopes
app.get("/api/envelope", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send(allEnvelopes);
})

// error handling middleware
app.use((err: any , req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).send({error:err.message});
})


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));