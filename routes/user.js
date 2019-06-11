let express = require('express');
let router = express.Router();
let jwt = require('jsonwebtoken');
let crypto = require('crypto');
let userModel = require('../persistence/models/user');

// REST API
router.post('/user/login', userLoginRouter);

//=====================================================================
SALT = "salt_12356";

class REQ_USER{
  constructor(req, userm){
    this.userId = req.body.userId;
    if(userm == null){//not registed
      this.exist = false;
    }else{
      this.exist = true;
      this.token_version = userm.token_version;
      this.username = userm.user_name;
      this.password = userm.password;
    }
  }

  isMatchPasswd(passwd){
    if(this.exist){
      if(passwd == this.password){
        return true;
      }else{
        return false;
      }
    }else{
      return false;
    }
  }

  isExist(){
    return this.exist;
  }

  isLogedin(req,secret,userBackendTokenVersion){
    if(req.headers.authorization == undefined){
      return false;
    }
    if(!this.exist){
      return false;
    }
    jwt.verify(req.headers.authorization.split(' ')[1], secret, function(err, decoded) {
      console.log(err,decoded);
      if(err == null){ // valid token
        if(decoded.token_version == userBackendTokenVersion){// Not expired
          return true;
        }else{
          return false;
        }
      }else{
        return false;
      }
    });
  }
}

function isInputLoginComplete(req){
  if(req.body.userId == undefined ||
    typeof (req.body.userId) != "string"|| 
    req.body.password == undefined ||
    typeof (req.body.password) != "string"){
      return false;
    }else{
      return true;
    }
}

function generateTokenPayload(userId,version){
  let payload = {
    "userId" : userId,
    exp : 1,
    token_version : version 
  }
  return JSON.stringify(payload);
}

function generatSecret(payload, salt){
  let hash = crypto.createHmac('sha256', salt); /** Hashing algorithm sha256 */
  hash.update(payload);
  return  hash.digest('hex');
}

function saveVersion(version, userm){
  userm.update({ token_version: version});
}

function ErrResponse(res, errRes){
  res.shouldKeepAlive = false;
  res.status(errRes.code);
  let response_json = {
    code:errRes.code,
    message:errRes.message
  }
  res.json(errRes);
  res.end();
}

function NormalResponseUserLogin(res, token){
  let response_json = {
    code: 0,
    "token": token
  };
  res.json(response_json);
  res.shouldKeepAlive = false;
  res.status(200);
  res.end();
}

function generateToken(secret, userId, version){
    let token = jwt.sign({
      user: userId,
      token_version: version.toString()
  }, secret, { expiresIn: 60 * 60 * 24 * 15 });
  return token;
}


async function  userLoginRouter(req, res){
  console.log("login:",req.body);
  let errRes = {};
  do{
    if(!isInputLoginComplete(req)){
      errRes.message = "request not complete";
      errRes.code = 400;
      console.log(errRes.message);
      break;
    }

    let userm = await userModel.findOne({ where: {user_id:req.body.userId} });
    let user = new REQ_USER(req,userm);

    if(!user.isExist()){
      errRes.message = "user not exist";
      errRes.code = 404;
      console.log(errRes.message);
      break;
    }
    
    if(!user.isMatchPasswd(req.body.password)){
      errRes.message = "user wrong password";
      errRes.code = 401;
      console.log(errRes.message);
      break;
    }
    let userTokenVersion = Date.now();
    saveVersion(userTokenVersion,userm);
    let tokenPayload = generateTokenPayload(user.userId,userTokenVersion);
    let secret = generatSecret(tokenPayload, SALT);
    
    let token = generateToken(secret, user.userId, userTokenVersion);
    NormalResponseUserLogin(res, token);
    return;
  }while(0);

  ErrResponse(res, errRes);
}

function userLogout(req, res){

}



module.exports = router;