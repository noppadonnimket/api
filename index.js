const express = require('express')
const cors = require('cors');
const app = express()
const port = 4000
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
 extended: true
}));
const mysql = require("mysql");
const con = mysql.createConnection({
    host: "db-mysql-spr66-sgp1-do-user-8264404-0.b.db.ondigitalocean.com",
    user: "qdev",
    password: "qwerty1234!@",
    port: 25060,
    database: "Dev_Deposit"
})

app.use(cors());
/*app.use(function(req,res,next){
    res.header('Access-Control-Allow-Origin',"*");
    res.header('Access-Control-Allow-Methods','GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers','Content-Type');
    next();   
})*/


app.get('/', (req,res) => {res.send('test1234')})

app.post('/api/qrcode', (req,res) => {
console.log(req.body.id)
sqlGetQrcode = `select * from System_Deposit where User_ID = ${req.body.id}`
con.query(sqlGetQrcode,(err,result)=>{
    res.json(result)
    })
});



app.get('/add/:id', (req,res) => {
    let id = Number(req.params.id)
    if(id==1){
        let SendID = [
            {id:1,name:"testapi"},
            {id:2,name:"testapi2"}
        ]
        res.status(200).json({ status: 200, msg: "get customer success",success: true, dataApi:SendID})
    }else{
        res.status(200).json({ status: 200, msg: "get customer fail", success: false, dataApi: [] })
    }

})
//ใช้รับค่าจากหน้า Deposit ไปเก็บใน
app.post('/api/deposit', (req,res) => {
        if(Object.values(req.body).length > 0){
        res.status(200).json({ status: 200, msg: "Success",success: true})
        console.log(req.body.amount,"bath")
        console.log("id" ,req.body.id.id)

        //ให้ทำการลบข้อมูลทุกๆเวลาที่กำหนัดหากไม่มีการจับคู่
        setTimeout(() => {
            sqlDelSys = `delete from System_Deposit where User_ID ='${req.body.id.id}'`
            con.query(sqlDelSys,(err,result)=>{if(err)throw err; console.log("Time Out Delete ID : "+req.body.id.id +" Amount :"+req.body.amount)});

        }, 900000);
        // 15 นาทีลบ

        sqlAmountGet = "SELECT Amount_float from Amount_float";
        con.query(sqlAmountGet,(err,amountFloatDB)=>{
        if(err) throw err;

        //ใช้+ค่าเข้าไป0.01ทุกครั้งที่มีการกดเติมเงินจากระบบ
        sqlAmountFloatAdd = "Update Amount_float SET Amount_float = Amount_float+0.01 where Amount_float=Amount_float";
        con.query(sqlAmountFloatAdd,(err,amountFloatAdd)=>{
            if(err) throw err;
        });
        let amountFloatJS = JSON.stringify(amountFloatDB);
        let amountFloatP = JSON.parse(amountFloatJS);
        let amountFloat = (amountFloatP[0].Amount_float);
        let amountCal = req.body.amount-amountFloat;
        let amountToStr = amountCal.toString();
        let amountReplace = amountToStr.replace('.','');
        const qrcode = require('qrcode')
        const generatePayload = require('promptpay-qr')
        const mobileNumber = '092-978-4328'
        const options = { type: 'svg', color: { red: '#FF0000'} }            
        //หาก amountFloat ใน db มีค่าเมากกว่าเท่ากับ1ให้ทำการรีเซ็ตใหม่ให้เป็น 0
        if(amountFloat>=1){
            sqlset = "UPDATE Amount_float SET Amount_float = 0";
            con.query(sqlset,(err,result)=>{
                if(err) throw err;
            })
        }  

        let amountqr = parseInt(req.body.amount);
        const amount = amountqr-amountFloat;
        const payload = generatePayload(mobileNumber,{amount})
        qrcode.toDataURL(payload, function(err, qrcodeStr){
            //ใช้รับค่าจากหน้า Deposit ไปเก็บใน System Deposit
            sqlInsert = `insert into System_Deposit (User_ID,AMOUNT,Amount_Cal,Amount_replace,qrcode) VALUES ('${req.body.id.id}','${req.body.amount}','${amountCal}','${amountReplace}','${qrcodeStr}')`;
            con.query(sqlInsert,function(err,result){
                if(err) throw err;
                console.log('Insert Success');
            });});
        });
        }else{
            res.status(200).json({ status: 200, msg: "fail",success: false})
        }
    
    });

    
//ส่วนของการ SetInterval
setInterval(()=>{
                    //อัพเดทค่าที่เข้ามาในBank Deposit ให้ทำการ replace ค่า . ออกเพื่อให้แมพกันได้
                    Checknull = "update Bank_Deposit set Amount_replace = replace(Amount,'.','') where Amount_replace is null";
                    con.query(Checknull,(err,result)=>{
                        if(err) throw err;
                    });

                    sql = "SELECT Bank_Deposit.Amount as Bank_Amount,System_Deposit.AMOUNT as System_Amount,System_Deposit.User_ID,System_Deposit.create_at,System_Deposit.Amount_Cal,System_Deposit.Amount_replace FROM Bank_Deposit INNER JOIN System_Deposit ON Bank_Deposit.Amount_replace = System_Deposit.Amount_replace";
                    con.query(sql,(err,result)=>{
                        if(err) throw err;
                            var dataStr = JSON.stringify(result);
                            var dataP = JSON.parse(dataStr);
                            for(let i = 0;i<dataP.length; i++){
    
                                console.log(dataP[i].Amount_Cal);
                                console.log("Amount : "+dataP[i].Amount,"| User ID : "+dataP[i].User_ID);
                                sqlInsert = `insert into Get_transaction (Amount_User,User_ID,Amount_Cal) values ('${dataP[i].System_Amount}','${dataP[i].User_ID}','${dataP[i].Amount_Cal}');`
                                sqlUpdate = `update wallet set Credit_balance = '${dataP[i].System_Amount}'+Credit_balance where User_ID ='${dataP[i].User_ID}';`
                                sqlDeleteBank = `delete from Bank_Deposit where Amount_replace ='${dataP[i].Amount_replace}'`
                                sqlDeleteSystem = `delete from System_Deposit where Amount_replace ='${dataP[i].Amount_replace}'`
    
                                con.query(sqlUpdate,function(err,result){
                                    if(err) throw err;
                                    console.log("Update Success");
                                });
    
                                con.query(sqlInsert,function(err,result){
                                    if(err) throw err;
                                    console.log("insert Success");
                                    
                                })

                                con.query(sqlDeleteBank,function(err,result){
                                    if(err) throw err;
                                    console.log("Delete Bank Success");
                                })
    
                                con.query(sqlDeleteSystem,function(err,result){
                                    if(err) throw err;
                                    console.log("Delete System Success");
                                })
                            }
                    });
                },10000);


                const qrcode = require('qrcode')
                const generatePayload = require('promptpay-qr')
                const mobileNumber = '092-978-4328'
                const options = { type: 'svg', color: { red: '#FF0000'} }  
                const amount = 20;
                const payload = generatePayload(mobileNumber,{amount})
                qrcode.toDataURL(payload, function (err, code) {
                if(err) return console.log("error occurred")
                console.log(code)
                })





app.listen(port,()=> console.log(`Example port ${port}` ))






