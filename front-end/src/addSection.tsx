import CreateEnvelopePopUp from "./pop-ups/CreateEnvelopePopUp.tsx";
import {Envelope} from "../types/envelope.ts";
import {Dispatch, SetStateAction} from "react";

interface AddSectionProps {
    setDisplayCreate: Dispatch<SetStateAction<boolean>>;
    displayCreate: boolean;
    cards: Envelope[];
    setCards: Dispatch<SetStateAction<Envelope[]>>;
}

export default function AddSection({ cards, setCards ,setDisplayCreate, displayCreate}: AddSectionProps)   {
    return (
        <div>
            <button onClick={() => setDisplayCreate(prevState => !prevState)} className={"add--envelope--button"}>Add Envelope!</button>
            <CreateEnvelopePopUp setDisplayCreate={setDisplayCreate} cards={cards} setCards={setCards} displayCreate={displayCreate}/>
        </div>
    )
}