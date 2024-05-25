const crypto = require('crypto');

const cryptohash = (...inputs) => {
    const hash = crypto.createHash('sha256');
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '));
    return (hash.digest('hex'));
}; // gather n arguments in the array inputs

module.exports = cryptohash;