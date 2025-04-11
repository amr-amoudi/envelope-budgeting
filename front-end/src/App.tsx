import Card from "./card/Card.tsx"
import {Envelope} from "../types/envelope.ts";
import fetchData from "./util/fetchData.ts";
import {useState, createContext ,useEffect, Dispatch, SetStateAction} from "react";
import CardInfo from "./card/CardInfo.tsx";
import CardPopUp from "./card/CardPopUp.tsx"
import AddSection from "./addSection.tsx";

export const SetEnvelopes = createContext<Dispatch<SetStateAction<Envelope[]>>>(() => {});

export default function App() {
    const [cards, setCards] = useState<Envelope[]>([])
    const [displayCreate, setDisplayCreate] = useState(false);

    useEffect(() => {

            const fetchAllEnvelopes = async () => {
                if(!Array.isArray(cards) || cards.length === 0){
                    const data: Envelope[] = await fetchData<Envelope[]>("http://localhost:3000/api/envelope/")

                    setCards(data)
                }
            }

            fetchAllEnvelopes()

    }, [])

    if(!Array.isArray(cards) || cards.length === 0){
        return (
            <div className="error-message">
                <AddSection cards={cards} setCards={setCards} setDisplayCreate={setDisplayCreate} displayCreate={displayCreate}/>
                <h1>
                    there are no envelopes
                </h1>
            </div>
        )
    }

    const allCards = cards.map(envelope => {
        return(
            <Card key={envelope.id}>
                <CardPopUp>

                </CardPopUp>
                <CardInfo
                    budget={envelope.budget}
                    spent={envelope.spent}
                    id={envelope.id}
                    name={envelope.name}
                />
            </Card>
        )
    })


    return (
        <SetEnvelopes.Provider value={setCards}>
            <AddSection cards={cards} setCards={setCards} setDisplayCreate={setDisplayCreate} displayCreate={displayCreate}/>
            <div className={"cards--holder"}>
                {cards && allCards}
            </div>
        </SetEnvelopes.Provider>
    )
}