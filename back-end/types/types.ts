type Envelope = {
    id: number;
    name: string;
    budget: number;
    spent: number;
    createdAt: Date;
};

type Transfer = {
    id: number;
    amount: number;
    date: Date;
    to_id: number;
    from_id: number;
    to_name: string;
    from_name: string;
}

type Err = {
    message: string;
    status: number;
}

type Transaction = {
    id: number;
    amount: number;
    date: Date;
    to_id: number;
}

type TransactionWithEnvelopeName = Transaction & Pick<Envelope, "name">;

export {Envelope, Err, Transfer, Transaction, TransactionWithEnvelopeName};
