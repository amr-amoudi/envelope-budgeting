import express from "express";
import {Envelope} from "../types/envelope";
import {api} from "./api";
const cors = require("cors");
import bodyParser from "body-parser";

const app: express.Express = express();
const PORT: string | number = process.env.PORT || 3000;

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

app.use(cors());

app.use(bodyParser.json());

app.use("/api", api);

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));