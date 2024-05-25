const { GENESIS_DATA, MINE_RATE} = require('../config');
const cryptohash = require('../util/crypto-hash');
const hexToBinary = require('hex-to-binary');

class Block{
    constructor({timestamp,lasthash,data,hash,nonce,difficulty}){
        this.timestamp = timestamp;
        this.lasthash = lasthash;
        this.data = data;
        this.hash = hash;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }

    static genesis(){
        return new this(GENESIS_DATA);
    }

    static mineBlock({lastBlock,data}){
        let hash, timestamp;
        // const timestamp = Date.now();
        const lasthash = lastBlock.hash;
        let { difficulty } = lastBlock;
        let nonce = 0;
        // const hash = cryptohash(timestamp,lasthash,data,nonce,difficulty);

        do{
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjust_difficulty({originalBlock: lastBlock,timestamp});
            hash = cryptohash(timestamp,lasthash,nonce,difficulty,data);
        }while(hexToBinary(hash).substring(0,difficulty) !== '0'.repeat(difficulty));

        return new this({
            timestamp,
            lasthash,
            data,
            nonce,
            difficulty,
            hash
        });
    }

    static adjust_difficulty({originalBlock, timestamp}){
        const {difficulty} = originalBlock;
        const diff = timestamp-originalBlock.timestamp;

        if(difficulty < 1){
            return 1;
        };

        if(diff > MINE_RATE){
            return difficulty-1;
        };

        return difficulty+1;
    }
}

module.exports = Block;