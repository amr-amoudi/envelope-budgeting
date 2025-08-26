import express from "express";
import {createNewTransfer, deleteTransfer, getAllTransfers, getTransferById} from "../queries";
const transfer: express.Router = express.Router();

transfer.param("id", (req: express.Request, _: express.Response, next: express.NextFunction, id: string) => {
    const convertIdToNumber = Number(id);

    if (isNaN(convertIdToNumber)) {
        const error = new Error(`'${id}' is not a number, must be a number`);
        (error as any).status = 400;
        return next(error);
    }

    req.idParam = { id: convertIdToNumber };
    next();
})

transfer.get('/', async (_: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        res.status(200).send(await getAllTransfers())
    }catch (e){
        next(e)
    }
})

transfer.get('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { id } = req.idParam;

    try {
        const result = await getTransferById(id!)
        res.status(200).send(result)
    }catch (e) {
        next(e)
    }
})

transfer.put('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {

})

// Transfer money between envelopes
transfer.post("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { from, to, amount } = req.body;

    const parsedFrom = Number(from);
    const parsedTo = Number(to);
    const parsedAmount = Number(amount);

    try {
        const result = await createNewTransfer(parsedFrom, parsedTo, parsedAmount)
        res.status(201).send(result);
    }catch (e) {
        next(e)
    }
})

transfer.delete("/:id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const result = await deleteTransfer(req.idParam.id!)
        res.status(204).send({message:"transfer deleted", transfer: result})
    }catch (e) {
        next(e)
    }
})

export { transfer };

