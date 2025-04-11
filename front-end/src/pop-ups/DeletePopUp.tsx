import fetchData from "../util/fetchData.ts";
import { SetEnvelopes } from "../App.tsx"
import {useContext} from "react";
import {Envelope} from "../../types/envelope.ts";

export default function DeletePopUp({id} : Envelope) {

    const setEnvelopes  = useContext(SetEnvelopes)

    async function handleYesClick() {
        await fetchData(import.meta.env.VITE_API_URL + id || `http://localhost:3000/api/envelope/${id}`, {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            }
        });

        setEnvelopes (prev => Array.isArray(prev)
                ? prev.filter(env => env.id !== id)
                : prev
        );
    }


    return (
        <div className={"delete-envelope--container"}>
            <h1>are you sure</h1>
            <div className={"delete--buttons"}>
                <button onClick={handleYesClick}>yes</button>
                <button>no</button>
            </div>
        </div>
    )
}