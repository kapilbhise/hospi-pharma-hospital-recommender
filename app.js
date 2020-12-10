var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var expressValidator = require("express-validator");
var flash = require("express-flash");
var session1 = require("express-session");
var bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
//const map=require("map.js");

var neo4j = require("neo4j-driver");
var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "graph")
);
var session = driver.session();

// var authRouter = require('./routes/auth');

var app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
  session1({
    secret: "123456cat",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

app.use(flash());
//app.use(expressValidator());

// app.use('/auth', authRouter);

app.get("/", function (req, res) {
  res.render("home");
});

app.post("/search", function (req, res) {
  var searchval = req.body.search_item;

  session
    .run(
      "MATCH (h:Hospital) WHERE toLower(h.Hospital_Name) CONTAINS toLower($userParam) RETURN h",
      { userParam: searchval }
    )
    .then(function (result) {
      var nameArr = [];
      for (let i = 0; i < result.records.length; i++) {
        nameArr.push({
          name: result.records[i]._fields[0].properties.Hospital_Name,
        });
      }
      res.render("search", {
        names: nameArr,
      });
    })
    .catch(function (err) {
      if (err) {
        console.log(err);
      }
    });
});

app.get("/signup", function (req, res) {
  res.render("signup", {
    username: "",
    email: "",
    password: "",
  });
});

app.post("/signup", function (req, res) {
  req.assert("username", "Username is required").notEmpty(); //Validate name
  req.assert("password", "Password is required").notEmpty(); //Validate password
  req.assert("email", "A valid email is required").isEmail(); //Validate email
  var errors = req.validationErrors();
  if (!errors) {
    var user = {
      name: req.sanitize("username").escape().trim(),
      email: req.sanitize("email").escape().trim(),
      password: req.sanitize("password").escape().trim(),
    };
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(user.password, salt);
    session
      .run(
        "CREATE (u:user{username: $userParam2, email: $emailParam2, password: $passParam2})",
        { userParam2: user.name, emailParam2: user.email, passParam2: hash }
      )
      .then(function (results) {
        req.flash("success", "You have successfully signed up!");
        res.redirect("/login");
      })
      .catch(function (err) {
        if (err) {
          console.log(err);
          req.flash("error", err);
          res.render("signup", {
            username: "",
            password: "",
            email: "",
          });
        }
      });
  } else {
    var error_msg = "";
    errors.forEach(function (error) {
      error_msg += error.msg + "<br>";
    });
    req.flash("error", error_msg);
    res.render("signup", {
      username: req.body.username,
      password: "",
      email: req.body.email,
    });
  }
});

app.get("/login", function (req, res) {
  res.render("login", {
    username: "",
    password: "",
  });
});

app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  session
    .run("MATCH (u:user{username: $userParam1}) RETURN count(u),u", {
      userParam1: username,
    })
    .then(function (result) {
      if (result.records[0]._fields[0] == 0) {
        req.flash("error", "Please correct enter email and Password!");
        res.redirect("/login");
      } else {
        if (
          bcrypt.compareSync(
            password,
            result.records[0]._fields[1].properties.password
          )
        ) {
          req.session.loggedin = true;
          req.session.name = username;
          res.redirect("/home");
        } else {
          req.flash("error", "Please correct enter email and Password!");
          res.redirect("/login");
        }
      }
    })
    .catch(function (err) {
      if (err) {
        console.log(err);
      }
    });
});

app.get("/home", function (req, res) {
  if (req.session.loggedin) {
    res.render("home1", {
      title: "Dashboard",
      name: req.session.name,
    });
  } else {
    req.flash("success", "Please login first!");
    res.redirect("/login");
  }
});

// app.get('/history',function(req,res){
//     if(req.session.loggedin){
//         res.render('history', {
//             name: username,
//         })
//     }
// })

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/login");
});

// app.get("/map",function(req,res){
//     res.sendFile(__dirname+"/mymap.html");
// });

app.listen(3000);
console.log("Server started on port 3000");

module.exports = app;
