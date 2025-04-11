import "../index.css";
import React, { ReactElement } from "react";

type PopUpType = { isOpen: boolean; html: ReactElement };
type PopUpContext = {
    popUp: PopUpType;
    setPopUp: React.Dispatch<React.SetStateAction<PopUpType>>;
};

export const PopUp = React.createContext<PopUpContext | undefined>(undefined);

export default function Card({ children }: { children: React.ReactNode }) {
    const [popUp, setPopUp] = React.useState<PopUpType>({
        isOpen: false,
        html: React.createElement("div"),
    });


    return (
        <PopUp.Provider value={{ popUp, setPopUp }}>
            <div className="card">
                {children}
            </div>
        </PopUp.Provider>
    );
}

export type {PopUpContext}