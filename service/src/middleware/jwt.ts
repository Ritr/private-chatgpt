// 引入模块依赖
import fs from "fs";
import path from "path";
//jsonwebtoken需要安装一下
import jwt from "jsonwebtoken";
// const jwt = require('jsonwebtoken');
// 创建 token 类
export default class Jwt {
    data: any;
    constructor(data) {
        //token需要带上的信息 例如：用户id
        this.data = data;
    }
    // 生成token
    generateToken() {
        const data = this.data;
        const created = Date.now();
        //私钥 加密
        const cert = fs.readFileSync(path.join(__dirname, '../../rsa_private_key.pem')); // 私钥 可以自己生成
        console.log(cert)
        const token = jwt.sign(
            {
                data,
                exp: created + 60 * 60 * 1000 * 24 * 30
            },
            cert,
            { algorithm: 'RS256' }
        );
        return token;
    }
    // 校验token
    verifyToken() {
        const token = this.data;
        const cert = fs.readFileSync(path.join(__dirname, '../../rsa_public_key.pem')); // 公钥 可以自己生成
        let res;
        try {
            //公钥 解密
            const result = jwt.verify(token, cert, { algorithms: ['RS256'] }) || {};
            const { exp = 0 } = result;
            const current = Date.now();
            //验证时效性
            if (current <= exp) {
                res = result.data || {};
            }
        } catch (e) {
            res = 'err';
        }
        return res;
    }
}
export { Jwt };