// 使用 ethers.js 库与 Monad 测试网上的合约交互
const ethers = require('ethers');
const {FetchRequest} = require("ethers");
const { SocksProxyAgent } = require('socks-proxy-agent');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 定义合约 ABI
const abi = [
    {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
    {
        "inputs": [{"internalType": "address", "name": "target", "type": "address"}],
        "name": "AddressEmptyCode",
        "type": "error"
    },
    {
        "inputs": [{"internalType": "address", "name": "implementation", "type": "address"}],
        "name": "ERC1967InvalidImplementation",
        "type": "error"
    },
    {"inputs": [], "name": "ERC1967NonPayable", "type": "error"},
    {"inputs": [], "name": "FailedInnerCall", "type": "error"},
    {"inputs": [], "name": "InvalidInitialization", "type": "error"},
    {"inputs": [], "name": "NotInitializing", "type": "error"},
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {"inputs": [], "name": "UUPSUnauthorizedCallContext", "type": "error"},
    {
        "inputs": [{"internalType": "bytes32", "name": "slot", "type": "bytes32"}],
        "name": "UUPSUnsupportedProxiableUUID",
        "type": "error"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": true, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "Active",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{"indexed": false, "internalType": "uint64", "name": "version", "type": "uint64"}],
        "name": "Initialized",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"},
            {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{"indexed": true, "internalType": "address", "name": "implementation", "type": "address"}],
        "name": "Upgraded",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "UPGRADE_INTERFACE_VERSION",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "active",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserActiveLogs",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "initialOwner", "type": "address"}],
        "name": "initialize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "proxiableUUID",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "newImplementation", "type": "address"},
            {"internalType": "bytes", "name": "data", "type": "bytes"}
        ],
        "name": "upgradeToAndCall",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "", "type": "address"},
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "name": "userActiveLogs",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "userLastActiveTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "users",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "usersLength",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

/**
 * 获取随机化的 gas 限制
 * @param {bigint} estimatedGas - 预估的 gas 限制
 * @returns {bigint} 随机化的 gas 限制
 */
function getRandomizedGasLimit(estimatedGas) {
    // 随机生成 1.03-1.3 之间的乘数
    const multiplier = 1.03 + (Math.random() * 0.27); // 0.27 = 1.3 - 1.03
    return BigInt(Math.floor(Number(estimatedGas) * multiplier));
}

/**
 * 调整 gas 价格
 * @param {bigint} basePrice - 基础 gas 价格
 * @returns {bigint} 调整后的 gas 价格
 */
function adjustGasPrice(basePrice) {
    // 随机生成 1.03-1.3 之间的乘数
    const multiplier = 1.03 + (Math.random() * 0.27);
    return BigInt(Math.floor(Number(basePrice) * multiplier));
}

/**
 * 在 Monad 测试网上铸造代币的简化接口
 * @param {string} mnemonic - 钱包助记词
 * @param {string} proxy - SOCKS5 代理地址
 * @returns {Promise<Object>} - 交易收据
 */
async function activeTaker(mnemonic, proxy) {
    try {
        // 默认参数

        const value = "0.00";

        // Monad 测试网 RPC URL
        const rpcUrl = 'https://rpc-mainnet.taker.xyz';

        // 合约地址
        const contractAddress = '0xB3eFE5105b835E5Dd9D206445Dbd66DF24b912AB';

        // 确保代理格式正确
        const wallet_proxy = proxy.replace('socks5', 'socks5h');
        const proxyAgent = new SocksProxyAgent(wallet_proxy);

        // 创建带代理的 fetch 请求
        const fetch_req = new FetchRequest(rpcUrl);
        fetch_req.getUrlFunc = FetchRequest.createGetUrlFunc({
            agent: proxyAgent
        });

        // 创建 provider
        const provider = new ethers.JsonRpcProvider(fetch_req);

        // 从助记词创建钱包
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

        // 获取钱包地址
        const address = await wallet.getAddress();
        console.log(`使用钱包地址: ${address}`);

        // 检查合约是否存在
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
            throw new Error(`合约 ${contractAddress} 不存在或未部署`);
        }
        console.log("合约已部署，代码长度:", code.length);

        // 检查钱包余额
        const balance = await provider.getBalance(address);
        console.log(`钱包余额: ${ethers.formatEther(balance)} Taker`);

        if (balance <= ethers.parseEther(value)) {
            throw new Error(`钱包余额不足。需要 ${value} Taker，但只有 ${ethers.formatEther(balance)} Taker`);
        }

        // 创建合约实例
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        // 预估 gas
        const estimatedGas = await contract.active.estimateGas();
        console.log(`预估 gas: ${estimatedGas}`);

        // 获取 gas 价格并随机化
        const feeData = await provider.getFeeData();
        const adjustedMaxFeePerGas = adjustGasPrice(feeData.maxFeePerGas);
        const adjustedMaxPriorityFeePerGas = adjustGasPrice(feeData.maxPriorityFeePerGas);

        // 构建交易选项
        const options = {
            maxFeePerGas: adjustedMaxFeePerGas,
            maxPriorityFeePerGas: adjustedMaxPriorityFeePerGas,
            gasLimit: getRandomizedGasLimit(estimatedGas)
        };

        // 调用合约函数
        const txResponse = await contract.active(options);

        console.log(`交易已发送: ${txResponse.hash}`);

        // 等待交易确认
        const receipt = await txResponse.wait();
        console.log(`交易已确认: 区块号 ${receipt.blockNumber}`);

        return {
            success: true,
            tx_hash: receipt.hash,
            block_number: receipt.blockNumber,
            gas_used: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? 'success' : 'failed',


            wallet_address: address
        };
    } catch (error) {
        console.error("Active 失败:", error);
        throw error;
    }
}

// 修改导出对象，更新函数名
module.exports = {
    activeTaker
};
