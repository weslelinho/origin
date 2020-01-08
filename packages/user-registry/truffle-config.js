const PrivateKeyProvider = require("truffle-privatekey-provider");
const dotenv = require('dotenv');

dotenv.config({
    path: '../../.env'
});

const gas = 8000000;

module.exports = {
    networks: {
        development: {
            provider: () => new PrivateKeyProvider(process.env.DEPLOY_KEY, process.env.WEB3),
            network_id: "*",
            gas
        },
        test: {
            provider: () => new PrivateKeyProvider(process.env.DEPLOY_KEY, 'http://localhost:8548'),
            network_id: "*",
            gas
        },
    },
    compilers: {
        solc: {
            version: '../../node_modules/solc',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    }
};