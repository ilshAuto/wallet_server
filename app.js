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
const {activeTaker} = require("./takerContract");

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
        let { rpcUrl = 'https://rpc.ankr.com/eth', mnemonic = '', proxy = '', payload = '' } = req.body;

        console.log(payload)
        // 参数验证
        if (!mnemonic || !proxy || !payload) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 、 proxy 、 payload'
            });
        }
        let wallet_proxy = proxy
        if (proxy.startsWith('socks5h')){

        }else{
            wallet_proxy = proxy.replace('socks5', 'socks5h');
        }
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



app.post('/api/transfer', async (req, res) => {
    try {
        let { rpcUrl = 'https://rpc.ankr.com/eth', mnemonic = '', proxy = ''} = req.body;
        // 参数验证
        if (!mnemonic || !proxy) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 、 proxy'
            });
        }
        console.log(rpcUrl)
        let wallet_proxy = proxy
        if (proxy.startsWith('socks5h')){

        }else{
            wallet_proxy = proxy.replace('socks5', 'socks5h');
        }
        const proxyAgent = new SocksProxyAgent(wallet_proxy);
        // 执行登录

        const fetch_req = new FetchRequest(rpcUrl);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });

        const provider = new ethers.JsonRpcProvider(fetch_req);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

        const randomAmount = (Math.random() * 0.045 + 0.005).toFixed(4);
        const transaction = {
            to: await wallet.getAddress(),
            value: ethers.parseUnits(randomAmount.toString(), 18),
            nonce: await wallet.getNonce(),
            gasLimit: 21000
        };

        // 签名交易
        const signedTx = await wallet.signTransaction(transaction);
        // console.log("已签名交易:", signedTx);

        // 发送交易
        const tx = await wallet.sendTransaction(transaction);
        // console.log("交易已发送，等待确认...");
        console.log("交易Hash:", tx.hash);

        // 等待交易确认
        const receipt = await tx.wait();
        // console.log("交易已确认:", receipt);

        // const address = await wallet.getAddress();
        // const signature = await wallet.signMessage(payload);
        // console.log(signature)
        return res.json({
            success: true,
            address: await wallet.getAddress(),
            hash:tx.hash
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
        let wallet_proxy = proxy
        if (proxy.startsWith('socks5h')){

        }else{
            wallet_proxy = proxy.replace('socks5', 'socks5h');
        }
        console.log(wallet_proxy)

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

app.post('/api/generate', async (req, res) =>{
    const wallet = ethers.Wallet.createRandom()

    return res.json({
        success: true,
        mnemonic: wallet.mnemonic,
        address: await wallet.getAddress()
    });
})

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




// 修改 Solana sign 接口
app.post('/api/balance', async (req, res) => {
    // let { rpcUrl = 'https://rpc.ankr.com/eth', mnemonic = '', proxy = ''} = req.body;
    let {rpcUrl='https://rpc.ankr.com/eth' , mnemonic='', proxy=''} = req.body;

    try {

        if (!mnemonic || !proxy) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic、payload 或 proxy'
            });
        }
        // const rpcUrl = 'https://testnet-rpc.monad.xyz'
        const fetch_req = new FetchRequest(rpcUrl);
        // let proxy = 'socks5://192.168.0.106:17008'
        const wallet_proxy = proxy.replace('socks5', 'socks5h');
        const proxyAgent = new SocksProxyAgent(wallet_proxy);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });
        const provider = new ethers.JsonRpcProvider(fetch_req);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
        let address = await wallet.getAddress()
        let balance = await provider.getBalance(address)
        let balanceInEther = ethers.formatEther(balance);  // 使用 ethers.formatEther
        console.log("Balance in Ether:", balanceInEther);
        res.json({
            success: true,
            address: address,
            balance: balanceInEther
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 添加新的端点用于检查特定代币余额
app.post('/api/token_balance', async (req, res) => {
    let {rpcUrl='https://rpc.ankr.com/eth', mnemonic='', proxy='', tokenAddress=''} = req.body;

    try {
        if (!mnemonic || !proxy) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 或 proxy'
            });
        }

        if (!tokenAddress) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: tokenAddress'
            });
        }

        const wallet_proxy = proxy.replace('socks5', 'socks5h');
        const proxyAgent = new SocksProxyAgent(wallet_proxy);
        
        const fetch_req = new FetchRequest(rpcUrl);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });
        
        const provider = new ethers.JsonRpcProvider(fetch_req);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
        let userAddress = await wallet.getAddress();
        
        // ERC20代币接口的ABI
        const erc20Abi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];
        
        // 创建代币合约实例
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        
        // 获取代币余额、精度和符号
        const balance = await tokenContract.balanceOf(userAddress);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        // 格式化代币余额
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        console.log(`Token Balance (${symbol}):`, formattedBalance);
        
        res.json({
            success: true,
            address: userAddress,
            tokenAddress: tokenAddress,
            symbol: symbol,
            balance: formattedBalance,
            rawBalance: balance.toString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/activeTaker', async (req, res) => {
    try {
        const { mnemonic, proxy } = req.body;

        // 验证必要参数
        if (!mnemonic || !proxy) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: mnemonic 和 proxy 是必需的'
            });
        }

        // 调用铸造函数
        const result = await activeTaker(mnemonic, proxy);

        // 返回成功结果
        res.status(200).json(result);
    } catch (error) {
        // 返回错误信息
        res.status(500).json({
            success: false,
            error: error.message || '铸造过程中发生未知错误'
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
