import express, {NextFunction} from "express";
import {Envelope} from "../types/envelope";
const bodyParser = require("body-parser");
const app: express.Express = express();
const PORT: number = 3000;


/**
 * to do:
 *  1: adding comments
 *  2: adding modularity
 *  3: front-end
 * **/


// adding req."idParam" to Express's Request type
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

let allEnvelopes: Envelope[] = [

]

function addToNewEnvelope(body: Envelope ) {
    allEnvelopes.push(body);
}

function findEnvelop(id: number): { envelope: Envelope, index: number } | undefined {
    const foundEnvelope: number = allEnvelopes.findIndex(envelope => envelope.id === id);

    console.log(foundEnvelope);

    if(foundEnvelope === -1) {
        return undefined;
    }

    return {index: foundEnvelope, envelope: allEnvelopes[foundEnvelope]}
}


app.param("id", (req: express.Request, res: express.Response, next: express.NextFunction, id : number) => {
    const convertIdToNumber = Number(id);

    if(isNaN(convertIdToNumber)){
        const error = new Error(`'${id}' is not a number, must be a number`);
        (error as any).status = 400;
        return next(error)
    }

    const result = findEnvelop(convertIdToNumber)

    if(!result){
        const error = new Error(`${id} not found`);
        (error as any).status = 404;
        return next(error)
    }

    req.idParam = {id:convertIdToNumber, envelopeObj:result.envelope, index: result.index};

    next()
})

function refactorUpdateEnvelopeBody(body: Envelope): {budget: number, name: string, spent: number} {
    let newBody = {

    };

    for (const key in body) {
        if(key === "budget" || key === "name" || key === "spent"){
            newBody = {
                ...newBody,
                [key]: body[key]
            }
        }
    }

    return newBody as { budget: number; name: string; spent: number };
}

app.get("/api/envelope/:id", (req: express.Request, res: express.Response) => {
    const {envelopeObj} = req.idParam;

    res.status(200).send(envelopeObj);

})

app.put("/api/envelope/:id", (req: express.Request, res: express.Response, next: NextFunction) => {
    const {id ,envelopeObj, index} = req.idParam;
    const body = refactorUpdateEnvelopeBody(req.body);

    if(body.spent > body.budget || body.spent > envelopeObj.budget){
        const error = new Error(`you over spent`);
        (error as any).status = 400;
        return next(error)
    }

    allEnvelopes[index] = {...envelopeObj, ...body ,id: id};

    res.status(201).send(allEnvelopes[index]);
})

function deleteEnvelope(envelopeId: number) {

    const newAllEnvelops: Envelope[] = allEnvelopes.filter((envelope: Envelope) => envelope.id !== envelopeId);

    allEnvelopes = newAllEnvelops
}

app.delete("/api/envelope/:id", (req: express.Request, res: express.Response) => {
    const {id} = req.idParam;
    deleteEnvelope(id)

    res.status(204).send({message: "Envelope deleted successfully."});
})

function getTransformIndex(from: string | number, to: string | number): {fromIndex : number | undefined, toIndex: number | undefined} {
    let searchType: keyof Envelope= "name"

    if(!isNaN(Number(to))){
        searchType = "id"
        from = Number(from);
        to = Number(to);
    }


    let transformInfo: {from: number , to: number} = {
        from: 0,
        to: 0
    }

    const firstEnvelopFound: number = allEnvelopes.findIndex((envelope: Envelope) => {
        return envelope[searchType] === from || envelope[searchType] === to;
    })


    if(firstEnvelopFound === -1){
        return {fromIndex: undefined, toIndex: undefined};
    }

    if(allEnvelopes[firstEnvelopFound][searchType] === from){
        const secondEnvelopFound = allEnvelopes
                                            .slice(firstEnvelopFound)
                                            .findIndex(envelope => envelope[searchType] === to);

        transformInfo = {from: firstEnvelopFound, to: secondEnvelopFound !== -1 ? secondEnvelopFound + firstEnvelopFound : -1};

    }else{
        const secondEnvelopFound = allEnvelopes
                                            .slice(firstEnvelopFound)
                                            .findIndex(envelope => envelope[searchType] === from);

        transformInfo = {from: secondEnvelopFound !== -1 ? secondEnvelopFound + firstEnvelopFound : -1 , to: firstEnvelopFound};
    }

    if(transformInfo.from === -1 || transformInfo.to === -1){
        return {fromIndex: undefined, toIndex: undefined};
    }

    return {fromIndex : transformInfo.from, toIndex: transformInfo.to}
}

function compliteTransaction(fromIndex: number, toIndex: number, value: number,next: express.NextFunction) {
    if(allEnvelopes[fromIndex].budget - allEnvelopes[fromIndex].spent - value < 0){
        const error = new Error(`Invalid transaction: You can’t transform more than what you don’t have.`);
        (error as any).status = 400;
        return next(error)
    }


    allEnvelopes[fromIndex].budget = allEnvelopes[fromIndex].budget - value;
    allEnvelopes[toIndex].budget = allEnvelopes[toIndex].budget + value;
    next()
}

app.post("/api/envelope/:from/:to", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {from, to} = req.params;
    if ((!isNaN(Number(to)) !== !isNaN(Number(from)))) {
        const error = new Error(`'from' and 'to' should be the same value type`);
        (error as any).status = 400;
        return next(error);
    }

    const {fromIndex, toIndex} = getTransformIndex(from, to);
    const {value} = req.headers;

    if(isNaN(Number(value))){
        const error = new Error(`value must be a number`);
        (error as any).status = 400;
        return next(error)
    }

    if(fromIndex === undefined || toIndex === undefined){
        const error = new Error(`can't find envelope ${fromIndex === undefined ? from : to}`);
        (error as any).status = 400;
        return next(error)
    }

    if(value === undefined || value === null){
        const error = new Error("enter value to transform");
        (error as any).status = 400;
        return next(error)
    }

    compliteTransaction(fromIndex, toIndex, Number(value), next)

    res.status(200).send({from: allEnvelopes[fromIndex], to: allEnvelopes[toIndex]});
})

app.post("/api/envelope", (req: express.Request, res: express.Response) => {
    const reqBody: Envelope = req.body;

    addToNewEnvelope(reqBody);

    res.status(201).send({ new_envelop:reqBody, message:"successfully added" });
})

app.get("/api/envelope", (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.send(allEnvelopes);
})

app.use((err: any , req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).send({error:err.message});
})


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));


