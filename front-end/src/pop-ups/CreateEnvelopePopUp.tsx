import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {Envelope} from "../../types/envelope.ts";
import fetchData from "../util/fetchData.ts";

interface CreateEnvelopePopUpProps {
    displayCreate: boolean,
    setDisplayCreate: Dispatch<SetStateAction<boolean>>,
    cards: Envelope[],
    setCards: React.Dispatch<React.SetStateAction<Envelope[]>>,
}

export default function CreateEnvelopePopUp({cards, setCards, displayCreate, setDisplayCreate}: CreateEnvelopePopUpProps ) {

    const [inputs, setInputs] = useState<Omit<Envelope, "id">>({
        name: "",
        budget: 0,
        spent: 0,
    });

    const [disabled, setDisabled] = useState<boolean>(true);

    useEffect(() => {
        setDisabled(checkInputs)
    }, [inputs]);

    async function handleCreate() {
        await fetchData(import.meta.env.API_URL || "http://localhost:3000/api/envelope/", {
            method: "POST",
            body: JSON.stringify(inputs)
        }).then((res: any) => {
            updateCardsState(res.new_envelope.id);
        })

        setInputs({
            name: "",
            budget: 0,
            spent: 0,
        })

        setDisplayCreate(false)
    }

    function updateCardsState(id: number) {
        const newEnvelope = { ...inputs, id };

        if(!Array.isArray(cards)) {
            return setCards([newEnvelope])
        }

        return setCards(prevState => [newEnvelope, ...prevState!]);
    }


    function handleEdit(e: React.ChangeEvent<HTMLInputElement>) {
        const {value, name} = e.target;
        setInputs(prevInfo => ({...prevInfo, [name]: value}));
    }

    function closeTab() {
        setDisplayCreate(false);
    }

    function checkInputs(): boolean {
        if(!inputs.budget || !inputs.spent || !inputs.name) {
            return true;
        }

        if(isNaN(Number(inputs.budget)) || isNaN(Number(inputs.spent))){
            return true;
        }

        if(Number(inputs.spent) > Number(inputs.budget)) {
            return true;
        }

        return false;
    }



    return(
        <div style={{display: displayCreate ? "flex" : "none"}} className={"create--envelope"}>
            <button onClick={closeTab} className={"close--tab--button"}>X</button>
            <label htmlFor="name">name:</label>
            <input value={inputs.name} name={"name"} onChange={handleEdit} type="text" id={"name"} />
            <label htmlFor="budget">budget:</label>
            <input value={inputs.budget} name={"budget"} onChange={handleEdit} type="text" id={"budget"} />
            <label htmlFor="spent">spent:</label>
            <input value={inputs.spent} name={"spent"} onChange={handleEdit} type="test" id={"spent"} />
            <button onClick={handleCreate} disabled={disabled}>Create!</button>
        </div>
    )
}