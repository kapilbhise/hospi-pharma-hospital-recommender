var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressValidator = require('express-validator');
var flash = require('express-flash');
var session1 = require('express-session');
var bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

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
 
// app.use('/auth', authRouter);


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
            }
        })
    }
    }
});


app.post('/add',function(req,res){
    if(req.session.loggedin){
        var hospital = req.body.hospital;
        var name = req.session.name;
        session
            .run("MATCH (h:Hospital{Hospital_Name: $hosp}),(u:user{username:$use}) MERGE (h)<-[:visited_by]-(u);",{hosp:hospital,use:name})
            .catch(function(err){
                if(err){
                    console.log(err);
                }
            });
        res.redirect('/dashboard');
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
                })
                .catch(function(err){
                    if(err){
                        console.log(err);
                    }
                });
            console.log(result);
                // console.log(result.records[0].get(Hospital_Name));
            // console.log(hospitals);
            // console.log(hospitals.hospital[0].get(Hospital_Name));
            // console.log(hospitals[0].get(Hospital_Name));
            res.render('history', {
                name: name1,
                hospitals: hospitals,
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
                req.flash('success', 'Changes saved!');
                res.redirect('profile');
            })
            .catch(function(err){
                if(err){
                    console.log(err);
                }
            });
    })

    app.get('/addHospital',function(req,res){
        res.sendFile(path.join(__dirname, './addHospital.html'));
    })

    app.post('/addHospital',function(req,res){
        if(req.session.loggedin){
            var name5 = req.session.name;
            var hospital=req.body.hospital;
            var telephone=req.body.telephone;
            var care=req.body.care;
            var district=req.body.district;
            var pincode=req.body.pincode;
            var address=req.body.address;
            var lattitude=req.body.lattitude;
            var longitude = req.body.longitude;
            session
                .run("CREATE (h:Hospital{Hospital_Name:$param1,Telephone:$param2,Hospital_Care_Type:$param3,District:$param4,Pincode:$param5,Location:$param6,lattitude:$param7,longitude:$param8})",{param1:hospital,param2:telephone,param3:care,param4:district,param5:pincode,param6:address,param7:lattitude,param8:longitude});
        }
    })

    app.get('/map',function(req,res){
        res.sendFile(path.join(__dirname, './mymap.html'));
    })

    app.get('/recommendation', function(req,res){
        if(req.session.loggedin){
            var nameuser = req.session.name;
            var disease = '';
            var locality = '';
            result1 = session
                .run("MATCH (u:user{username:$userparam} RETURN u MATCH (h:Hospital) WHERE toLower(h.Facilities) CONTAINS toLower($userParam) RETURN h)",{userParam:nameuser});
                // .then(function(result){
                //     disease = result.records[0].get('disease');
                //     locality = result.records[0].get('locality');
                // }
                // ) 
                // .catch(function(err){
                //     if(err){
                //         console.log(err);
                //     }

                // });
                disease = result1.records[0].get('disease');
                locality = result1.records[0].get('locality');
            var nameArr1 = [];
            var nameArr2 = [];
            var result2 = session
                .run("MATCH (h:Hospital) WHERE toLower(h.Facilities) CONTAINS toLower($userParam) RETURN h",{userParam:disease});
                // .then(function(result){
                //     for(let i=0;i<result.records.length;i++){
                //         nameArr1.push({
                //             name: result.records[i]._fields[0].properties.Hospital_Name
                //         });
                //     }
                // })
                // .catch(function(err){
                //     if(err){
                //         console.log(err);
                //     }
                // });
                for(let i=0;i<result2.records.length;i++){
                    nameArr1.push({
                        name: result2.records[i]._fields[0].properties.Hospital_Name
                    });
                }  
            var result3 = session
                .run("MATCH (h:Hospital)-[]-(l:Locality) WHERE toLower(l.Locality) CONTAINS toLower($userParam1)  RETURN h;",{userParam1:locality});
                // .then(function(result){
                //     for(let i=0;i<result.records.length;i++){
                //         nameArr2.push({
                //             name: result.records[i]._fields[0].properties.Hospital_Name
                //         });
                //     }
                // })
                // .catch(function(err){
                //     if(err){
                //         console.log(err);
                //     }
                // });
                for(let i=0;i<result3.records.length;i++){
                    nameArr2.push({
                        name: result3.records[i]._fields[0].properties.Hospital_Name
                    });
                }
            res.render('recommendation',{
                nameArr1 : nameArr1,
                nameArr2: nameArr2,
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
