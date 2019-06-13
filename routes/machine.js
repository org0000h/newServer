let express = require('express');
let router = express.Router();
const db = require('../persistence/db');
let machine_model = require('../persistence/models/machine');
let auth = require('../others/auth');
const check = require('../others/chack_fields');
//REST API
router.post("/machine/getMachineState",     getMachineState);

//todo 
// router.post("/machine/setMachineState",     setCntListRouter);
// router.post("/machine/delMAchine",          delCntListRouter);
// router.post("/machine/getMultiTableData",   getDevListRouter);
// router.post("/machine/setMultiTableData",   getNewDataRouter);

// function

function response(res, data){
    if(data == undefined || 
        res == undefined){
            throw new Error("data or data id undefined");
    }
    let response_body = {};
    response_body.status = 20000;
    response_body.payload = data;
    res.status(200);
    res.json(response_body);
    res.end();
}
function responseErr(res,err){
    if(err == undefined || 
        res == undefined){
            throw new Error("data or data id undefined");
    }
    let json = {
        errorInfo : err.message
    }
    if(err.code == undefined){
        res.status(500);
    }
    res.json(json);
    res.end();
}
async function queryDb(req){
    //todo
    return {
        "mock_data":"qwer1234"
    };
}

async function getMachineState(req, res){
    try{
        let wanted_body_fields = [];
        let wanted_header_fields = [];
        check.checkRequestFields(req, wanted_body_fields, wanted_header_fields);
        await auth.isAuthorized(req);
        let data = await queryDb(req);
        response(res, data);
    }catch(err){
        console.log(err.message);
        responseErr(res, err);
    }
} 

async function getNewDataRouter(req, res){
    try{
        let QueryCondition = generateNewDataQueryCondition(req);
        let device_model = deveice_infoTable.deviceModel(db,QueryCondition.eqp_type_name);
        let device_infos = await device_model.findAll({
            where:QueryCondition.whereCondition,
        });
        let data = [];
        let headers = [];
        for(i in device_infos[0].data){
            headers.push(i);
            data.push(device_infos[0].data[i]);
        }
        let json = {
            code: 0,
            data:data,
            headers:headers
        }
        res.json(json);
    }catch(err){
        console.log(err.message);
    }
}

async function getDevListRouter(req, res){
    let sort = req.body.sort.substr(1);   
    let whereCondition = {
        device_id:req.body.cntId.toString(),
        eqp_device_id: req.body.devId.toString()
    }
    addOptionalQuery(req, whereCondition);
    try{
        let list = await getFromModelAndGeneratList(whereCondition, sort, req);
        let json = generateRes(list); 
        response(res,json);
    }catch(err){
        console.log(err.message);
    }
}

function generateRes(list) {
    let json = {};
    json.code = 0;
    json.data = list;
    return json;
}

async function getFromModelAndGeneratList(whereCondition, sort, req) {
    let device_infos = await deveice_list.findAll({
        where: whereCondition,
        attributes: ["device_id","device_name","temperature"],
        order: [[[req.body.sort.category], req.body.sort.max]]
    });
    list = [];
    for (dev of device_infos) {
        item = {};
        item.devId = dev[hashmapFrontendtoIot.devId];
        item.devName = dev[hashmapFrontendtoIot.devName];
        item.devType = dev[hashmapFrontendtoIot.devType];
        item.type = dev[hashmapFrontendtoIot.type];
        item.status = dev[hashmapFrontendtoIot.status];
        list.push(item);
    }
    return list;
}

function addOptionalQuery(req, whereCondition) {
    if (req.body.devName != "" &&
        req.body.devName != undefined) {
        whereCondition[hashmapFrontendtoIot.devName] = req.body.devName;
    }
    if (req.body.devType != "" &&
        req.body.devType != undefined) {
        whereCondition[hashmapFrontendtoIot.devType] = req.body.devType;
    }
}

async function delCntListRouter(req, res){
    try{
        let result = await controller_infoModel.destroy({
            where:{
                device_id: req.body.cntId.toString()
            }
        });

        let code = 0;
        if(!result){
            code = 404;
        }
        let json = {
            "code": code
        }
        response(res, json);
    }catch(err){
        err.message = "del failed";
        err.code = 500;
        responseError(res, err);
    }
}

async function setCntListRouter(req, res){
    try{
        let result = await controller_infoModel.findByPk(req.body.cntId.toString());
        result.device_name = req.body.cntName;
        result.device_address = req.body.address;
        await result.save();
        let json = {
            "code": 0,
            "message":"can't find this controller"
        }
        response(res, json);

    }catch(err){
        err.message = "can't find this controller";
        err.code = 404;
        responseError(res, err);
    }

}

function response(res, json){
    res.json(json)
}
function generateNewDataQueryCondition(req){
    QueryCondition = {};
    QueryCondition.whereCondition = {};
    QueryCondition.whereCondition[hashmapFrontendtoIot.cntId] =  req.body.cntId.toString();
    QueryCondition.whereCondition[hashmapFrontendtoIot.devId] =  req.body.devId;
    QueryCondition[hashmapFrontendtoIot.devType] =  req.body.devType;
    return QueryCondition;
}

function generateQueryCondition(req){
    QueryCondition = {};
    QueryCondition.amount = req.body.limit;
    QueryCondition.offset = req.body.limit * (req.body.page - 1);
    QueryCondition.sort = req.body.sort.substr(1);
    return QueryCondition;
}
async function getControllerList(req){
    let queryCondition = generateQueryCondition(req);
    let all_controller_info = await controller_infoModel.findAndCountAll({
        attributes: ['device_id','device_name', 'device_address'],
        limit:queryCondition.amount,
        offset:queryCondition.offset,
        order:[[queryCondition.sort,ord[req.body.sort[0]]]]
    });
    return {ldata: all_controller_info.rows,count:all_controller_info.count};
}

function responseError(res, errRes){
    res.shouldKeepAlive = false;
    res.status(errRes.code);
    let response_json = {
      code:errRes.code,
      message:errRes.message
    }
    res.json(response_json);
    res.end();
  }

//去重,只返回指定属性
// let controllers = await deveice_list.findAll({
//      attributes: ['device_id',‘device_name'],
//      group: ['device_id'],
// });
module.exports = router;