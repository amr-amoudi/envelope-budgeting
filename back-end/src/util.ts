import {Envelope} from "../types/envelope";
import {NextFunction} from "express";

// Sanitize user input by removing unnecessary properties
function refactorBody(body: Envelope): Envelope {
    // returns refactored object
    return {
        id: Number(body.id),
        name: body.name,
        budget: Number(body.budget),
        spent: Number(body.spent),
    };
}

function addToNewEnvelope(body: Envelope, envelopesArray: Envelope[]) {
    envelopesArray.unshift(body);
}

// complite transaction
function compliteTransaction(fromIndex: number, toIndex: number, value: number, envelopesArray: Envelope[] ,next: NextFunction) {
    // if the user doesn't have enough money on the "from" object
    if(envelopesArray[fromIndex].budget - envelopesArray[fromIndex].spent - value < 0){
        const error = new Error(`Invalid transaction: You can’t transform more than what you don’t have.`);
        (error as any).status = 400;
        return next(error)
    }

    // complete transaction
    envelopesArray[fromIndex].budget = envelopesArray[fromIndex].budget - value;
    envelopesArray[toIndex].budget = envelopesArray[toIndex].budget + value;
    next()
}

// Get indexes for transaction between envelopes
function getTransferEnvelopesIndexes(from: string | number, to: string | number, envelopesArray: Envelope[]): {fromIndex : number | undefined, toIndex: number | undefined} {
    let searchType: keyof Envelope = isNaN(Number(to)) ? "name" : "id";

    if(searchType === "id"){
        from = Number(from);
        to = Number(to);
    }

    let transformInfo: {fromIndex: number | undefined, toIndex: number | undefined} = {
        fromIndex: undefined,
        toIndex: undefined
    }

    for(let i = 0; i < envelopesArray.length; i++) {
        if(envelopesArray[i][searchType] === from){
            transformInfo.fromIndex = i
        }

        if(envelopesArray[i][searchType] === to){
            transformInfo.toIndex = i
        }
    }

    // warning: one of the indexes could be "undefined" if it was not found
    return transformInfo;
}

function deleteEnvelope(envelopeId: number, envelopesArray: Envelope[]): Envelope[] {
    // return an array with the deleted envelope
    return envelopesArray.filter((envelope: Envelope) => envelope.id !== envelopeId)
}

function updateEnvelope(body: Partial<Envelope>, envelope: Envelope): Envelope {
    return {
        id: envelope.id,
        name: body.name || envelope.name,
        budget: Number(body.budget) || envelope.budget,
        spent: Number(body.spent)|| envelope.spent
    };
}


// find envelope by id
function findEnvelope(id: number, envelopesArray: Envelope[]): { envelope: Envelope, index: number } | undefined {
    const foundEnvelope: number = envelopesArray.findIndex(envelope => envelope.id === id);

    // if envelope was not found it will return undefined
    if(foundEnvelope === -1) {
        return undefined;
    }

    // else will return index which is the index of the envelope
    // and envelope which is the envelope object
    return {index: foundEnvelope, envelope: envelopesArray[foundEnvelope]}
}


export {
    refactorBody,
    addToNewEnvelope,
    compliteTransaction,
    getTransferEnvelopesIndexes,
    deleteEnvelope,
    updateEnvelope,
    findEnvelope
}

