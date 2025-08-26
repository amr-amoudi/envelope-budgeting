import express, {NextFunction} from "express";
import {
    createTransaction,
    deleteAllTransactions,
    deleteTransactionById,
    getAllTransactions,
    getTransactionById,
    updateTransaction
} from "../queries";
const transaction = express.Router();

transaction.param('transaction_id', (req: express.Request, res: express.Response, next:NextFunction, transaction_id: string) => {
    const parsedId = Number(transaction_id);

    if(isNaN(parsedId)){
        const error = new Error('transaction id must be a number');
        (error as any).status = 400;
        return next(error);
    }

    req.idParam.transaction_id = parsedId;
    return next();
})


// get all transactions
transaction.get("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        res.status(200).send(await getAllTransactions(req.idParam.id!))
    }catch (e) {
        next(e)
    }
})

// get transaction by id
transaction.get("/:transaction_id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // "id" is the envelope id
    const { id, transaction_id } = req.idParam

    try {
        res.status(200).send(await getTransactionById(transaction_id!, id!));
    }catch (e) {
        next(e)
    }
})

// delete all transactions
transaction.delete("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        await deleteAllTransactions(req.idParam.id!);
        res.status(204).send({ message: "Transactions deleted" })
    }catch (e) {
        next(e)
    }
})

// delete transaction by id
transaction.delete("/:transaction_id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        res.status(204).send({message: "Transaction deleted", deleted_transactions: await deleteTransactionById(req.idParam.transaction_id!)})
    }catch (e) {
        next(e)
    }
})

// create new transaction
transaction.post("/", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { amount, name } = req.body, { id } = req.idParam;

    try {
        const result = await createTransaction(Number(id), amount, name)
        res.status(201).send(result)
    }catch (e) {
        next(e)
    }
})

// update transaction
transaction.put("/:transaction_id", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        res.status(200).send(await updateTransaction(req.idParam.transaction_id!, req.body))
    }catch (e) {
        next(e)
    }
})

export { transaction }



