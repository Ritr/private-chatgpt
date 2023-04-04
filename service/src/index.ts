import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { Jwt } from './middleware/jwt';
var generator = require('generate-password');

const mysql = require('mysql');

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())
const connection = mysql.createConnection({
  host: '146.56.38.245',
  port: '3306',
  user: 'root',
  password: 'liuGang0',
  database: 'chatgpt'
});

connection.connect(function (err) {
  console.log('------', err);
});
let loginAccount = "";
const passUrl = ['/login', '/register'];
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  console.log("*******请求来了**********");
  if (!~passUrl.findIndex(item => req.url === item)) {
    const token = req.headers.token;
    console.log(req.headers)
    const jwt = new Jwt(token);
    const result = jwt.verifyToken();
    console.log(result)
    if (result == 'err' || !result) {
      res.send({
        status: 'Success', message: 'Unauthorized', data: {
          msg: "登录已过期,请重新登录"
        }
      });
      return false;
    }
    loginAccount = result;
  }
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  // 查询可用次数
  // todo
  let count = 0;
  connection.query(`SELECT count  FROM user where account = '${loginAccount}'`, async function (error, results, fields) {
    if (!error) {
      count = results[0]['count'];
      console.log("count--------", count)
      if (count <= 0) {
        res.send({ status: 'Success', message: "次数已经用完", data: null })
        return;
      } else {
        res.setHeader('Content-type', 'application/octet-stream')
        try {
          const { prompt, options = {}, systemMessage } = req.body as RequestProps
          let firstChunk = true
          await chatReplyProcess({
            message: prompt,
            lastContext: options,
            process: (chat: ChatMessage) => {
              res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
              firstChunk = false
            },
            systemMessage,
          })
          // 更新可用次数
          // todo
          count--;
          connection.query(`UPDATE user SET count = ${count}  where account = '${loginAccount}'`, function (error, results, fields) {
            console.log("error",error);
            console.log("results",results);
          })
        }
        catch (error) {
          res.write(JSON.stringify(error))
        }
        finally {
          res.end()
        }
      }
    } else {
      res.send({ status: 'Fail', message: error.message, data: null })
      return;
    }
  })

})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/registry', async (req, res) => {
  // 生成账号密码，写入数据库，返回给前端。
  let account = Math.random().toString(36).slice(-4);
  let password = generator.generate({
    length: 8,
    numbers: true
  });
  // 账号根据user表的length追加后缀
  let length = 0;
  connection.query("SELECT COUNT(*) as count  FROM `user`", function (error, results, fields) {
    if (!error) {
      length = results[0]['count'];
      account += length;
      connection.query("INSERT INTO `user` (`account`, `password`) VALUES ('" + account + "', '" + password + "')", function (error, results, fields) {
        if (!error) {
          res.send({
            status: 'Success', message: 'Verify successfully', data: {
              account: account,
              password: password,
            }
          })
        } else {
          res.send({
            status: 'Fail', message: 'Registry Failed'
          })
        }
      });
    } else {
      res.send({
        status: 'Fail', message: 'Registry Failed'
      })
    }
  });
});
router.post('/login', async (req, res) => {
  const bodyData = req.body || {};
  const account = bodyData.account;
  const password = bodyData.password;
  console.log(bodyData)
  if (!account || !password) {
    res.send({
      status: 'Error', message: 'Verify Failed', data: {
        msg: "用户名密码不能为空！",
      }
    })
    return false;
  }
  connection.query(`SELECT COUNT(*) as count  FROM user where account ='${account}'  and password='${password}'`, function (error, results, fields) {
    if (!error) {
      let length = results[0]['count'];
      if (length > 0) {
        const jwt = new Jwt(account);
        const token = jwt.generateToken();
        console.log("登录成功");
        res.send({
          status: 'Success', message: 'Verify successfully', data: {
            msg: "登录成功",
            token: token
          }
        })
        return false;
      }
    }
    res.send({
      status: 'Error', message: 'Verify Failed', data: {
        msg: "用户名密码错误！",
      }
    })
  });
});

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
