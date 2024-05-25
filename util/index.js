const cryptohash = require('./crypto-hash');

const EC = require('elliptic').ec;

const ec = new EC('secp256k1');

const verify_signature = ({public_key,data,signature}) => {
    const key_from_public = ec.keyFromPublic(public_key,'hex');

    return key_from_public.verify(cryptohash(data),signature);
};

module.exports = {ec,verify_signature};