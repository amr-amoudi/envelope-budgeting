import express from "express";
import {Envelope} from "../types/envelope";
import {api} from "./api";
import bodyParser from "body-parser";

const app: express.Express = express();
const PORT: number = 3000;


/**
 * to do:
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

app.use("/api", api);

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));