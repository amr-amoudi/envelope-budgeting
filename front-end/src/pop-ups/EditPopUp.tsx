import {Envelope} from "../../types/envelope.ts";
import {useContext, useEffect, useState, createElement, useRef} from "react";
import {SetEnvelopes} from "../App.tsx";
import fetchData from "../util/fetchData.ts";
import {PopUpContext} from "../card/Card.tsx";

type EditPopUpType = Envelope & {popUp: PopUpContext};

export default function EditPopUp({id, name, budget, spent, popUp}: EditPopUpType) {

    const setEnvelopes  = useContext(SetEnvelopes)
    const [disableButton, setDisableButton] = useState<boolean>(false)
    const saveButton = useRef<HTMLButtonElement | null>(null)

    const [info, setInfo] = useState<Omit<Envelope, "id">>({
        name: name,
        budget: budget,
        spent: spent,
    });

    async function handleSave() {
        await fetchData(import.meta.env.VITE_API_URL + id || `http://localhost:3000/api/envelope/${id}`, {
            method: "PUT",
            body: JSON.stringify(info)
        })


        setEnvelopes(prev =>
            Array.isArray(prev)
                ? prev.map((envelope: Envelope) => {
                    if (envelope.id === id) {
                        return {
                            ...envelope,
                            ...info,
                        };
                    }
                    return envelope;
                })
                : prev
        );

        popUp.setPopUp({isOpen: false, html: createElement("div")});
    }

    useEffect(() => {
        setDisableButton(handleBadUpdate)
    }, [info])

    function handleBadUpdate(): boolean{

        if(isNaN(Number(info.budget)) || isNaN(Number(info.spent))){
            return true;
        }

        if(info.budget === budget && info.spent === spent && info.name === name){
            return true;
        }

        if(Number(info.spent) > Number(info.budget)){
            return true;
        }

        return false;
    }

    function handleEdit(e: React.ChangeEvent<HTMLInputElement>) {
        const {value, name} = e.target;
        setInfo(prevInfo => ({...prevInfo, [name]: value}));
    }

    function saveOnEnterClick(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" && !disableButton) {
            saveButton.current?.click();
        }
    }

    return (
        <div className={"edit--pop--up"} onKeyDown={saveOnEnterClick}>
            <label className={"edit--label"} htmlFor="name">name: </label>
            <input id={"name"} className={"edit--inputs"} type="text" name={"name"} value={info.name} onChange={handleEdit}/>
            <label className={"edit--label"} htmlFor="budget">budget: </label>
            <input id={"budget"} className={"edit--inputs"} type="text" name={"budget"} value={info.budget} onChange={handleEdit}/>
            <label className={"edit--label"} htmlFor="spent">spent: </label>
            <input id={"spent"} className={"edit--inputs"} type="text" name={"spent"} value={info.spent} onChange={handleEdit}/>
            <button ref={saveButton} disabled={disableButton} onClick={handleSave} className={"apply--button"}>apply</button>
        </div>
    )
}

