const Block = require('./block');
const cryptohash = require('../util/crypto-hash');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
const { Transaction } = require('../wallet/transaction');
const Wallet = require('../wallet');

class Blockchain {
    constructor(){
        this.chain =[Block.genesis()];
    }

    addBlock({data}){
        this.chain.push(Block.mineBlock({
            lastBlock : this.chain[this.chain.length-1],
            data
        }))
    }

    static isValidChain(chain){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){
            return false
        };

        for(let i =1; i<chain.length;i++){
            const block = chain[i];
            const last_difficulty = chain[i-1].difficulty; 
            const {timestamp, lasthash, nonce, difficulty, data, hash} = block;
            if(lasthash !== chain[i-1].hash){
                return false
            };

            if(Math.abs(last_difficulty - difficulty) > 1 ){
                return false;
            };
            const validated_hash = cryptohash(timestamp,data,lasthash,nonce,difficulty);

            if(hash !== validated_hash){
                return false
            };
        }

        return true
    }

    replaceChain(chain, validate_transactions, on_success){
        if(chain.length <= this.chain.length){
            console.error('The incoming chain must be longer');
            return;
        }

        if(!Blockchain.isValidChain(chain)){
            console.error('The incoming chain must be valid');
            return;
        }

        if(validate_transactions && !this.valid_transaction_data({ chain })){
            console.error('The incoming chain has an invalid data');
            return;
        }

        if(on_success){
            on_success();
        }
        console.log('replacing chain with ',chain);
        this.chain = chain;
    }

    valid_transaction_data({ chain }){
        for(let i=1;i<chain.length;i++){
            const block = chain[i];
            const transaction_set = new Set();
            let reward_transaction_count = 0;

            for(let transaction of block.data){
                if(transaction.input.address === REWARD_INPUT.address){
                    reward_transaction_count++;

                    if(reward_transaction_count > 1){
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.output_map)[0] !== MINING_REWARD){
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                }else{
                    if(!Transaction.valid_transaction(transaction)){
                        console.error('Invalid transaction');
                        return false;
                    }

                    const true_balance = Wallet.calculate_balance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== true_balance){
                        console.error('This is an invalid input amount')
                        return false;
                    }

                    if(transaction_set.has(transaction)){
                        console.error('Identical transaction appears more than once in the block');
                        return false;
                    }else{
                        transaction_set.add(transaction);
                    }
                }
            }

        }

        return true;
    }   
}

module.exports = Blockchain;