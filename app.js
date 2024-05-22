require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const UploadFolder = './public/files/';
const moment = require('moment');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const flash = require('connect-flash');
const fs = require('fs');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false, }));
app.use(express.static("public"));
app.use(fileUpload());
app.use(flash());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    phone: String
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('user', userSchema);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
mongoose.connect(process.env.DB);

app.get('/Register', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    }
    else {
        res.render('Register', { message: req.flash('info'), login: req.isAuthenticated() });
    }

});

app.post('/Register', (req, res) => {
    if (req.body.password !== req.body.confirmPassword) {
        req.flash('info', 'Password and Confirm password do not match.');
        res.redirect('/Register');
    }
    else {
        User.findOne({ username: req.body.username }).then((d) => {
            if (d === null) {
                User.register(new User({ username: req.body.username }), req.body.password, (err) => {
                    if (err) {
                        console.log('error while user registering!', err);
                        req.flash('info', 'There was an error while registering.');
                        res.redirect('/Register');
                    }
                    else {
                        res.redirect('/');
                    }
                });
            }
            else {
                req.flash('info', 'This email address is already taken.');
                res.redirect('/Register');
            }
        })
    }
});

app.get('/Login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    }
    else {
        res.render('Login', { message: req.flash('info'), login: req.isAuthenticated() });
    }
});

app.post('/Login', passport.authenticate('local', { failureRedirect: '/Login', failureFlash: { type: 'info', message: 'Email or Password Is Incorrect.' }, }), (req, res) => {
    res.redirect('/');
});

app.post('/Logout', (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) { return next(err); }
            res.redirect('/');
        });
    }
    else {
        res.redirect('/');
    }
});

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        const fileList = [];
        fs.readdirSync(UploadFolder).forEach(file => {
            fileList.push(file);
        });
        const options = { fileList: fileList, message: req.flash('info') };
        res.render('Index', options);

    }
    else {
        res.redirect('/Login');
    }
});

app.post('/Upload', function (req, res) {
    if (req.isAuthenticated()) {
        if (!req.files || Object.keys(req.files).length === 0) {
            req.flash('info', 'No files were uploaded.');
            res.redirect('/SRV/');
        }
        else {
            if (req.files.fileToUpload.size >= 1000001) {
                req.flash('info', 'File size exceeds limit of 1MB.');
                res.redirect('/');
            }
            else {
                let uploadedFile = req.files.fileToUpload;
                let date = moment(Date.now()).format('MM-DD-YYYY');
                let uniqueNumber = Math.ceil(Math.random() * 1E9) + 1;
                const numLen = Math.ceil(Math.log10(uniqueNumber + 1));
                if (numLen != 9) {
                    uniqueNumber = Math.ceil(Math.random() * 1E9) + 1;
                }
                const uniqueSuffix = `${date}-${uniqueNumber}`;
                uploadedFile.mv('./public/files/' + uploadedFile.name + '-' + uniqueSuffix.toString(), function (err) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    else {
                        //req.flash('info', 'File uploaded.');
                        res.redirect('/');
                    }
                });
            }
        }
    }
    else {
        res.redirect('/Login');
    }
});

app.post('/Action', (req, res) => {
    if (req.isAuthenticated()) {
        if (req.body.action === 'download') {
            const fileName = req.body.file;
            res.download(`./public/files/${req.body.file}`, fileName.slice(-fileName.length, -21));
        }
        else {
            const deleteFile = `./public/files/${req.body.file}`;
            if (fs.existsSync(deleteFile)) {
                fs.unlink(deleteFile, (err) => {
                    if (err) {
                        console.log(err);
                    }
                    //req.flash('info', 'File deleted.');
                    res.redirect('/');
                })
            }
        }
    }
    else {
        res.redirect('/Login');
    }
});

app.use(function (req, res, next) {
    res.status(404);
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
