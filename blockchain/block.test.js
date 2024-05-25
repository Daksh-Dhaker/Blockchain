const Block = require('./block');
const { GENESIS_DATA, MINE_RATE} = require('../config');
const cryptohash = require('../util/crypto-hash');
const hexToBinary = require('hex-to-binary');

describe('Block',() => {
    const timestamp = 2000;
    const lasthash = 'foo-hash';
    const hash = 'dum-hash';
    const nonce = 1;
    const difficulty = 1;
    data = ['data'];
    const block = new Block({timestamp,data,hash,nonce,difficulty,lasthash});

    it('has a timestamp, lasthash, hash and data property',() => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lasthash).toEqual(lasthash);
        expect(block.data).toEqual(data);
        expect(block.hash).toEqual(hash);
        expect(block.nonce).toEqual(nonce);
        expect(block.difficulty).toEqual(difficulty);
    });

    describe('genesis()',() => {
        const genesis_block = Block.genesis();

        // console.log('genesis_block',genesis_block);

        it('returns a block instance',() => {
            expect(genesis_block instanceof Block).toBe(true);
        });

        it('return the genesis data',() => {
            expect(genesis_block).toEqual(GENESIS_DATA);
        });
    });

    describe('mineBlock()',() => {
        const lastBlock = Block.genesis();
        const data = 'mined_data';
        const mineBlock = Block.mineBlock({lastBlock,data});

        it('returns a Block instance',() => {
            expect(mineBlock instanceof Block).toBe(true);
        });

        it('sets the `lasthash` to be the `hash` of lastblock',() => {
            expect(mineBlock.lasthash).toEqual(lastBlock.hash);
        });

        it('sets the `data`',() => {
            expect(mineBlock.data).toEqual(data);
        });

        it('sets a `timestamp`',() => {
            expect(mineBlock.timestamp).not.toEqual(undefined);
        });

        it('creates a SHA-256 hash',() => {
            expect(mineBlock.hash).toEqual(
                cryptohash(mineBlock.timestamp,
                            mineBlock.nonce,
                            mineBlock.difficulty,
                            data,lastBlock.hash)
                        );
        });

        it('sets the hash that matches the difficulty criteria',() => {
            expect(hexToBinary(mineBlock.hash).substring(0,mineBlock.difficulty)).toEqual('0'.repeat(mineBlock.difficulty));
        });

        it('adjsusts the difficulty',() => {
            const possibleResults = [lastBlock.difficulty+1,lastBlock.difficulty-1];
            expect(possibleResults.includes(mineBlock.difficulty)).toBe(true);
        });
    });

    describe('adjust_difficulty()',() => {
        it('raises the difficulty for a quickly mined block',() => {
            expect(Block.adjust_difficulty({
                originalBlock: block, timestamp: block.timestamp+MINE_RATE-100
            })).toEqual(block.difficulty+1);
        });

        it('lowers the difficulty for a slowly mined block',() => {
            expect(Block.adjust_difficulty({
                originalBlock: block, timestamp: block.timestamp+MINE_RATE+100
            })).toEqual(block.difficulty-1);
        });

        it('has a lower limit of 1',() => {
            block.difficulty = -1;
            expect(Block.adjust_difficulty({originalBlock: block})).toEqual(1);
        });
    });
});