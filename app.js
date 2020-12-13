var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressValidator = require('express-validator');
var flash = require('express-flash');
var session1 = require('express-session');
var bodyParser = require('body-parser');
var request = require('request');
var geojson = require('geojson');
const bcrypt = require('bcryptjs');
var https = require('https');
var navigator = require('navigator');
var mapboxgl = require('mapbox-gl');

var neo4j = require('neo4j-driver');
var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'graph'));
var session = driver.session();

// var authRouter = require('./routes/auth');

var app =express();

app.set('views',path.join(__dirname,'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

app.use(session1({ 
    secret: '123456cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}))
 
app.use(flash());
app.use(expressValidator());

app.get('/', function(req,res){
    if(req.session.loggedin){
        res.render("home1");
    }
    else{
        res.render("home");
    }
})

app.post('/search',function(req,res){
    if(req.session.loggedin){
        var searchval = req.body.search_item;
    var option = req.body.radio;
    if(option =="name"){
        session
        .run("MATCH (h:Hospital) WHERE toLower(h.Hospital_Name) CONTAINS toLower($userParam) RETURN h",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name
                });
            };
            res.render("search1", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    else if(option=="disease"){
        session
        .run("MATCH (h:Hospital) WHERE toLower(h.Facilities) CONTAINS toLower($userParam) RETURN h",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name
                });
            };
            res.render("search", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    else{
        session
        .run("MATCH (h:Hospital)-[]-(l:Locality) WHERE toLower(l.Locality) CONTAINS toLower($userParam)  RETURN h;",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name,
                });
            };
            res.render("search", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    }
    else{
        var searchval = req.body.search_item;
    var option = req.body.radio;
    if(option =="name"){
        session
        .run("MATCH (h:Hospital) WHERE toLower(h.Hospital_Name) CONTAINS toLower($userParam) RETURN h",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name
                });
            };
            res.render("search", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    else if(option=="disease"){
        session
        .run("MATCH (h:Hospital) WHERE toLower(h.Facilities) CONTAINS toLower($userParam) RETURN h",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name
                });
            };
            res.render("search", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    else{
        session
        .run("MATCH (h:Hospital)-[]-(l:Locality) WHERE toLower(l.Locality) CONTAINS toLower($userParam)  RETURN h;",{userParam:searchval})
        .then(function(result){
            var nameArr = [];
            for(let i=0;i<result.records.length;i++){
                nameArr.push({
                    name: result.records[i]._fields[0].properties.Hospital_Name,
                });
            };
            res.render("search", {
                names: nameArr
            });
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect('/');
            }
        })
    }
    }
});

app.get('/datacapture',function(req,res){
    res.render("form",{
        name: req.session.name,
    });
})

app.post("/datacapture",function(req,res){
  setTimeout(function () {
    UserData = {
      name: req.body.username,
      latitude: req.body.mylatitude,
      longitude: req.body.mylongitude,
      address: req.body.address,
    };
      session
        .run("MATCH (u:user{username:$userParam}) SET u.latitude=toFloat($latitudeParam),u.longitude=toFloat($longitudeParam),u.address=$addressParam",{userParam:UserData.name,latitudeParam: UserData.latitude,longitudeParam: UserData.longitude,addressParam: UserData.address})
        .then(function (result) {
          req.flash('success',"Data has been captured!");
          res.redirect("/dashboard");
        })
        .catch(function (err) {
            if(err){
                console.log(err);
                req.flash('error',"Some error occured!");
                res.redirect("/dashboard");
            }
        });
    }, 3000);
})

app.post('/add',function(req,res){
    if(req.session.loggedin){
        var hospital = req.body.hospital;
        var name = req.session.name;
        session
            .run("MATCH (h:Hospital{Hospital_Name: $hosp}),(u:user{username:$use}) MERGE (h)<-[:visited_by]-(u);",{hosp:hospital,use:name})
            .then(function(result){
                res.redirect('/dashboard');
            })
            .catch(function(err){
                if(err){
                    console.log(err);
                    req.flash('error',"Some error occured!");
                    res.redirect('/dashboard');
                }
            });
    }
})


app.get('/signup', function(req, res){    
    res.render('signup', {
    username: '',
    email:'',
    password: ''    
    })
})

app.post('/signup', function(req, res){    
    req.assert('username', 'Username is required').notEmpty()           //Validate name
    req.assert('password', 'Password is required').notEmpty()   //Validate password
    req.assert('email', 'A valid email is required').isEmail()  //Validate email
    var errors = req.validationErrors();
    if( !errors ) {
        var user = {
            name: req.sanitize('username').escape().trim(),
            email: req.sanitize('email').escape().trim(),
            password: req.sanitize('password').escape().trim()
            }
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(user.password, salt);
        session
            .run("CREATE (u:user{username: $userParam2, email: $emailParam2, password: $passParam2})",{userParam2: user.name, emailParam2: user.email, passParam2: hash})
            .then(function(result){
                req.flash('success', 'You have successfully signed up!');
                res.redirect('/login');
            })
            .catch(function(err){
                if(err){
                    console.log(err);
                    req.flash('error',err);
                    res.render('signup',{
                        username: '',
                        password: '',
                        email: ''
                    });
                }
            })
    }
    else{
        var error_msg = '';
        errors.forEach(function(error) {
            error_msg += error.msg + '<br>'
        })                
        req.flash('error', error_msg);
        res.render('signup',{
            username: req.body.username,
            password: '',
            email: req.body.email
        });
    }
})

app.get('/login', function(req, res){    
    res.render('login', {
    username: '',
    password: ''    
    })
})

app.post('/login', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    
    session
        .run("MATCH (u:user{username: $userParam1}) RETURN count(u),u",{userParam1: username})
        .then(function(result){
            if(result.records[0]._fields[0]==0){
                req.flash('error', 'Please correct enter email and Password!');
                res.redirect('/login');
            }
            else{
                if(bcrypt.compareSync(password, result.records[0]._fields[1].properties.password)){
                    req.session.loggedin = true;
                    req.session.name = username;
                    res.redirect('/dashboard');
                }
                else{
                    req.flash('error', 'Please correct enter email and Password!');
                    res.redirect('/login');
                }
            }
        })
        .catch(function(err){
            if(err){
                console.log(err);
                req.flash('error',"Some error occured! Try again.");
                res.redirect('/login');
            }
        })
    })

    app.get('/home', function(req, res) {
        if (req.session.loggedin) {
            res.render('home1', {
                title:"Dashboard",
                name: req.session.name,     
            });
        }
        else {
            req.flash('success', 'Please login first!');
            res.redirect('/login');
        }
    })

    app.get('/dashboard',function(req,res){
        if(req.session.loggedin){
            res.render('dashboard', {
                name:req.session.name,
            });
        }
    })

    app.get('/history',function(req,res){
        if(req.session.loggedin){
            var name1 = req.session.name;
            session
                .run("MATCH (h:Hospital)<-[:visited_to]-(u:user{username: $nameParam}) RETURN h",{nameParam: name1})
                .then(function(result){
                    var hospitals = [];
                    for(let i=0;i<result.records.length;i++){
                        hospitals.push({
                            hospital: result.records[i]
                        });
                    };
                    console.log(result);
                // console.log(result.records[0].get(Hospital_Name));
            // console.log(hospitals);
            // console.log(hospitals.hospital[0].get(Hospital_Name));
            // console.log(hospitals[0].get(Hospital_Name));
            res.render('history', {
                name: name1,
                hospitals: hospitals,
            });
                })
                .catch(function(err){
                    if(err){
                        console.log(err);
                        res.redirect("/history");
                    }
                });
        }
    })

    app.get('/profile', function(req,res){
        if(req.session.loggedin){
            res.render('profile',{
                name: req.session.name,
            });
        }
    })

    app.post('/profile', function(req,res){
        var username= req.body.username;
        var email =req.body.email;
        var disease = req.body.disease;
        var locality = req.body.locality;
        session
            .run("MATCH (u:user{username:$userx}) SET u.email=$emailx,u.locality=$localityx,u.disease=$diseasex",{userx:username,emailx:email,localityx:locality,diseasex:disease})
            .then(function(result){
                res.redirect('/dashboard');
            })
            .catch(function(err){
                if(err){
                    console.log(err);
                    req.flash("error","Some error occured");
                    res.redirect('/dashboard');
                }
            });
    })

    // app.get('/datacapture',function(req,res){
    //     res.sendFile(path.join(__dirname, './form.html'));
    // })

    app.get('/addHospital',function(req,res){
        res.sendFile(path.join(__dirname, './addHospital.html'));
    })

    app.post('/addHospital',function(req,res){
        if(req.session.loggedin){
            HospitalData = {
                hospitalName: req.body.hospital,
                hospitalCareType: req.body.care,
                locality: req.body.inputLocality,
                telephone: req.body.telephone,
                pincode: req.body.pincode,
                address: req.body.address,
                district: req.body.district,
                latitude: req.body.latitude,
                longitude: req.body.longitude,
              };
              console.log(HospitalData);
              session
                .run("Create (h:Hospital { Hospital_Name:$hospitalNameParam, Hospital_Care_Type:$hospitalCareTypeParam,Telephone:toInteger($telephoneParam), Pincode:toInteger($pincodeParam), Location:$addressParam, District:$districtParam, lattitude:toFloat($latitudeParam), longitude:toFloat($longitudeParam)})",{hospitalNameParam: HospitalData.hospitalName,hospitalCareTypeParam: HospitalData.hospitalCareType,localityParam: HospitalData.locality,telephoneParam: HospitalData.telephone,pincodeParam: HospitalData.pincode,addressParam: HospitalData.address,districtParam: HospitalData.district,latitudeParam: HospitalData.latitude,longitudeParam: HospitalData.longitude})
                .then(function (result) {
                  // result.records.forEach(function (record) {
                  //   console.log(record);
                  // });
                  //console.log(result);
                  req.flash("success","Hospital has been added successfully!");
                  res.redirect('dashboard');
                })
                .catch(function (error) {
                  console.log(error);
                  req.flash("error","Some error occured!");
                  res.redirect("dashboard");
                });
        }
    })

    app.get('/map',function(req,res){
        res.sendFile(path.join(__dirname, './mymap.html'));
    })

    app.get('/recommendation', async function(req,res){
        if(req.session.loggedin){
            var nameuser = req.session.name;
            result1 = await session
                .run("MATCH (u:user{username:$userParam}),(h:Hospital)-[]-(l:Locality{Locality:u.locality}) RETURN h",{userParam:nameuser}).catch(function(err){if(err){console.log(err);}});
            var nameArr1 = [];
                for(let i=0;i<result1.records.length;i++){
                    nameArr1.push({
                        name: result1.records[i]._fields[0].properties.Hospital_Name
                    });
                }  
            res.render('recommendation',{
                nameArr1 : nameArr1,
            });
        }
    })


    app.get('/logout', function (req, res) {
        req.session.destroy();
        res.redirect('/login');
    })



app.listen(3000);
console.log("Server started on port 3000");

module.exports = app;
