import express from "express";

const api: express.Router = express.Router();
import type { Err } from "../types/types";
import { envelope } from "./end-points/envelope";
import {transfer} from "./end-points/transfer";

api.use("/envelope", envelope);
api.use("/transaction", transfer)

// error handling middleware
api.use((err: Err , _: express.Request, res: express.Response, __: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).send({error:err.message});
})

export {api};