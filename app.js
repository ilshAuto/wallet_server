const express = require('express');
const bodyParser = require('body-parser');
const ethers = require('ethers');
const { Keypair, getBase58Decoder, Connection, createKeyPairSignerFromBytes } = require('@solana/web3.js');
const solana = require('@solana/web3.js');
const bip39 = require('bip39');
const bs58 = require('bs58');
const {SocksProxyAgent} = require("socks-proxy-agent");
const {FetchRequest} = require("ethers");
const { derivePath } = require('ed25519-hd-key');
const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const app = express();
const port = process.env.PORT || 3666;

// 中间件
app.use(bodyParser.json());

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// 签名接口
app.post('/api/wallet_address', async (req, res) => {
    try {
        const { mnemonic} = req.body;

        // 参数验证
        if (!mnemonic
        ) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: mnemonic or proxy'
            });
        }

        // 获取签名
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        const address = await wallet.getAddress();
        console.log(address)
        let result = {
                success: true,
                data: {
                    address: address
                }
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/sign', async (req, res) => {
    try {
        const rpcUrl='https://rpc.ankr.com/eth'
        const { mnemonic, proxy, payload } = req.body;
        console.log(payload)
        // 参数验证
        if (!mnemonic || !proxy || !payload) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 、 proxy 、 payload'
            });
        }
        const wallet_proxy = proxy.replace('socks5', 'socks5h');
        const proxyAgent = new SocksProxyAgent(wallet_proxy);
        // 执行登录

        const fetch_req = new FetchRequest(rpcUrl);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });

        const provider = new ethers.JsonRpcProvider(fetch_req);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
        const address = await wallet.getAddress();
        const signature = await wallet.signMessage(payload);
        console.log(signature)
        return res.json({
            success: true,
            address:address,
            signature:signature
        });



    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


app.post('/api/keitokun/sign', async (req, res) => {
    try {
        const rpcUrl='https://rpc.ankr.com/eth'
        const { mnemonic, proxy, payload } = req.body;

        // 参数验证
        if (!mnemonic || !proxy || !payload) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 、 proxy 、 payload'
            });
        }
        const wallet_proxy = proxy.replace('socks5', 'socks5h');
        const proxyAgent = new SocksProxyAgent(wallet_proxy);
        // 执行登录

        const fetch_req = new FetchRequest(rpcUrl);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });

        const provider = new ethers.JsonRpcProvider(fetch_req);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
        const address = await wallet.getAddress();
        const signature = await wallet.signMessage(payload);

        return res.json({
                success: true,
                address:address,
                signature:signature
            });


    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 添加新的Solana接口
app.post('/api/solana/wallet_address', async (req, res) => {
    try {
        const { mnemonic } = req.body;

        if (!mnemonic) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic'
            });
        }

        // 使用BIP44路径派生
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
        const keypair = Keypair.fromSeed(derived.key);

        res.json({
            success: true,
            data: {
                address: keypair.publicKey.toBase58(),
                // privateKey: bs58.encode(Buffer.from(keypair.secretKey))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 修改 Solana sign 接口
app.post('/api/solana/sign', async (req, res) => {
    try {
        const { mnemonic, payload, proxy } = req.body;

        if (!mnemonic || !payload || !proxy) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic、payload 或 proxy'
            });
        }

        // const wallet_proxy = proxy.replace('socks5', 'socks5h');
        // const proxyAgent = new SocksProxyAgent(wallet_proxy);

        // 创建带代理的连接配置
        const rpcUrl = 'https://api.mainnet-beta.solana.com';
        // const connection = new Connection(rpcUrl, {
        //     fetchMiddleware: (url, options) => {
        //         options.agent = proxyAgent;
        //         return fetch(url, options);
        //     }
        // });

        // 使用BIP44路径派生
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
        const keypair = Keypair.fromSeed(derived.key);

        const message = new TextEncoder().encode(payload);
        const sign = nacl.sign.detached(
            Buffer.from(message),
            keypair.secretKey
        )

        const base58String = bs58.encode(sign);
        console.log('Base58:', base58String);
        res.json({
            success: true,
            address: keypair.publicKey.toBase58(),
            signature: base58String
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
