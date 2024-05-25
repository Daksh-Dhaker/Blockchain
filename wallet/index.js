const { STARTING_BALANCE } = require('../config');
const { ec } = require('../util/index');
const cryptohash = require('../util/crypto-hash'); 
const { Transaction } = require('./transaction');

class Wallet{
    constructor(){
        this.balance = STARTING_BALANCE;

        this.key_pair = ec.genKeyPair();
        this.public_key = this.key_pair.getPublic().encode('hex');
    }

    sign(data){
        return this.key_pair.sign(cryptohash(data))
    }

    create_transactions({recipient,amount, chain}){
        if(chain){
            this.balance = Wallet.calculate_balance({
                chain,
                address: this.public_key
            });
        }

        if(amount > this.balance){
            throw new Error('Amount exceeds balance');
        }
        return new Transaction({sender_wallet: this,recipient,amount});
    }

    static calculate_balance({chain, address}){
        let has_conducted_transaction = false;
        let outputs_total =0;
        for(let i=chain.length-1;i>0;i--){
            const block = chain[i];

            for(let transaction of block.data){
                if(transaction.input.address === address){
                    has_conducted_transaction = true;
                }
                const address_output = transaction.output_map[address];

                if(address_output){
                    outputs_total = outputs_total+address_output;
                }
            }

            if(has_conducted_transaction){
                break;
            }
        }

        if(has_conducted_transaction){
            return outputs_total;
        }else{
            return STARTING_BALANCE+ outputs_total;
        }
    }
}

module.exports = Wallet;