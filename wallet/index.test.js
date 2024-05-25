const Wallet = require('./index');
const { verify_signature } = require('../util/index.js');
const { Transaction } = require('./transaction.js');
const Blockchain = require('../blockchain/index.js');
const { STARTING_BALANCE } = require('../config.js');

describe('Wallet',() => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
    });

    it('has a balance',() => {
        expect(wallet).toHaveProperty('balance');
    });

    it('has a public key',() => {
        expect(wallet).toHaveProperty('public_key');
    });

    describe('signing data',() => {
        const data = "foobar";

        it('verifies a signature',() => {
            expect(verify_signature({
                public_key: wallet.public_key,
                data,
                signature: wallet.sign(data)
            })).toBe(true);
        });

        it('does not verify an invalid signature',() => {
            expect(verify_signature({
                public_key: wallet.public_key,
                data,
                signature: new Wallet().sign(data)
            })).toBe(false);
        });
    });

    describe('create_transactions()',() => {
        describe('and the amount exceeds the balance',() => {
            it('throws an error',() => {
                expect(() => wallet.create_transactions({amount:999999,recipient:'foo-recipient'})).toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid',() => {

            let transaction,amount,recipient;

            beforeEach(() => {
                amount = 50;
                recipient = 'foo-recipient';
                transaction = wallet.create_transactions({amount,recipient});
            });

            it('creates an instance of Transaction',() => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('matches the transaction input with the wallet',() => {
                expect(transaction.input.address).toEqual(wallet.public_key);
            });

            it('outputs the amount the recipient',() => {
                expect(transaction.output_map[recipient]).toEqual(amount);
            });
        });

        describe('and a chain is passed',() => {
            it('calls Wallet.calculate_balance()',() => {
                const calculate_balance_mock = jest.fn();

                const original_calculate_balance = Wallet.calculate_balance;

                Wallet.calculate_balance = calculate_balance_mock;

                wallet.create_transactions({
                    recipient: 'foo',
                    amount: 10,
                    chain: new Blockchain().chain
                });

                expect(calculate_balance_mock).toHaveBeenCalled();
                Wallet.calculate_balance = original_calculate_balance;
            });
        });
    });

    describe('calculate_balance()',() => {
        let blockchain;

        beforeEach(() => {
            blockchain = new Blockchain();
        });

        describe('and there are not outputs for the wallet',() => {
            it('returns the starting balance',() => {
                expect(
                    Wallet.calculate_balance({
                        chain: blockchain.chain,
                        address: wallet.public_key
                    })
                ).toEqual(STARTING_BALANCE)

            });
        });

        describe('and there are outputs for the wallet',() => {
            let transaction_1, transaction_2;

            beforeEach(() => {
                transaction_1 = new Wallet().create_transactions({
                    recipient: wallet.public_key,
                    amount: 50
                });

                transaction_2 = new Wallet().create_transactions({
                    recipient: wallet.public_key,
                    amount: 60
                });

                blockchain.addBlock({data: [transaction_1,transaction_2]});
            });

            it('adds the sum of all outputs to the wallet balance',() => {
                expect(
                    Wallet.calculate_balance({
                        chain: blockchain.chain,
                        address: wallet.public_key
                    })
                ).toEqual(
                    STARTING_BALANCE+
                    transaction_1.output_map[wallet.public_key]+
                    transaction_2.output_map[wallet.public_key]
                );
            });

            describe('and the wallet has made a transaction',() => {
                let recent_transaction;

                beforeEach(() => {
                    recent_transaction = wallet.create_transactions({
                        recipient: 'foo-address',
                        amount: 30
                    });

                    blockchain.addBlock({ data: [recent_transaction] });
                });

                it('return the output of recent transaction()',() => {
                    expect(Wallet.calculate_balance({
                        chain: blockchain.chain,
                        address: wallet.public_key
                    })).toEqual(recent_transaction.output_map[wallet.public_key]);
                });

                describe('and there are outputs next to and offer the recent transaction()',() => {
                    let same_block_transaction, next_block_transaction;

                    beforeEach(() => {
                        recent_transaction = wallet.create_transactions({
                            recipient: 'later-foo-address',
                            amount: 60
                        });

                        same_block_transaction = Transaction.reward_transaction({miner_wallet: wallet});

                        blockchain.addBlock({data:[recent_transaction,same_block_transaction]});

                        next_block_transaction = new Wallet().create_transactions({
                            recipient: wallet.public_key,
                            amount: 75
                        });

                        blockchain.addBlock({data:[next_block_transaction]});
                    });

                    it('includes the output amount in the returned balance',() => {
                        expect(
                            Wallet.calculate_balance({
                                chain: blockchain.chain,
                                address: wallet.public_key
                            })
                        ).toEqual(
                            recent_transaction.output_map[wallet.public_key]+
                            same_block_transaction.output_map[wallet.public_key]+
                            next_block_transaction.output_map[wallet.public_key]
                        );
                    });
                });
            });
        });
    });
});