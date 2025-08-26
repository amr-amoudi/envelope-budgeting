import express from "express";
import {
    createEnvelope,
    deleteEnvelope,
    getAllEnvelopes,
    getEnvelopeById,
    updateEnvelope
} from "../queries";

import type { Envelope } from "../../types/types";
import { transaction } from "./transaction";
const envelope = express.Router();

envelope.param("id", (req: express.Request, _: express.Response, next: express.NextFunction, id : number) => {
    const convertIdToNumber = Number(id);

    if(isNaN(convertIdToNumber)){
        const error = new Error(`'${id}' is not a number, must be a number`);
        (error as any).status = 400;
        return next(error)
    }

    req.idParam = { id:convertIdToNumber };

    next()
})

// get all envelopes
envelope.get("/", async (_: express.Request, res: express.Response, next: express.NextFunction) => {
    try{
        const envelopes: Envelope[] = await getAllEnvelopes()
        res.send(envelopes);
    }catch (e){
        return next(e);
    }
})

// get envelope by specific id
envelope.get("/:id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { id } = req.idParam;
    try {
        const foundEnvelope = await getEnvelopeById(id!);
        res.status(200).send(foundEnvelope);
    }catch (e) {
        return next(e)
    }
})

// update envelopes
envelope.put("/:id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { id } = req.idParam;

    try {
        const newEnvelope: Envelope = await updateEnvelope(id!, req.body);
        res.status(201).send(newEnvelope);
    }catch (e){
        return next(e);
    }
})

// delete envelope
envelope.delete("/:id", async (req: express.Request, res: express.Response) => {
    const {id} = req.idParam;

    try {
        await deleteEnvelope(id!)
        res.status(204).send({message: "Envelope deleted successfully."});
    }catch (e) {
        return res.status((e as any).status).send({error: (e as Error).message});
    }
})

// create new envelope
envelope.post("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const result: Envelope = await createEnvelope(req.body);
        res.status(201).send(result);
    }catch (e) {
        return next(e);
    }
})

// transactions route
envelope.use("/:id/transaction", transaction)

export { envelope };