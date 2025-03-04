# wallet_server
js tool for wallet server


# 注意：如果不是在本地部署的，需要修改代码中的JS_SERVER host地址, 

# 钱包服务封装
我把js的钱包服务打包成docker镜像了，可以在release中下载。


仍然可以自己使用源代码运行

docker image

1. 加载镜像
docker load < wallet-signer-amd.tar

2. 检查镜像是否加载成功
docker images wallet-signer-amd

3. 启动容器（后台运行）
docker run -d -p 3666:3666 --name wallet-signer-amd --restart=always wallet-signer-amd
