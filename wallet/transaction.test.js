const { verify_signature } = require('../util');
const Wallet = require('./index');
const { Transaction } = require('./transaction');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transaction()',() => {
    let transaction, sender_wallet, recipient, amount;

    beforeEach(() => {
        sender_wallet = new Wallet();
        recipient = 'recipient-public-key';
        amount = 50;
        transaction = new Transaction({ sender_wallet, recipient, amount });
    });

    it('has a unique id',() => {
        expect(transaction).toHaveProperty('id');
    });

    describe('outputMap',() => {
        it('has an outputmap',() => {
            expect(transaction).toHaveProperty('output_map');
        });

        it('outputs the amount to the recipient',() => {
            expect(transaction.output_map[recipient]).toEqual(amount);
        });

        it('outputs the remaining amount for the senders wallet',() => {
            expect(transaction.output_map[sender_wallet.public_key]).toEqual(sender_wallet.balance - amount);
        });
    });

    describe('input',() => {
        it('has an input',() => {
            expect(transaction).toHaveProperty('input');
        });

        it('has a timestamp in the input',() => {
            expect(transaction.input).toHaveProperty('timestamp');
        });

        it('sets the amount to the sender wallet balance',() => {
            expect(transaction.input.amount).toEqual(sender_wallet.balance);
        });

        it('sets the address to the sender wallet public key',() => {
            expect(transaction.input.address).toEqual(sender_wallet.public_key);
        });

        it('signs the input',() => { 
            expect(verify_signature({
                public_key: sender_wallet.public_key,
                data: transaction.output_map,
                signature: transaction.input.signature
            })).toEqual(true);
        });
    });

    describe('valid Transactions()',() => {
        let errorMock;

        beforeEach(() => {
            errorMock = jest.fn();
            global.console.error = errorMock;
        });

        describe('when the transaction is valid',() => {
            it('returns true',() => {
                expect(Transaction.valid_transaction(transaction)).toBe(true);
            });
        });

        describe('when the transaction is invalid',() => {
            describe('and a transaction output_map is invalid',() => {
                it('returns false and logs an error',() => {
                    transaction.output_map[sender_wallet.public_key] = 99999;
                    expect(Transaction.valid_transaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction input signature is invalid',() => {
                it('returns false and logs an error',() => {
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.valid_transaction(transaction)).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });
    });

    describe('update()',() => {
        let original_signature, original_sender_output, next_recipient, next_amount;

        describe('and the amount is invalid',() => {
            it('throws an error',() => {
                expect(() => {transaction.update({
                    sender_wallet,recipient: 'foo',amount: 999999
                })}).toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid',() => {
            beforeEach(() => {
                original_signature = transaction.input.signature;
                original_sender_output = transaction.output_map[sender_wallet.public_key];
                next_recipient = 'next-recipient';
                next_amount = 50;
    
                transaction.update({ sender_wallet, recipient: next_recipient, amount: next_amount });
            });
    
            it('outputs the amount to next recipient',() => {
                expect(transaction.output_map[next_recipient]).toEqual(next_amount);
            });
    
            it('subtracts the amount from the original sender output amount',() => {
                expect(transaction.output_map[sender_wallet.public_key]).toEqual(original_sender_output-next_amount);
            });
    
            it('maintains the total output that matches the input amount',() => {
                expect(Object.values(transaction.output_map).reduce((total,num) => total+num)).toEqual(
                    transaction.input.amount
                );
            });
    
            it('re-signs the transactions',() => {
                expect(transaction.input.signature).not.toEqual(original_signature);
            });

            describe('and another update for the same recipient',() => {
                let added_amount;

                beforeEach(() => {
                    added_amount = 80;
                    transaction.update({
                        sender_wallet,recipient: next_recipient,amount: added_amount
                    });
                });

                it('adds to the recipient amount',() => {
                    expect(transaction.output_map[next_recipient]).toEqual(next_amount + added_amount);
                });

                it('subtracts the amount from the original sender output amount',() => {
                    expect(transaction.output_map[sender_wallet.public_key]).toEqual(
                        original_sender_output-next_amount-added_amount
                    );
                });
            });
        }); 
    });

    describe('reward_transactions()',() => {
        let reward_transaction, miner_wallet;

        beforeEach(() => {
            miner_wallet = new Wallet();
            reward_transaction = Transaction.reward_transaction({miner_wallet});
        });

        it('creates the transaction with the reward input',() => {
            expect(reward_transaction.input).toEqual(REWARD_INPUT);
        });

        it('creates ones transaction for the miner with the MINING_REWARD',() => {
            expect(reward_transaction.output_map[miner_wallet.public_key]).toEqual(MINING_REWARD);
        });
    });
});