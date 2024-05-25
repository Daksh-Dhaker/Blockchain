const Transaction_pool = require('./transaction-pool');
const { Transaction } = require('./transaction');
const Wallet = require('./index');
const Blockchain = require('../blockchain/index')

describe('Transaction_pool()',() => {
    let transaction_pool, transaction, sender_wallet;

    beforeEach(() => {
        transaction_pool = new Transaction_pool();
        sender_wallet = new Wallet()
        transaction = new Transaction({
            sender_wallet,
            recipient: 'fake-recipient',
            amount: 50
        });
    });

    describe('set_transaction()',() => {
        it('adds a transaction',() => {
            transaction_pool.set_transaction(transaction);
            expect(transaction_pool.transaction_map[transaction.id]).toBe(transaction);
        });
    });

    describe('existing_transacion()',() => {
        it('returns an existing transaction given an input address',() => {
            transaction_pool.set_transaction(transaction);
            expect(
                transaction_pool.existing_transaction({input_address: sender_wallet.public_key})
            ).toBe(transaction);
        });
    });

    describe('valid_transactions()',() => {
        let valid_transactions, errorMock;

        beforeEach(() => {
            valid_transactions = [];
            errorMock = jest.fn();
            global.console.error = errorMock;
            for(let i=0;i<10;i++){
                transaction = new Transaction({
                    sender_wallet,
                    recipient: 'any-recipient',
                    amount: 30
                });

                if(i%3 === 0){
                    transaction.input.amount = 999999;
                }else if (i%3 === 1){
                    transaction.input.signature = new Wallet().sign('foo');
                }else{
                    valid_transactions.push(transaction);
                }

                transaction_pool.set_transaction(transaction);
            }
        });

        it('returns the valid transactions()',() => {
            expect(transaction_pool.valid_transactions()).toEqual(valid_transactions);
        });

        it('logs errors for the invalid transactions',() => {
            transaction_pool.valid_transactions();
            expect(errorMock).toHaveBeenCalled();
        });
    });

    describe('clear()',() => {
        it('clears the transactions',() => {
            transaction_pool.clear();

            expect(transaction_pool.transaction_map).toEqual({});
        });
    });

    describe('clear block_chain transactions',() => {
        it('clears the pool of any existing blockchain transactions',() => {
            const blockchain = new Blockchain();
            const expected_transaction_map = {};

            for(let i=0;i<6;i++){
                const transaction = new Wallet().create_transactions({
                    recipient: 'foo',
                    amount: 20
                });

                transaction_pool.set_transaction(transaction);

                if(i%2 === 0){
                    blockchain.addBlock({data: [transaction] })
                }else{
                    expected_transaction_map[transaction.id] = transaction;
                }
            }

            transaction_pool.clear_blockchain_transactions({chain: blockchain.chain });
            expect(transaction_pool.transaction_map).toEqual(expected_transaction_map);
        });
    });
});