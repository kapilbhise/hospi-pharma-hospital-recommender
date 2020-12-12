var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressValidator = require('express-validator');
var flash = require('express-flash');
var session1 = require('express-session');
var bodyParser = require('body-parser');
// var request = require('request'),
var geojson = require('geojson');
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
 
let latitude,longitude, addr=" ", UserData, HospitalData;
const forwardGeocoding = function (address) { 
  
    var url = "https://api.mapbox.com/geocoding/v5/mapbox.places/"+encodeURIComponent(address)+".json?access_token=pk.eyJ1Ijoia2FwaWxiaGlzZSIsImEiOiJja2c3anZpeTkwNGM3MnhvM3oxZ2RmMjQ0In0.9T4RHnjI16enI8S3MqNjXQ&limit=1"; 
  
    request({ url: url, json: true }, function (error, response) { 
        if (error) { 
            callback('Unable to connect to Geocode API', undefined); 
        } else if (response.body.features.length == 0) { 
            callback('Unable to find location. Try to '
                     + 'search another location.'); 
        } else { 
  
            var longitude = response.body.features[0].center[0] 
            var latitude = response.body.features[0].center[1] 
            var location = response.body.features[0].place_name 
  
            console.log("Latitude :", latitude); 
            console.log("Longitude :", longitude); 
            console.log("Location :", location); 
            return latitude, longitude;
        } 
    }) 
} 


app.get("/datacapture",function(req,res){

    // const address=reverseGeocoding(19.75, 75.71);
    // console.log(address);
    res.sendFile(__dirname+"/form.html");
});

app.post("/datacapture",function(req,res){
  var url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    req.body.mylongitude +
    ", " +
    req.body.mylatitude +
    ".json?access_token=" +
    "pk.eyJ1Ijoia2FwaWxiaGlzZSIsImEiOiJja2c3anZpeTkwNGM3MnhvM3oxZ2RmMjQ0In0.9T4RHnjI16enI8S3MqNjXQ";

  request({ url: url, json: true }, function (error, response) {
    if (error) {
      console.log("Unable to connect to Geocode API");
    } else if (response.body.features.length == 0) {
      console.log(
        "Unable to find location. Try to" + " search another location."
      );
    } else {
      addr = String(response.body.features[0].place_name);
      console.log(response.body.features[0].place_name);
      //console.log("hi "+addr);
      
      return addr;
    }
  });

  //const Address=reverseGeocoding(req.body.mylatitude, req.body.mylongitude);
  //console.log("Hello",Address);
  setTimeout(function () {
    UserData = {
      name: req.body.inputName,
      surname: req.body.inputSurname,
      latitude: req.body.mylatitude,
      longitude: req.body.mylongitude,
      address: addr,
    };
    console.log(UserData);
    // var param={
    //   "nameParam":UserData.name, 
    //   "surnameParam":UserData.surname, 
    //   "latitudeParam":UserData.latitude, 
    //   "longitudeParam":UserData.longitude, 
    //   "addressParam":UserData.address
    // };
    // var q='CREATE (n:Person {
    //       Name:{nameParam}, 
    //       Surname:{surnameParam},
    //       Lat:{latitudeParam},
    //       Lon:{longitudeParam},
    //       Address:{addressParam} }) RETURN (n)';
    let params = {
      nameParam: UserData.name,
      surnameParam: UserData.surname,
      latitudeParam: UserData.latitude,
      longitudeParam: UserData.longitude,
      addressParam: UserData.address,
    };

    let query =
      "Create (u:user { username:$nameParam, latitude:$latitudeParam, longitude:$longitudeParam, address:$addressParam })  RETURN (u) ";

    session
      .run(query,params)
      .then(function (result) {
        // result.records.forEach(function (record) {
        //   console.log(record);
        // });
        //console.log(result);
      })
      .catch(function (error) {
        console.log(error);
      });
  }, 3000);
  
  res.send(UserData);
  res.redirect('dashboard');
  
});

// app.get('/maphome', function(req, res) {
//     res.sendFile(path.join(__dirname + '/form.html'));
// });

// app.post('/map1',async function(req,res){
//     var latitude = req.body.mylatitude;
//     var longitude = req.body.mylongitude;
//     // console.log(latitude);
//     // console.log(longitude);
//     const result = await session
//         .run("WITH point({latitude: $lat, longitude: $long}) AS userloc MATCH (a:Hospital) WHERE exists(a.latitude) AND exists(a.longitude) WITH a, distance(point(a), userloc) AS distance WHERE distance < 5000 RETURN a.Hospital_Name, distance ORDER BY distance",{lat:latitude,long:longitude}).catch(function(err){if(err){console.log(err);}});
//     var queryres = JSON.parse(result);
//     var querygeojson = geojson.parse([queryres],{point:['latitude','longitude']});
//     console.log(querygeojson);
//     res.json(querygeojson);
// })


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
                res.redirect('/dashboard');
            })
            .catch(function(err){
                if(err){
                    console.log(err);
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
            // var name5 = req.session.name;
            // var hospital=req.body.hospital; x
            // var telephone=req.body.telephone; x
            // var care=req.body.care; x
            // var district=req.body.district; x
            // var pincode=req.body.pincode; x
            // var address=req.body.address; x
            // var lattitude=req.body.lattitude;
            // var longitude = req.body.longitude;
            // session
            //     .run("CREATE (h:Hospital{Hospital_Name:$param1,Telephone:$param2,Hospital_Care_Type:$param3,District:$param4,Pincode:$param5,Location:$param6,lattitude:$param7,longitude:$param8})",{param1:hospital,param2:telephone,param3:care,param4:district,param5:pincode,param6:address,param7:lattitude,param8:longitude});
            // res.redirect("/dashboard");
            HospitalData = {
                hospitalName: req.body.hospital,
                hospitalCareType: req.body.care,
                // email: req.body.inputEmail,
                locality: req.body.inputLocality,
                telephone: req.body.telephone,
                pincode: req.body.pincode,
                address: req.body.address,
                district: req.body.district,
              };
              console.log(HospitalData);
              var params = {
                hospitalNameParam: HospitalData.hospitalName,
                hospitalCareTypeParam: HospitalData.hospitalCareType,
                // emailParam: HospitalData.email,
                // localityParam: HospitalData.locality,
                telephoneParam: HospitalData.telephone,
                pincodeParam: HospitalData.pincode,
                addressParam: HospitalData.address,
                districtParam: HospitalData.district,
              };
              let query =
                "Create (n:Hospital { Hospital_Name:{hospitalNameParam}, Hospital_Care_Type:{hospitalCareTypeParam},Telephone:{telephoneParam}, Pincode:{pincodeParam}, Location:{addressParam}, District:{districtParam}})  RETURN (n) ";
            
              session
                .run(query, params)
                .then(function (result) {
                  // result.records.forEach(function (record) {
                  //   console.log(record);
                  // });
                  //console.log(result);
                })
                .catch(function (error) {
                  console.log(error);
                });
            
              res.send(HospitalData);
              res.redirect('dashboard');
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
