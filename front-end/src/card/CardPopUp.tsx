import React, {ReactElement, HTMLAttributes} from "react";
import { PopUp } from "./Card.tsx";


export default function CardPopUp({display, html ,...rest}: {display?: boolean, html?: ReactElement, rest?: HTMLAttributes<HTMLDivElement>  }) {
    const popUpContext = React.useContext(PopUp);


    return (
        <div {...rest} style={{display: popUpContext?.popUp.isOpen || display ? "flex" : "none"}} className="pop--up">
            <button onClick={() => popUpContext?.setPopUp({isOpen: false, html: React.createElement("div")})} className={"close--tab--button"}>X</button>
            {popUpContext?.popUp.html || html}
        </div>
    );
}
