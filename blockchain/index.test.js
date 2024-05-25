const Blockchain = require('./index');
const Block = require('./block');
const cryptohash = require('../util/crypto-hash');
const Wallet = require('../wallet');
const { Transaction } = require('../wallet/transaction');

describe('Blockchain',()=> {
    let blockchain, newChain, original_chain, errorMock;

    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();
        original_chain = blockchain.chain;
        errorMock = jest.fn();
        global.console.error = errorMock;
    });

    it('contains a chain array instance',() => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with a genesis block',() => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });

    it('has an addBlock() function',() => {
        const newData = 'foo-bar';
        blockchain.addBlock({data:newData});
        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    });

    describe('isValidChain()',()=> {
        describe('when the chain does not start with a genesis block',() => {
            it('returns false',() => {
                blockchain.chain[0] = {data: 'fake-genesis'};
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when the chain starts with a genesis block',() => {

            beforeEach(() => {
                blockchain.addBlock({data: 'A'});
                blockchain.addBlock({data: 'B'});
                blockchain.addBlock({data: 'C'});
            });

            describe('and a lasthash refrence is changed',() => {
                it('return false',() => {
                    blockchain.chain[2].lasthash = 'broken-lasthash';

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain a block with an invalid field',() => {
                it('return false',() => {
                    blockchain.chain[2].data = 'data-evil';
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with jumped difficulty',() => {
                it('return false',() => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lasthash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty-3;

                    const hash = cryptohash(timestamp, data, lasthash, nonce, difficulty);

                    const badblock = new Block({timestamp, data, lasthash, hash, nonce, difficulty});

                    blockchain.chain.push(badblock);
                    expect((Blockchain.isValidChain(blockchain.chain))).toBe(false);
                });
            });

            describe('and the chain does not contain any invalid blocks',() => {
                it('return true',() => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe('replaceChain()',() => {
        let logMock;

        beforeEach(() => {
            logMock = jest.fn();
            global.console.log = logMock;
        });

        describe('when the new chain is not longer',() => {
            beforeEach(() => {
                newChain.chain[0] = {new:'chain'};
                blockchain.replaceChain(newChain.chain);
            });

            it('does not replace the chain',() => {
                expect(blockchain.chain).toEqual(original_chain);
            });

            it('logs an error',() => {
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('when the new chain is longer',() => {

            beforeEach(() => {
                newChain.addBlock({data: 'A'});
                newChain.addBlock({data: 'B'});
                newChain.addBlock({data: 'C'});
            });

            describe('when the chain is invalid',() => {

                beforeEach(() => {
                    newChain.chain[2].hash = 'some-fake-hash';
                    blockchain.replaceChain(newChain.chain, false);
                });

                it('does not replace the chain',() => {
                    expect(blockchain.chain).toEqual(original_chain);
                });

                it('logs an error',() => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('when the chain is valid',() => {

                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });

                it('replaces the chain',() => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                it('logs about the chain replacement',() => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the validate_transaction falg is true',() => {
            it('calls valid_transaction_data()',() => {
                const valid_transaction_data_mock = jest.fn();

                blockchain.valid_transaction_data = valid_transaction_data_mock;

                newChain.addBlock({data: 'foo'});
                blockchain.replaceChain(newChain.chain,true);

                expect(valid_transaction_data_mock).toHaveBeenCalled();
            });
        });
    });

    describe('valid_transaction_data()',() => {
        let transaction,reward_transaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.create_transactions({
                recipient: 'foo-address',
                amount: 65
            });
            reward_transaction = Transaction.reward_transaction({miner_wallet: wallet});
        });

        describe('and the transaction data is valid',() => {
            it('return true',() => {
                newChain.addBlock({data: [transaction,reward_transaction]});
                expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe('and the transaction data has multiple rewards',() => {
            it('returns false and logs an error',() => {
                newChain.addBlock({data:[transaction,reward_transaction,reward_transaction]});
                expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and the transaction data has atleast one malformed output map',() => {
            describe('and the transaction is not a reward transaction',() => {
                it('returns false and logs an error',() => {
                    transaction.output_map[wallet.public_key] = 999999;
                    newChain.addBlock({data:[transaction,reward_transaction]});
                    expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction is a reward transaction',() => {
                it('returns false and logs an error',() => {
                    reward_transaction.output_map[wallet.public_key] = 999999;

                    newChain.addBlock({ data: [transaction,reward_transaction] });
                    expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the transaction data has atleast one malformed input',() => {
            it('returns false and logs an error',() => {
                wallet.balance = 9000;
                const evil_output_map = {
                    [wallet.public_key]: 8900,
                    foo_recipient: 100
                };

                const evil_transaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.public_key,
                        signature: wallet.sign(evil_output_map)
                    },
                    output_map: evil_output_map
                };
                newChain.addBlock({data: [evil_transaction,reward_transaction]});
                expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and a block contains multiple identical transactions',() => {
            it('returns false and logs an error',() => {
                newChain.addBlock({
                    data: [transaction,transaction,transaction,reward_transaction]
                });

                expect(blockchain.valid_transaction_data({chain: newChain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });
    });
});