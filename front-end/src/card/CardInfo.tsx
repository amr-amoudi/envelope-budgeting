import "../index.css"
import {Envelope} from "../../types/envelope.ts";
import {PopUp} from "./Card.tsx";
import {ReactElement, useContext} from "react";
import DeletePopUp from "../pop-ups/DeletePopUp.tsx";
import EditPopUp from "../pop-ups/EditPopUp.tsx";
import editImage from "../assets/edit.svg"


export default function CardInfo({id, name, budget, spent}: Envelope) {
    const popUp = useContext(PopUp);

    function handleButtonOnCardClick(html: ReactElement){
        popUp?.setPopUp({isOpen: !popUp.popUp.isOpen, html: html, })
    }


    return (
        <>
            <button onClick={() => handleButtonOnCardClick(<DeletePopUp id={id} name={name} spent={spent} budget={budget}/>)} className="delete--button">X</button>
            <button onClick={() => handleButtonOnCardClick(<EditPopUp id={id} name={name} spent={spent} budget={budget} popUp={popUp!}/>)} className={"edit--button"}>
                <img src={editImage} alt="edit"/>
            </button>
            <h1>{name}</h1>
            <div className={"card-balance"}>
                <p>max budget: {budget}</p>
                <p>your spend: {spent}</p>
            </div>
        </>
    )
}