type Envelope = {
    id: number;
    name: string;
    budget: number;
    spent: number;
    createdAt?: Date;
};

type Err = {
    message: string;
    status: number;
}

export {Envelope, Err};
